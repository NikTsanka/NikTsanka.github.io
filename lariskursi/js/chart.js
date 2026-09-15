/**
 * chart.js — historical rate chart (Chart.js, lazy-loaded from a CDN).
 *
 * The NBG API returns one day per request, so a range is built by sampling dates
 * and fetching them in small batches (see Api.getDaysRates). Sampling keeps the
 * "1 year" view at ~53 requests instead of 365, and every result is cached in
 * localStorage, so switching ranges back and forth is instant after the first run.
 *
 * Chart.js itself is only downloaded once the chart section scrolls into view,
 * which keeps it off the critical path for Core Web Vitals.
 *
 * Exposes a single global: window.RateChart
 */
(function (global) {
  'use strict';

  var CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

  /* spanDays: how far back to go. stepDays: sampling interval. */
  var RANGES = {
    '7d': { spanDays: 7,   stepDays: 1, batch: 4 },
    '1m': { spanDays: 30,  stepDays: 2, batch: 6 },
    '6m': { spanDays: 182, stepDays: 7, batch: 8 },
    '1y': { spanDays: 365, stepDays: 7, batch: 8 }
  };

  var chartInstance = null;
  var libraryPromise = null;
  var requestToken = 0;          // guards against out-of-order responses
  var lastRequest = null;        // { code, range } — for the retry button

  var els = {};

  function el(id) {
    if (!els[id]) els[id] = document.getElementById(id);
    return els[id];
  }

  /* ----------------------------------------------------------------------
     Library loading
     ---------------------------------------------------------------------- */

  /** Inject the Chart.js <script> once; resolves with the global Chart. */
  function loadLibrary() {
    if (global.Chart) return Promise.resolve(global.Chart);
    if (libraryPromise) return libraryPromise;

    libraryPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = CHART_JS_URL;
      script.async = true;
      script.onload = function () {
        if (global.Chart) resolve(global.Chart);
        else reject(new Error('Chart.js loaded but the global Chart is missing'));
      };
      script.onerror = function () {
        libraryPromise = null; // allow a retry
        reject(new Error('Could not load Chart.js from the CDN'));
      };
      document.head.appendChild(script);
    });

    return libraryPromise;
  }

  /* ----------------------------------------------------------------------
     Dates
     ---------------------------------------------------------------------- */

  function toIsoDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  /** Sampled, ascending list of dates for a range, always ending with today. */
  function datesForRange(rangeKey) {
    var config = RANGES[rangeKey] || RANGES['7d'];
    var today = new Date();
    today.setHours(12, 0, 0, 0); // midday avoids DST edge cases when subtracting days

    var dates = [];
    for (var offset = config.spanDays; offset >= 0; offset -= config.stepDays) {
      var d = new Date(today.getTime());
      d.setDate(d.getDate() - offset);
      dates.push(toIsoDate(d));
    }

    var todayIso = toIsoDate(today);
    if (dates[dates.length - 1] !== todayIso) dates.push(todayIso);

    return dates;
  }

  /* ----------------------------------------------------------------------
     Overlay state
     ---------------------------------------------------------------------- */

  function showOverlay(messageKey, showRetry) {
    var overlay = el('chart-overlay');
    var message = el('chart-message');
    var retry = el('chart-retry');
    if (!overlay) return;

    if (message) message.textContent = global.I18n ? global.I18n.t(messageKey) : '';
    overlay.classList.toggle('is-error', !!showRetry);
    if (retry) retry.hidden = !showRetry;
    overlay.hidden = false;
  }

  function hideOverlay() {
    var overlay = el('chart-overlay');
    if (overlay) overlay.hidden = true;
  }

  /* ----------------------------------------------------------------------
     Rendering
     ---------------------------------------------------------------------- */

  /** Read live theme colors so the chart matches dark/light mode. */
  function themeColors() {
    var styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue('--accent-emerald').trim() || '#10B981',
      text: styles.getPropertyValue('--text-muted').trim() || '#64748B',
      grid: styles.getPropertyValue('--grid-line').trim() || 'rgba(148,163,184,.14)',
      surface: styles.getPropertyValue('--surface-solid').trim() || '#1E293B',
      border: styles.getPropertyValue('--border-strong').trim() || 'rgba(148,163,184,.32)'
    };
  }

  /** Short axis label, e.g. "15 სექ" / "Sep 15". */
  function axisLabel(iso) {
    return global.I18n ? global.I18n.formatDate(iso, 'short') : iso.slice(5);
  }

  function updateStats(values, code) {
    var stats = el('chart-stats');
    if (!stats || !values.length) { if (stats) stats.hidden = true; return; }

    var locale = global.I18n ? global.I18n.locale() : 'ka-GE';
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var first = values[0];
    var last = values[values.length - 1];
    var changePct = first > 0 ? ((last - first) / first) * 100 : 0;

    el('stat-min').textContent = global.Calculator.formatRate(min, locale) + ' ₾';
    el('stat-max').textContent = global.Calculator.formatRate(max, locale) + ' ₾';

    var changeEl = el('stat-change');
    changeEl.textContent = global.Calculator.formatPercent(changePct, locale);
    changeEl.className = changePct > 0 ? 'up' : (changePct < 0 ? 'down' : '');

    stats.hidden = false;
  }

  function draw(Chart, labels, values, code) {
    var colors = themeColors();
    var canvas = el('rate-chart');
    var ctx = canvas.getContext('2d');

    // Soft vertical fill under the line. The canvas is sized by CSS, so measure the
    // rendered box — canvas.height is still 0 before Chart.js takes over.
    var boxHeight = canvas.clientHeight || (canvas.parentElement && canvas.parentElement.clientHeight) || 360;
    var gradient = ctx.createLinearGradient(0, 0, 0, boxHeight);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.32)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    var locale = global.I18n ? global.I18n.locale() : 'ka-GE';
    var datasetLabel = global.I18n ? global.I18n.t('chartLabel', { code: code }) : code;

    /* Rates move in tiny steps (2.6085 → 2.6128), so a fixed two decimals would
       print the same label on every gridline. Derive the precision from the tick
       step Chart.js actually picked — just enough digits to tell ticks apart. */
    function tickDecimals(ticks) {
      if (!ticks || ticks.length < 2) return 2;
      var step = Math.abs(ticks[1].value - ticks[0].value);
      if (!(step > 0)) return 2;
      return Math.max(2, Math.min(6, Math.ceil(-Math.log10(step))));
    }

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    // Chart.js keeps its own canvas registry; if a previous construction failed
    // part-way the canvas can still be claimed, so release it explicitly.
    var claimed = typeof Chart.getChart === 'function' ? Chart.getChart(canvas) : null;
    if (claimed) claimed.destroy();

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: datasetLabel,
          data: values,
          borderColor: colors.accent,
          backgroundColor: gradient,
          borderWidth: 2.5,
          pointRadius: values.length > 40 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.accent,
          pointBorderColor: colors.surface,
          pointBorderWidth: 2,
          tension: 0.32,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.surface,
            titleColor: colors.text,
            bodyColor: colors.text,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function (item) {
                return global.Calculator.formatRate(item.parsed.y, locale) + ' ₾';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } }
          },
          y: {
            grid: { color: colors.grid },
            border: { display: false },
            ticks: {
              color: colors.text,
              font: { size: 11 },
              callback: function (value, index, ticks) {
                return global.Calculator.formatNumber(value, locale, tickDecimals(ticks));
              }
            }
          }
        }
      }
    });

    var canvasEl = el('rate-chart');
    if (canvasEl && global.I18n) {
      canvasEl.setAttribute('aria-label', global.I18n.t('chartAria', { code: code }));
    }
  }

  /* ----------------------------------------------------------------------
     Public entry point
     ---------------------------------------------------------------------- */

  /**
   * Fetch and render one currency over one range.
   * Safe to call repeatedly — late responses from superseded calls are discarded.
   */
  async function load(code, rangeKey) {
    lastRequest = { code: code, range: rangeKey };
    var token = ++requestToken;

    showOverlay('chartLoading', false);
    var stats = el('chart-stats');
    if (stats) stats.hidden = true;

    try {
      var Chart = await loadLibrary();
      if (token !== requestToken) return;

      var config = RANGES[rangeKey] || RANGES['7d'];
      var days = await global.Api.getDaysRates(datesForRange(rangeKey), config.batch);
      if (token !== requestToken) return;

      var labels = [];
      var values = [];
      for (var i = 0; i < days.length; i++) {
        var rate = days[i].rates[code];
        if (typeof rate === 'number' && isFinite(rate)) {
          labels.push(axisLabel(days[i].date));
          values.push(rate);
        }
      }

      // NBG publishes tomorrow's official rate late in the day, so the live
      // snapshot can be one step ahead of the newest history point. Append it
      // so the chart always ends on the rate the table is showing.
      var latestDate = global.Calculator.snapshotDate();
      var latestRate = global.Calculator.unitRate(code);
      if (latestDate && latestRate && (!days.length || latestDate > days[days.length - 1].date)) {
        labels.push(axisLabel(latestDate));
        values.push(latestRate);
      }

      if (values.length < 2) {
        showOverlay('chartEmpty', true);
        return;
      }

      draw(Chart, labels, values, code);
      updateStats(values, code);
      hideOverlay();
    } catch (error) {
      if (token !== requestToken) return;
      console.error('[LarisKursi] chart failed:', error);
      showOverlay('chartError', true);
    }
  }

  /** Re-render with the current theme's colors (called by the theme toggle). */
  function refreshTheme() {
    if (lastRequest && chartInstance) load(lastRequest.code, lastRequest.range);
  }

  function retryLast() {
    if (lastRequest) load(lastRequest.code, lastRequest.range);
  }

  function isLoaded() { return !!chartInstance; }

  global.RateChart = {
    load: load,
    retryLast: retryLast,
    refreshTheme: refreshTheme,
    isLoaded: isLoaded,
    RANGES: RANGES
  };
})(window);
