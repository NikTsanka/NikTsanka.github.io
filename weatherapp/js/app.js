/* app.js - bootstrap and glue. Starts the dashboard, the search box, the router and the
   settings panel, and owns the refresh triggers. Loaded last. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var api = WTW.api;
  var router = WTW.router;
  var settings = WTW.settings;
  var dashboard = WTW.dashboard;

  var dom = {};
  var index = null;
  var detailSlug = null;
  var lastTrigger = null;

  /* ---------- detail view ---------- */

  function clearDetail() {
    var current = dom.detailRoot.firstChild;
    if (current && current.__clock) { current.__clock.destroy(); }
    dom.detailRoot.textContent = '';
  }

  function showDashboard() {
    clearDetail();
    detailSlug = null;
    dom.dashboard.hidden = false;
    /* Focus returns to the card that opened the detail view, not to the top of the page. */
    if (lastTrigger) { dashboard.focusCard(lastTrigger); }
    lastTrigger = null;
  }

  function showDetail(slug) {
    detailSlug = slug;
    dom.dashboard.hidden = true;
    clearDetail();
    dom.detailRoot.appendChild(ui.skeletonCard());

    /* A slug the index has never heard of is a not-found before any request is made. */
    if (index && !index.bySlug[slug]) {
      renderDetailError(slug, { kind: 'notfound' });
      return Promise.resolve();
    }

    return api.getCity(slug).then(function (res) {
      if (detailSlug !== slug) { return; }
      clearDetail();
      dom.detailRoot.appendChild(WTW.detail.render(res.data, {
        settings: settings.get(), source: res.source
      }));
      var title = doc.getElementById('detail-title');
      if (title) { title.focus(); }
    }, function (err) {
      if (detailSlug !== slug) { return; }
      renderDetailError(slug, err);
    });
  }

  function renderDetailError(slug, err) {
    clearDetail();
    var notFound = err && err.kind === 'notfound';
    dom.detailRoot.appendChild(ui.state({
      tone: 'error', icon: notFound ? 'error' : 'offline',
      title: notFound ? 'City not found' : 'Could not load that city',
      text: notFound
        ? '“' + slug + '” is not in the city index. It may have been renamed.'
        : (err && err.message) || 'The request failed.',
      actionLabel: 'Retry', onAction: function () { showDetail(slug); },
      linkLabel: '← Back to all cities', linkHref: router.hashFor(null) || '#'
    }));
    var heading = dom.detailRoot.querySelector('.state__title');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }

  function onRoute(route) {
    if (route.name === 'city') { showDetail(route.slug); } else { showDashboard(); }
  }

  /* ---------- settings panel ---------- */

  function toggleSettings(force) {
    var open = force !== undefined ? force : dom.settingsPanel.hidden;
    dom.settingsPanel.hidden = !open;
    dom.settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = dom.settingsPanel.querySelector('input');
      if (first) { first.focus(); }
    }
  }

  function onSettingsChange() {
    dashboard.rerender();
    if (detailSlug) { showDetail(detailSlug); }
  }

  /* ---------- refresh ---------- */

  /* Every trigger goes through here, and each is TTL-gated inside api/cache: within 15
     minutes the API would hand back a byte-identical file, so the cache is reused. */
  function refresh() {
    dom.refresh.classList.add('is-busy');
    var work = detailSlug ? showDetail(detailSlug) : dashboard.loadAll();
    var done = function () { dom.refresh.classList.remove('is-busy'); };
    return Promise.resolve(work).then(done, done);
  }

  /* ---------- startup ---------- */

  function start() {
    api.getCities().then(function (res) {
      index = res.data;
      dashboard.setIndex(index);
      if (res.source === 'fixtures' || res.source === 'stale-cache') {
        dom.noticeArea.appendChild(ui.notice('The city index came from a ' +
          (res.source === 'fixtures' ? 'bundled snapshot' : 'cached copy') +
          ' because the API could not be reached.'));
      }
      router.start(onRoute);
      return dashboard.loadAll();
    }, function (err) {
      /* No index means no search, but the favourite cities are independent of it. */
      dashboard.clearState();
      dashboard.stateArea().appendChild(ui.stateForError(err, function () {
        dashboard.clearState();
        start();
      }));
      router.start(onRoute);
      return dashboard.loadAll();
    });
  }

  function init() {
    dom = {
      dashboard: doc.getElementById('dashboard'),
      detailRoot: doc.getElementById('detail-root'),
      grid: doc.getElementById('card-grid'),
      noticeArea: doc.getElementById('notice-area'),
      refresh: doc.getElementById('refresh-btn'),
      settingsBtn: doc.getElementById('settings-btn'),
      settingsPanel: doc.getElementById('settings-panel')
    };

    dashboard.init();

    if (!WTW.storage.isPersistent()) {
      dom.noticeArea.appendChild(ui.notice('This browser is blocking local storage, so your ' +
        'cities and settings will not be kept after you close the tab.'));
    }
    WTW.storage.onFallback(function () {
      dom.noticeArea.appendChild(ui.notice('Local storage filled up, so changes will not be kept this session.'));
    });

    dom.settingsPanel.appendChild(settings.panel());
    settings.subscribe(onSettingsChange);

    WTW.search.bind({
      list: function () { return index ? index.list : null; },
      isAdded: function (slug) { return dashboard.has(slug); },
      onChoose: function (slug) { dashboard.add(slug); }
    });

    dom.refresh.addEventListener('click', refresh);
    dom.settingsBtn.addEventListener('click', function () { toggleSettings(); });

    /* Remember which card opened the detail view so focus can return to it. */
    dom.grid.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('.card__link');
      if (link) { lastTrigger = link.dataset.slug; }
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') { return; }
      if (!dom.settingsPanel.hidden) { toggleSettings(false); dom.settingsBtn.focus(); return; }
      if (detailSlug) { router.go(null); }
    });

    doc.addEventListener('click', function (event) {
      if (dom.settingsPanel.hidden) { return; }
      if (!dom.settingsPanel.contains(event.target) && !dom.settingsBtn.contains(event.target)) {
        toggleSettings(false);
      }
    });

    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') { refresh(); }
    });

    start();
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); }
  else { init(); }

  WTW.app = { refresh: refresh, route: function () { return detailSlug; } };
})(typeof window !== 'undefined' ? window : globalThis);
