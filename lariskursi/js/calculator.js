/**
 * calculator.js — conversion math, currency-pair logic and number/flag formatting.
 *
 * NBG publishes every currency only against GEL, so any foreign→foreign conversion
 * is resolved through the lari as the pivot:
 *     amount × unitRate(from) ÷ unitRate(to)
 * where unitRate(X) is "how many GEL one unit of X costs" and unitRate(GEL) = 1.
 *
 * Exposes a single global: window.Calculator
 */
(function (global) {
  'use strict';

  var BASE_CODE = 'GEL';

  /* Currency codes whose first two letters are not the ISO country code, or
     which have no country at all. Everything else is derived automatically. */
  var FLAG_OVERRIDES = {
    EUR: '🇪🇺',
    XDR: '🌐', // IMF Special Drawing Rights
    XAU: '🥇',
    XAG: '🥈'
  };

  var state = {
    byCode: {},  // CODE -> currency object
    list: [],    // display order: GEL first, then the API list
    date: null,
    fetchedAt: null
  };

  /* ----------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */

  /**
   * Load a fresh snapshot.
   * GEL is injected manually — NBG never lists its own currency, but the
   * converter needs it as the base on both sides.
   */
  function setSnapshot(snapshot, gelName) {
    var gel = {
      code: BASE_CODE,
      name: gelName || 'ქართული ლარი',
      quantity: 1,
      rate: 1,
      unitRate: 1,
      diff: 0,
      changePct: 0,
      isBase: true
    };

    state.byCode = { GEL: gel };
    state.list = [gel];

    for (var i = 0; i < snapshot.currencies.length; i++) {
      var c = snapshot.currencies[i];
      if (c.code === BASE_CODE) continue;
      state.byCode[c.code] = c;
      state.list.push(c);
    }

    state.date = snapshot.date;
    state.fetchedAt = snapshot.fetchedAt;
  }

  function list() { return state.list; }
  function get(code) { return state.byCode[code] || null; }
  function has(code) { return Object.prototype.hasOwnProperty.call(state.byCode, code); }
  function snapshotDate() { return state.date; }
  function fetchedAt() { return state.fetchedAt; }

  /** GEL per one unit of `code`, or null when the currency is unknown. */
  function unitRate(code) {
    var currency = get(code);
    return currency ? currency.unitRate : null;
  }

  /* ----------------------------------------------------------------------
     Math
     ---------------------------------------------------------------------- */

  /** How many units of `to` one unit of `from` buys. Null if either is unknown. */
  function pairRate(from, to) {
    var a = unitRate(from);
    var b = unitRate(to);
    if (a === null || b === null || !(b > 0)) return null;
    return a / b;
  }

  /** Convert `amount` from one currency to another via GEL. Null if not computable. */
  function convert(amount, from, to) {
    var rate = pairRate(from, to);
    if (rate === null || !isFinite(amount)) return null;
    return amount * rate;
  }

  /* ----------------------------------------------------------------------
     Formatting
     ---------------------------------------------------------------------- */

  /** Locale-aware number formatting with a fixed number of decimals. */
  function formatNumber(value, locale, decimals) {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    var digits = decimals === undefined ? 2 : decimals;
    try {
      return new Intl.NumberFormat(locale || 'ka-GE', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(value);
    } catch (e) {
      return value.toFixed(digits);
    }
  }

  /**
   * Amounts vary hugely in magnitude (0.0003 IRR vs 4 500 000 IDR), so the
   * decimal count adapts instead of being fixed at two.
   */
  function formatAmount(value, locale) {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    var magnitude = Math.abs(value);
    var decimals = 2;
    if (magnitude !== 0) {
      if (magnitude < 0.01) decimals = 6;
      else if (magnitude < 1) decimals = 4;
      else if (magnitude >= 100000) decimals = 0;
    }
    return formatNumber(value, locale, decimals);
  }

  /** Official rates are published with four decimals — keep that precision. */
  function formatRate(value, locale) {
    return formatNumber(value, locale, 4);
  }

  function formatPercent(value, locale) {
    if (value === null || !isFinite(value)) return '—';
    var sign = value > 0 ? '+' : (value < 0 ? '−' : '');
    return sign + formatNumber(Math.abs(value), locale, 2) + '%';
  }

  /**
   * Emoji flag for a currency code: the first two letters of an ISO-4217 code are
   * normally the ISO-3166 country, which maps to two regional-indicator symbols.
   */
  function flag(code) {
    if (!code) return '🏳️';
    var upper = String(code).toUpperCase();
    if (FLAG_OVERRIDES[upper]) return FLAG_OVERRIDES[upper];
    if (!/^[A-Z]{3}$/.test(upper)) return '🏳️';

    var country = upper.slice(0, 2);
    return String.fromCodePoint(
      0x1F1E6 + (country.charCodeAt(0) - 65),
      0x1F1E6 + (country.charCodeAt(1) - 65)
    );
  }

  /** The two-letter country part of a currency code, used as the no-emoji fallback. */
  function countryCode(code) {
    var upper = String(code || '').toUpperCase();
    if (FLAG_OVERRIDES[upper] || !/^[A-Z]{3}$/.test(upper)) return '';
    return upper.slice(0, 2);
  }

  var flagSupport = null;

  /**
   * Windows ships no country-flag glyphs: a regional-indicator pair falls back to
   * two letter tiles there, which look broken next to a currency name.
   *
   * Detect it by drawing two flags with very different palettes (🇺🇸 red/blue vs
   * 🇧🇷 green/yellow) and comparing their average colour. Real flags differ
   * strongly; letter tiles ("US" vs "BR") are nearly identical because only the
   * letter shapes change. Width measurement is not reliable here — Windows renders
   * the pair narrower than two standalone indicators.
   */
  function supportsFlagEmoji() {
    if (flagSupport !== null) return flagSupport;

    try {
      var canvas = document.createElement('canvas');
      if (!canvas.getContext) { flagSupport = false; return flagSupport; }

      canvas.width = 32;
      canvas.height = 24;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { flagSupport = false; return flagSupport; }

      var average = function (text) {
        ctx.clearRect(0, 0, 32, 24);
        ctx.font = '20px sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(text, 0, 0);

        var pixels = ctx.getImageData(0, 0, 32, 24).data;
        var r = 0, g = 0, b = 0, count = 0;
        for (var i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 16) continue; // ignore transparent background
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
          count++;
        }
        return count ? [r / count, g / count, b / count] : null;
      };

      var us = average('🇺🇸'); // 🇺🇸
      var br = average('🇧🇷'); // 🇧🇷

      if (!us || !br) {
        flagSupport = false;
      } else {
        var distance = Math.abs(us[0] - br[0]) + Math.abs(us[1] - br[1]) + Math.abs(us[2] - br[2]);
        flagSupport = distance > 40;
      }
    } catch (e) {
      flagSupport = false;
    }
    return flagSupport;
  }

  /** Accessible flag description, e.g. "US Dollar (USD) flag". */
  function flagLabel(code, name) {
    return (name ? name + ' (' + code + ')' : code) + ' flag';
  }

  global.Calculator = {
    BASE_CODE: BASE_CODE,
    setSnapshot: setSnapshot,
    list: list,
    get: get,
    has: has,
    snapshotDate: snapshotDate,
    fetchedAt: fetchedAt,
    unitRate: unitRate,
    pairRate: pairRate,
    convert: convert,
    formatNumber: formatNumber,
    formatAmount: formatAmount,
    formatRate: formatRate,
    formatPercent: formatPercent,
    flag: flag,
    countryCode: countryCode,
    supportsFlagEmoji: supportsFlagEmoji,
    flagLabel: flagLabel
  };
})(window);
