/**
 * api.js — all National Bank of Georgia (NBG) API communication.
 *
 * Endpoints (one day's snapshot per call — the API has no date-range mode):
 *   today:      https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/{lang}/json
 *   historical: https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/{lang}/json/?date=YYYY-MM-DD
 *
 * CORS NOTE: at the time of writing NBG serves `Access-Control-Allow-Origin: *`,
 * so the browser can call it directly and no proxy is needed. If a CORS error ever
 * appears in the console, route the requests through a tiny proxy of your own
 * (e.g. a Cloudflare Worker / Netlify function that forwards the request and
 * re-emits the CORS headers) and point PROXY_PREFIX below at it.
 *
 * Response shape (per day):
 *   [{ date, currencies: [{ code, quantity, rate, diff, name, date, validFromDate }] }]
 * `rate` is the price of `quantity` units in GEL (e.g. AMD comes per 1000 units),
 * so a comparable per-unit rate is always rate / quantity.
 * `diff` is the signed absolute change against the previous publication;
 * `diffFormated` is its unsigned string form and must not be used for direction.
 *
 * Exposes a single global: window.Api
 */
(function (global) {
  'use strict';

  var BASE = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies';
  var PROXY_PREFIX = ''; // e.g. 'https://my-proxy.example.workers.dev/?url=' — see CORS note above
  var TIMEOUT_MS = 12000;

  var LATEST_TTL_MS = 15 * 60 * 1000;    // consider today's snapshot fresh for 15 minutes
  var LATEST_KEY = 'lk:latest:';          // + lang
  var HIST_KEY = 'lk:hist:';              // + YYYY-MM-DD
  var HIST_INDEX_KEY = 'lk:hist:index';   // list of cached history keys, for pruning
  var HIST_MAX_ENTRIES = 400;

  /* ----------------------------------------------------------------------
     localStorage helpers — every access is guarded: private mode, disabled
     storage and quota errors must never break the page.
     ---------------------------------------------------------------------- */

  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Most likely QuotaExceededError — drop the oldest history entries and retry once.
      if (pruneHistory()) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e2) { /* give up */ }
      }
      return false;
    }
  }

  function historyIndex() {
    var idx = readStore(HIST_INDEX_KEY);
    return Array.isArray(idx) ? idx : [];
  }

  function rememberHistoryKey(key) {
    var idx = historyIndex();
    if (idx.indexOf(key) !== -1) return;
    idx.push(key);
    if (idx.length > HIST_MAX_ENTRIES) {
      var overflow = idx.splice(0, idx.length - HIST_MAX_ENTRIES);
      for (var i = 0; i < overflow.length; i++) {
        try { localStorage.removeItem(overflow[i]); } catch (e) { /* ignore */ }
      }
    }
    try { localStorage.setItem(HIST_INDEX_KEY, JSON.stringify(idx)); } catch (e) { /* ignore */ }
  }

  /** Drop the oldest half of the cached history to free space. Returns true if anything went. */
  function pruneHistory() {
    var idx = historyIndex();
    if (!idx.length) return false;
    var drop = idx.splice(0, Math.max(1, Math.floor(idx.length / 2)));
    for (var i = 0; i < drop.length; i++) {
      try { localStorage.removeItem(drop[i]); } catch (e) { /* ignore */ }
    }
    try { localStorage.setItem(HIST_INDEX_KEY, JSON.stringify(idx)); } catch (e) { /* ignore */ }
    return true;
  }

  /* ----------------------------------------------------------------------
     Fetching
     ---------------------------------------------------------------------- */

  function buildUrl(lang, date) {
    var url = BASE + '/' + (lang === 'en' ? 'en' : 'ka') + '/json/';
    if (date) url += '?date=' + encodeURIComponent(date);
    return PROXY_PREFIX ? PROXY_PREFIX + encodeURIComponent(url) : url;
  }

  /** fetch() with an abort-based timeout so a hanging request can never stall the UI. */
  async function fetchJson(url) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    try {
      var response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller ? controller.signal : undefined,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('NBG API responded with HTTP ' + response.status);
      }

      var data = await response.json();
      if (!Array.isArray(data) || !data.length || !Array.isArray(data[0].currencies)) {
        throw new Error('Unexpected NBG API payload shape');
      }
      return data[0];
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Turn one raw NBG day into the shape the rest of the app consumes. */
  function normalizeDay(day) {
    var list = [];

    for (var i = 0; i < day.currencies.length; i++) {
      var c = day.currencies[i];
      var rate = Number(c.rate);
      var quantity = Number(c.quantity) || 1;
      if (!isFinite(rate) || rate <= 0) continue; // skip malformed entries instead of poisoning the UI

      var diff = Number(c.diff) || 0;
      var previous = rate - diff;
      var changePct = previous > 0 ? (diff / previous) * 100 : 0;

      list.push({
        code: String(c.code || '').toUpperCase(),
        name: c.name || c.code,
        quantity: quantity,
        rate: rate,                    // GEL for `quantity` units
        unitRate: rate / quantity,     // GEL for exactly 1 unit
        diff: diff,
        changePct: changePct
      });
    }

    if (!list.length) throw new Error('NBG API returned no usable currencies');

    return {
      date: String(day.date || '').slice(0, 10),
      currencies: list
    };
  }

  /* ----------------------------------------------------------------------
     Public API
     ---------------------------------------------------------------------- */

  /**
   * Today's official rates.
   * Served from localStorage while fresh; on a network failure the stale cache is
   * returned with `stale: true` so the page still shows something useful.
   *
   * @returns {Promise<{date, fetchedAt, currencies, fromCache, stale}>}
   */
  async function getLatest(lang, options) {
    options = options || {};
    var key = LATEST_KEY + (lang === 'en' ? 'en' : 'ka');
    var cached = readStore(key);
    var now = Date.now();

    if (!options.force && cached && cached.fetchedAt && (now - cached.fetchedAt) < LATEST_TTL_MS) {
      return { date: cached.date, fetchedAt: cached.fetchedAt, currencies: cached.currencies, fromCache: true, stale: false };
    }

    try {
      var day = normalizeDay(await fetchJson(buildUrl(lang)));
      var payload = { date: day.date, fetchedAt: now, currencies: day.currencies };
      writeStore(key, payload);
      // Today's snapshot doubles as a history point for the chart.
      cacheUnitRates(day.date, day.currencies);
      return { date: day.date, fetchedAt: now, currencies: day.currencies, fromCache: false, stale: false };
    } catch (error) {
      if (cached && cached.currencies) {
        return { date: cached.date, fetchedAt: cached.fetchedAt, currencies: cached.currencies, fromCache: true, stale: true, error: error };
      }
      throw error;
    }
  }

  /** Store a day's per-unit rates in the permanent history cache. */
  function cacheUnitRates(dateKey, currencies) {
    if (!dateKey) return;
    var rates = {};
    for (var i = 0; i < currencies.length; i++) {
      rates[currencies[i].code] = currencies[i].unitRate;
    }
    var key = HIST_KEY + dateKey;
    if (writeStore(key, { date: dateKey, rates: rates })) rememberHistoryKey(key);
  }

  /**
   * Per-unit rates for a single historical date.
   * NBG answers weekend/holiday requests with the previous business day, so the
   * returned `date` can differ from the requested one — callers must de-duplicate.
   *
   * @param {string} date YYYY-MM-DD
   * @returns {Promise<{date: string, rates: Object<string, number>}>}
   */
  async function getDayRates(date) {
    var key = HIST_KEY + date;
    var cached = readStore(key);
    if (cached && cached.rates) return cached;

    var day = normalizeDay(await fetchJson(buildUrl('en', date)));

    var rates = {};
    for (var i = 0; i < day.currencies.length; i++) {
      rates[day.currencies[i].code] = day.currencies[i].unitRate;
    }
    var payload = { date: day.date || date, rates: rates };

    // Cache under both the requested date (so the same request is never repeated)
    // and the effective date the bank actually returned.
    if (writeStore(key, payload)) rememberHistoryKey(key);
    if (payload.date !== date) {
      var effectiveKey = HIST_KEY + payload.date;
      if (writeStore(effectiveKey, payload)) rememberHistoryKey(effectiveKey);
    }
    return payload;
  }

  /**
   * Fetch many dates in bounded batches (never all at once) and return the
   * successfully resolved days, sorted by effective date and de-duplicated.
   *
   * @param {string[]} dates YYYY-MM-DD, ascending
   * @param {number} [batchSize]
   */
  async function getDaysRates(dates, batchSize) {
    var size = batchSize || 6;
    var byDate = {};

    for (var start = 0; start < dates.length; start += size) {
      var slice = dates.slice(start, start + size);
      var settled = await Promise.all(slice.map(function (date) {
        // A single missing day must not fail the whole range.
        return getDayRates(date).catch(function () { return null; });
      }));

      for (var i = 0; i < settled.length; i++) {
        if (settled[i] && settled[i].date) byDate[settled[i].date] = settled[i];
      }
    }

    return Object.keys(byDate).sort().map(function (date) { return byDate[date]; });
  }

  /**
   * Clear cached rate data only — user preferences (language, theme, alerts)
   * live under different keys and are deliberately left alone.
   */
  function clearCache() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (key.indexOf(LATEST_KEY) === 0 || key.indexOf(HIST_KEY) === 0)) keys.push(key);
      }
      for (var j = 0; j < keys.length; j++) localStorage.removeItem(keys[j]);
    } catch (e) { /* ignore */ }
  }

  global.Api = {
    getLatest: getLatest,
    getDayRates: getDayRates,
    getDaysRates: getDaysRates,
    clearCache: clearCache
  };
})(window);
