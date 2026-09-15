/**
 * app.js — application entry point: initialization, event wiring and DOM updates.
 *
 * Everything that touches the page lives here; api.js / calculator.js / chart.js
 * stay free of DOM concerns.
 *
 * Storage keys used by this file:
 *   lk:theme   'dark' | 'light'
 *   lk:pair    last used converter pair
 *   lk:alerts  user-defined rate alerts
 */
(function (global) {
  'use strict';

  var THEME_KEY = 'lk:theme';
  var PAIR_KEY = 'lk:pair';
  var ALERTS_KEY = 'lk:alerts';
  var AUTO_REFRESH_MS = 10 * 60 * 1000; // re-check for new official rates every 10 minutes

  var dom = {};
  var alerts = [];
  var lastFetchedAt = null;
  var currentChartRange = '7d';
  var chartBootstrapped = false;
  var toastTimer = null;

  /* ======================================================================
     Small helpers
     ====================================================================== */

  function $(id) { return document.getElementById(id); }

  function t(key, vars) { return global.I18n.t(key, vars); }
  function locale() { return global.I18n.locale(); }

  /** Trailing-edge debounce, used for the amount input and the search box. */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    // Force a reflow so the transition runs even on back-to-back toasts.
    void dom.toast.offsetWidth;
    dom.toast.classList.add('is-visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('is-visible');
      setTimeout(function () { dom.toast.hidden = true; }, 260);
    }, 2200);
  }

  /* ======================================================================
     Theme
     ====================================================================== */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }

    var isDark = theme === 'dark';
    if (dom.themeIcon) dom.themeIcon.textContent = isDark ? '🌙' : '☀️';
    if (dom.themeToggle) {
      dom.themeToggle.setAttribute('aria-pressed', String(isDark));
      dom.themeToggle.setAttribute('aria-label', t(isDark ? 'themeToLight' : 'themeToDark'));
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0F172A' : '#FFFFFF');

    if (global.RateChart) global.RateChart.refreshTheme();
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }

    if (saved !== 'dark' && saved !== 'light') {
      // First visit: follow the OS preference.
      saved = global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(saved);

    if (global.matchMedia) {
      var query = global.matchMedia('(prefers-color-scheme: light)');
      var onChange = function (event) {
        // Only follow the OS while the user has not made an explicit choice.
        var stored = null;
        try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
        if (!stored) applyTheme(event.matches ? 'light' : 'dark');
      };
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  /* ======================================================================
     Currency dropdowns
     ====================================================================== */

  /**
   * Paint a flag holder: the emoji where the platform has flag glyphs, otherwise
   * a small two-letter country badge so it still reads as a flag slot.
   */
  function paintFlag(spanEl, code, name) {
    if (!spanEl) return;
    var useEmoji = global.Calculator.supportsFlagEmoji();
    var country = global.Calculator.countryCode(code);

    spanEl.textContent = useEmoji || !country ? global.Calculator.flag(code) : country;
    spanEl.classList.toggle('is-code', !useEmoji && !!country);
    spanEl.setAttribute('role', 'img');
    spanEl.setAttribute('aria-label', global.Calculator.flagLabel(code, name || ''));
  }

  /**
   * Native <option> text cannot be styled, so the flag is only prefixed where the
   * emoji actually renders; elsewhere the adjacent badge carries the country.
   */
  function optionLabel(currency) {
    var prefix = global.Calculator.supportsFlagEmoji() ? global.Calculator.flag(currency.code) + '  ' : '';
    return prefix + currency.code + ' — ' + currency.name;
  }

  /** Rebuild every currency <select>, preserving the current selection. */
  function populateSelects() {
    var currencies = global.Calculator.list();
    var selects = [dom.currencyFrom, dom.currencyTo, dom.chartCurrency, dom.alertCurrency];

    selects.forEach(function (select) {
      if (!select) return;
      var previous = select.value;
      var fragment = document.createDocumentFragment();

      currencies.forEach(function (currency) {
        // The lari is the pivot, not a chartable/alertable rate against itself.
        if (currency.isBase && (select === dom.chartCurrency || select === dom.alertCurrency)) return;

        var option = document.createElement('option');
        option.value = currency.code;
        option.textContent = optionLabel(currency);
        fragment.appendChild(option);
      });

      select.innerHTML = '';
      select.appendChild(fragment);
      if (previous && global.Calculator.has(previous)) select.value = previous;
    });
  }

  /** Pick sensible initial currencies: URL params > saved pair > USD→GEL. */
  function initialPair() {
    var params = new URLSearchParams(global.location.search);
    var saved = readJson(PAIR_KEY, {}) || {};

    var from = (params.get('from') || saved.from || 'USD').toUpperCase();
    var to = (params.get('to') || saved.to || 'GEL').toUpperCase();
    var amount = params.get('amount') || saved.amount;

    if (!global.Calculator.has(from)) from = global.Calculator.has('USD') ? 'USD' : 'GEL';
    if (!global.Calculator.has(to)) to = 'GEL';
    if (from === to) to = from === 'GEL' ? 'USD' : 'GEL';

    return { from: from, to: to, amount: amount };
  }

  function updateFlag(spanEl, code) {
    var currency = global.Calculator.get(code);
    paintFlag(spanEl, code, currency ? currency.name : '');
  }

  /* ======================================================================
     Converter
     ====================================================================== */

  function recalculate(options) {
    options = options || {};
    var from = dom.currencyFrom.value;
    var to = dom.currencyTo.value;
    var amount = parseFloat(dom.amountFrom.value);

    updateFlag(dom.flagFrom, from);
    updateFlag(dom.flagTo, to);

    if (!isFinite(amount) || amount < 0) {
      dom.amountTo.value = '—';
    } else {
      var result = global.Calculator.convert(amount, from, to);
      dom.amountTo.value = global.Calculator.formatAmount(result, locale());

      if (!options.silent) {
        dom.amountTo.classList.remove('is-updated');
        void dom.amountTo.offsetWidth;
        dom.amountTo.classList.add('is-updated');
      }
    }

    renderPairSummary(from, to);
    writeJson(PAIR_KEY, { from: from, to: to, amount: dom.amountFrom.value });
  }

  /** The "1 USD = 2.7000 ₾" line under the converter. */
  function renderPairSummary(from, to) {
    if (!dom.pairSummary) return;

    var rate = global.Calculator.pairRate(from, to);
    if (rate === null) { dom.pairSummary.textContent = '—'; return; }

    var suffix = to === 'GEL' ? ' ₾' : ' ' + to;
    dom.pairSummary.innerHTML = '';

    var text = document.createElement('span');
    text.textContent = '1 ' + from + ' = ';
    var value = document.createElement('strong');
    value.textContent = global.Calculator.formatRate(rate, locale()) + suffix;

    dom.pairSummary.appendChild(text);
    dom.pairSummary.appendChild(value);
  }

  function swapCurrencies() {
    var from = dom.currencyFrom.value;
    dom.currencyFrom.value = dom.currencyTo.value;
    dom.currencyTo.value = from;

    // Carry the computed result over so the swap feels like a continuation.
    var converted = global.Calculator.convert(parseFloat(dom.amountFrom.value), from, dom.currencyFrom.value);
    if (converted !== null && isFinite(converted)) {
      dom.amountFrom.value = Number(converted.toFixed(converted < 1 ? 6 : 2));
    }
    recalculate();
  }

  /* ======================================================================
     Rates table
     ====================================================================== */

  function changeCell(changePct) {
    var span = document.createElement('span');
    var rounded = Math.round(changePct * 100) / 100;

    if (rounded > 0) {
      span.className = 'change up';
      span.textContent = '🟢 ' + global.Calculator.formatPercent(rounded, locale());
    } else if (rounded < 0) {
      span.className = 'change down';
      span.textContent = '🔴 ' + global.Calculator.formatPercent(rounded, locale());
    } else {
      span.className = 'change flat';
      span.textContent = '—';
    }
    return span;
  }

  function buildRow(currency) {
    var row = document.createElement('tr');
    row.className = 'rate-row';
    row.dataset.code = currency.code;
    row.dataset.search = (currency.code + ' ' + currency.name).toLowerCase();
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', currency.name + ' ' + currency.code);

    /* Currency name + flag */
    var nameCell = document.createElement('td');
    var wrap = document.createElement('span');
    wrap.className = 'cur-cell';

    var flag = document.createElement('span');
    flag.className = 'cur-flag';
    paintFlag(flag, currency.code, currency.name);

    var nameBox = document.createElement('span');
    var name = document.createElement('span');
    name.className = 'cur-name';
    name.textContent = currency.name;
    nameBox.appendChild(name);

    if (currency.quantity > 1) {
      var qty = document.createElement('span');
      qty.className = 'cur-qty';
      qty.textContent = t('perUnits', { n: global.Calculator.formatNumber(currency.quantity, locale(), 0) });
      nameBox.appendChild(qty);
    }

    wrap.appendChild(flag);
    wrap.appendChild(nameBox);
    nameCell.appendChild(wrap);

    /* Code */
    var codeCell = document.createElement('td');
    codeCell.className = 'cell-code';
    var badge = document.createElement('span');
    badge.className = 'code-badge';
    badge.textContent = currency.code;
    codeCell.appendChild(badge);

    /* Rate */
    var rateCell = document.createElement('td');
    rateCell.className = 'num';
    var rateValue = document.createElement('span');
    rateValue.className = 'rate-value';
    rateValue.textContent = global.Calculator.formatRate(currency.rate, locale());
    rateCell.appendChild(rateValue);

    /* 24h change + alert badge */
    var changeTd = document.createElement('td');
    changeTd.className = 'num cell-change';
    changeTd.appendChild(changeCell(currency.changePct));

    if (isAlertTriggered(currency.code)) {
      var badgeEl = document.createElement('span');
      badgeEl.className = 'alert-flag';
      badgeEl.textContent = t('alertTriggered');
      changeTd.appendChild(badgeEl);
    }

    row.appendChild(nameCell);
    row.appendChild(codeCell);
    row.appendChild(rateCell);
    row.appendChild(changeTd);
    return row;
  }

  function renderTable() {
    var currencies = global.Calculator.list();
    var fragment = document.createDocumentFragment();

    currencies.forEach(function (currency) {
      if (currency.isBase) return; // GEL against itself is not a rate
      fragment.appendChild(buildRow(currency));
    });

    dom.ratesBody.innerHTML = '';
    dom.ratesBody.appendChild(fragment);
    filterTable();
    highlightSelectedRow();
  }

  function filterTable() {
    var query = (dom.ratesSearch.value || '').trim().toLowerCase();
    var rows = dom.ratesBody.querySelectorAll('tr.rate-row');
    var visible = 0;

    for (var i = 0; i < rows.length; i++) {
      var match = !query || rows[i].dataset.search.indexOf(query) !== -1;
      rows[i].hidden = !match;
      if (match) visible++;
    }
    dom.ratesEmpty.hidden = visible > 0;
  }

  function highlightSelectedRow() {
    var selected = dom.currencyFrom.value;
    var rows = dom.ratesBody.querySelectorAll('tr.rate-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('is-selected', rows[i].dataset.code === selected);
    }
  }

  function selectCurrencyFromTable(code) {
    if (!global.Calculator.has(code)) return;

    dom.currencyFrom.value = code;
    if (dom.currencyTo.value === code) dom.currencyTo.value = 'GEL';
    recalculate();
    highlightSelectedRow();

    // Bring the converter back into view, but only when it is actually off-screen.
    var target = $('calculator');
    if (!target || typeof target.scrollIntoView !== 'function') return;

    var box = target.getBoundingClientRect();
    if (box.bottom < 80 || box.top > (global.innerHeight || 0)) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ======================================================================
     Freshness line
     ====================================================================== */

  function relativeUpdated(timestamp) {
    if (!timestamp) return '';
    var minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return t('updatedJustNow');
    if (minutes < 60) return t('updatedMinutes', { n: minutes });
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return t('updatedHours', { n: hours });
    return t('updatedDays', { n: Math.floor(hours / 24) });
  }

  function formatSnapshotDate(iso) {
    return global.I18n.formatDate(iso, 'long');
  }

  function renderFreshness() {
    if (dom.updatedAt) dom.updatedAt.textContent = relativeUpdated(lastFetchedAt);
    if (dom.footerUpdated) {
      dom.footerUpdated.textContent = t('officialFor', { date: formatSnapshotDate(global.Calculator.snapshotDate()) });
    }
  }

  /* ======================================================================
     Rate alerts (localStorage only — no push notifications)
     ====================================================================== */

  function loadAlerts() {
    var stored = readJson(ALERTS_KEY, []);
    alerts = Array.isArray(stored) ? stored : [];
  }

  function saveAlerts() { writeJson(ALERTS_KEY, alerts); }

  function isAlertTriggered(code) {
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].code !== code) continue;
      var rate = global.Calculator.unitRate(code);
      if (rate === null) continue;
      if (alerts[i].dir === 'below' ? rate < alerts[i].value : rate > alerts[i].value) return true;
    }
    return false;
  }

  function renderAlerts() {
    if (!dom.alertList) return;
    dom.alertList.innerHTML = '';
    dom.alertEmpty.hidden = alerts.length > 0;

    alerts.forEach(function (alert) {
      var rate = global.Calculator.unitRate(alert.code);
      var triggered = rate !== null && (alert.dir === 'below' ? rate < alert.value : rate > alert.value);

      var item = document.createElement('li');
      item.className = 'alert-item' + (triggered ? ' is-triggered' : '');

      var text = document.createElement('span');
      text.className = 'alert-text';
      var rule = document.createElement('strong');
      rule.textContent = t(alert.dir === 'below' ? 'alertRuleBelow' : 'alertRuleAbove', {
        code: alert.code,
        value: global.Calculator.formatRate(alert.value, locale())
      });
      text.appendChild(rule);

      if (rate !== null) {
        var now = document.createElement('span');
        now.textContent = '  ·  ' + t('alertNow', { value: global.Calculator.formatRate(rate, locale()) });
        text.appendChild(now);
      }

      var status = document.createElement('span');
      status.className = 'alert-status';
      status.textContent = triggered ? t('alertTriggered') : t('alertWaiting');

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-btn';
      remove.textContent = t('alertRemove');
      remove.addEventListener('click', function () {
        alerts = alerts.filter(function (a) { return a.id !== alert.id; });
        saveAlerts();
        renderAlerts();
        renderTable();
      });

      item.appendChild(text);
      item.appendChild(status);
      item.appendChild(remove);
      dom.alertList.appendChild(item);
    });
  }

  function addAlert(event) {
    event.preventDefault();
    var code = dom.alertCurrency.value;
    var value = parseFloat(dom.alertValue.value);

    if (!global.Calculator.has(code) || !isFinite(value) || value <= 0) {
      showToast(t('alertInvalid'));
      return;
    }

    alerts.push({
      id: String(Date.now()) + Math.random().toString(16).slice(2, 6),
      code: code,
      dir: dom.alertDirection.value === 'above' ? 'above' : 'below',
      value: value
    });

    saveAlerts();
    renderAlerts();
    renderTable();
    dom.alertValue.value = '';
    showToast(t('alertAdded'));
  }

  /* ======================================================================
     Copy & share
     ====================================================================== */

  /** Clipboard with an execCommand fallback for non-secure contexts (file://). */
  async function copyText(text) {
    try {
      if (navigator.clipboard && global.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through to the legacy path */ }

    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function conversionText() {
    return dom.amountFrom.value + ' ' + dom.currencyFrom.value + ' = ' +
           dom.amountTo.value + ' ' + dom.currencyTo.value;
  }

  function shareUrl() {
    var url = new URL(global.location.href);
    url.hash = 'calculator';
    url.searchParams.set('amount', dom.amountFrom.value);
    url.searchParams.set('from', dom.currencyFrom.value);
    url.searchParams.set('to', dom.currencyTo.value);
    return url.toString();
  }

  async function handleCopy() {
    var ok = await copyText(conversionText());
    showToast(t(ok ? 'copied' : 'copyFailed'));
  }

  async function handleShare() {
    var url = shareUrl();
    var text = t('shareText', {
      from: dom.amountFrom.value + ' ' + dom.currencyFrom.value,
      to: dom.amountTo.value + ' ' + dom.currencyTo.value
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: t('brandName'), text: text, url: url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // the user dismissed the sheet
      }
    }

    var ok = await copyText(url);
    showToast(t(ok ? 'linkCopied' : 'copyFailed'));
  }

  /* ======================================================================
     Chart wiring (lazy)
     ====================================================================== */

  function bootstrapChart() {
    if (chartBootstrapped || !global.Calculator.list().length) return;
    chartBootstrapped = true;
    global.RateChart.load(dom.chartCurrency.value, currentChartRange);
  }

  /** Only download Chart.js once the section is close to the viewport. */
  function observeChartSection() {
    var section = $('charts');
    if (!section) return;

    if (typeof global.IntersectionObserver !== 'function') { bootstrapChart(); return; }

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          observer.disconnect();
          bootstrapChart();
        }
      }
    }, { rootMargin: '200px' });

    observer.observe(section);
  }

  function setChartRange(range, button) {
    currentChartRange = range;
    dom.rangeTabs.forEach(function (tab) {
      var active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    chartBootstrapped = true;
    global.RateChart.load(dom.chartCurrency.value, currentChartRange);
  }

  /* ======================================================================
     Data loading
     ====================================================================== */

  function showError(messageKey) {
    if (!dom.globalError) return;
    dom.globalError.textContent = t(messageKey);
    dom.globalError.hidden = false;
  }

  function hideError() {
    if (dom.globalError) dom.globalError.hidden = true;
  }

  /**
   * Fetch today's rates and repaint everything that depends on them.
   * A failure never clears the page: cached data stays on screen and the user
   * gets an explanatory banner plus the Refresh button.
   */
  async function loadRates(options) {
    options = options || {};
    if (dom.refreshBtn) dom.refreshBtn.disabled = true;

    try {
      var snapshot = await global.Api.getLatest(global.I18n.lang(), { force: !!options.force });

      global.Calculator.setSnapshot(snapshot, t('gelName'));
      lastFetchedAt = snapshot.fetchedAt || Date.now();

      var isFirstRun = !options.keepSelection;
      populateSelects();

      if (isFirstRun) {
        var pair = initialPair();
        dom.currencyFrom.value = pair.from;
        dom.currencyTo.value = pair.to;
        if (pair.amount && isFinite(parseFloat(pair.amount))) dom.amountFrom.value = pair.amount;
        if (dom.chartCurrency && global.Calculator.has('USD')) dom.chartCurrency.value = 'USD';
        if (dom.alertCurrency && global.Calculator.has('USD')) dom.alertCurrency.value = 'USD';
        updateFlag(dom.flagChart, dom.chartCurrency.value);
      }

      renderTable();
      renderAlerts();
      recalculate({ silent: isFirstRun });
      renderFreshness();

      if (snapshot.stale) showError('loadErrorCached');
      else hideError();

      if (options.force && !snapshot.stale) showToast(t('refreshed'));
      if (options.force && chartBootstrapped) global.RateChart.load(dom.chartCurrency.value, currentChartRange);
    } catch (error) {
      console.error('[LarisKursi] failed to load rates:', error);
      showError('loadError');
      if (dom.ratesBody && !dom.ratesBody.querySelector('tr.rate-row')) {
        dom.ratesBody.innerHTML = '';
        dom.ratesEmpty.hidden = false;
        dom.ratesEmpty.textContent = t('loadError');
      }
      if (dom.pairSummary) dom.pairSummary.textContent = '—';
    } finally {
      if (dom.refreshBtn) dom.refreshBtn.disabled = false;
    }
  }

  /* ======================================================================
     Language switching
     ====================================================================== */

  /** Currency names come from the API per language, so a switch refetches them. */
  async function handleLanguageChange() {
    await loadRates({ keepSelection: true });
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    if (chartBootstrapped) global.RateChart.load(dom.chartCurrency.value, currentChartRange);
  }

  /* ======================================================================
     Init
     ====================================================================== */

  function cacheDom() {
    dom = {
      themeToggle: $('theme-toggle'),
      themeIcon: $('theme-icon'),
      langToggle: $('lang-toggle'),

      amountFrom: $('amount-from'),
      amountTo: $('amount-to'),
      currencyFrom: $('currency-from'),
      currencyTo: $('currency-to'),
      flagFrom: $('flag-from'),
      flagTo: $('flag-to'),
      swapBtn: $('swap-btn'),
      copyBtn: $('copy-btn'),
      shareBtn: $('share-btn'),
      refreshBtn: $('refresh-btn'),
      pairSummary: $('pair-summary'),
      updatedAt: $('updated-at'),
      globalError: $('global-error'),

      ratesBody: $('rates-body'),
      ratesSearch: $('rates-search'),
      ratesEmpty: $('rates-empty'),

      chartCurrency: $('chart-currency'),
      flagChart: $('flag-chart'),
      chartRetry: $('chart-retry'),
      rangeTabs: Array.prototype.slice.call(document.querySelectorAll('.range-tab')),

      alertForm: $('alert-form'),
      alertCurrency: $('alert-currency'),
      alertDirection: $('alert-direction'),
      alertValue: $('alert-value'),
      alertList: $('alert-list'),
      alertEmpty: $('alert-empty'),

      footerUpdated: $('footer-updated'),
      toast: $('toast')
    };
  }

  function wireEvents() {
    dom.themeToggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });

    dom.langToggle.addEventListener('click', function () { global.I18n.toggle(); });
    global.I18n.onChange(handleLanguageChange);

    /* Converter — live, debounced, no submit button */
    var debouncedRecalc = debounce(function () { recalculate(); }, 180);
    dom.amountFrom.addEventListener('input', debouncedRecalc);
    dom.currencyFrom.addEventListener('change', function () { recalculate(); highlightSelectedRow(); });
    dom.currencyTo.addEventListener('change', function () { recalculate(); });
    dom.swapBtn.addEventListener('click', swapCurrencies);
    dom.copyBtn.addEventListener('click', handleCopy);
    dom.shareBtn.addEventListener('click', handleShare);
    dom.refreshBtn.addEventListener('click', function () { loadRates({ force: true, keepSelection: true }); });

    /* Rates table — click or keyboard on a delegated row */
    dom.ratesSearch.addEventListener('input', debounce(filterTable, 140));
    dom.ratesBody.addEventListener('click', function (event) {
      var row = event.target.closest('tr.rate-row');
      if (row) selectCurrencyFromTable(row.dataset.code);
    });
    dom.ratesBody.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var row = event.target.closest('tr.rate-row');
      if (!row) return;
      event.preventDefault();
      selectCurrencyFromTable(row.dataset.code);
    });

    /* Chart */
    dom.chartCurrency.addEventListener('change', function () {
      updateFlag(dom.flagChart, dom.chartCurrency.value);
      chartBootstrapped = true;
      global.RateChart.load(dom.chartCurrency.value, currentChartRange);
    });
    dom.rangeTabs.forEach(function (tab) {
      tab.addEventListener('click', function () { setChartRange(tab.dataset.range, tab); });
    });
    if (dom.chartRetry) {
      dom.chartRetry.addEventListener('click', function () { global.RateChart.retryLast(); });
    }

    /* Alerts */
    dom.alertForm.addEventListener('submit', addAlert);
  }

  async function init() {
    cacheDom();
    global.I18n.init();
    initTheme();
    loadAlerts();
    wireEvents();

    await loadRates();
    observeChartSection();

    // Keep the "updated N minutes ago" line honest.
    setInterval(renderFreshness, 30000);

    // Quietly look for newly published rates while the tab stays open.
    setInterval(function () {
      if (!document.hidden) loadRates({ keepSelection: true });
    }, AUTO_REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
