/* app.js - bootstrap and orchestration. Owns the visible set, wires the search box and
   the refresh triggers, and asks api.js for data. Loaded last. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var api = WTW.api;
  var units = WTW.units;

  /* "london" is not a slug in this API - the index calls it "london-gb". */
  var DEFAULT_SLUGS = ['tbilisi', 'london-gb', 'new-york', 'tokyo', 'dubai', 'berlin'];
  var SEARCH_DEBOUNCE_MS = 150;

  var dom = {
    grid: doc.getElementById('card-grid'),
    stateArea: doc.getElementById('state-area'),
    noticeArea: doc.getElementById('notice-area'),
    meta: doc.getElementById('dashboard-meta'),
    input: doc.getElementById('search-input'),
    results: doc.getElementById('search-results'),
    clear: doc.getElementById('search-clear'),
    refresh: doc.getElementById('refresh-btn')
  };

  var state = {
    slugs: DEFAULT_SLUGS.slice(),
    index: null,
    slots: Object.create(null),
    settings: { temperatureUnit: 'c', windUnit: 'kmh', hour12: false },
    activeOption: -1,
    options: [],
    lastRefresh: null
  };

  /* ---------- grid plumbing ---------- */

  function slotFor(slug) {
    if (!state.slots[slug]) {
      var slot = doc.createElement('div');
      slot.dataset.slot = slug;
      state.slots[slug] = slot;
      dom.grid.appendChild(slot);
    }
    return state.slots[slug];
  }

  function fill(slug, node) {
    var slot = slotFor(slug);
    var previous = slot.firstChild;
    if (previous && previous.__clock) { previous.__clock.destroy(); }
    slot.textContent = '';
    slot.appendChild(node);
  }

  function dropSlot(slug) {
    var slot = state.slots[slug];
    if (!slot) { return; }
    var child = slot.firstChild;
    if (child && child.__clock) { child.__clock.destroy(); }
    slot.remove();
    delete state.slots[slug];
  }

  function cityErrorCard(slug, error) {
    var name = state.index && state.index.bySlug[slug] ? state.index.bySlug[slug].name : slug;
    return ui.state({
      tone: 'error', icon: error && error.kind === 'offline' ? 'offline' : 'error',
      title: name,
      text: (error && error.message) || 'This city could not be loaded.',
      actionLabel: 'Retry', onAction: function () { loadCity(slug); }
    });
  }

  function loadCity(slug) {
    fill(slug, ui.skeletonCard());
    return api.getCity(slug).then(function (res) {
      if (state.slugs.indexOf(slug) < 0) { return; }
      fill(slug, ui.card(res.data, {
        settings: state.settings,
        source: res.source,
        onRemove: removeCity
      }));
    }, function (err) {
      if (state.slugs.indexOf(slug) < 0) { return; }
      fill(slug, cityErrorCard(slug, err));
    });
  }

  /* Progressive: every city is requested at once and each card lands as it arrives.
     allSettled, never a sequential await loop - one slow city must not hold up five. */
  function loadVisible() {
    dom.grid.setAttribute('aria-busy', 'true');
    var work = state.slugs.map(loadCity);
    return Promise.allSettled(work).then(function () {
      dom.grid.setAttribute('aria-busy', 'false');
      state.lastRefresh = Date.now();
      updateMeta();
    });
  }

  function updateMeta() {
    var count = state.slugs.length;
    var when = state.lastRefresh ? units.relativeAge(state.lastRefresh) : null;
    dom.meta.textContent = count + (count === 1 ? ' city' : ' cities') + (when ? ' · refreshed ' + when : '');
  }

  function addCity(slug) {
    if (state.slugs.indexOf(slug) >= 0) { return; }
    state.slugs.push(slug);
    loadCity(slug).then(updateMeta);
    updateMeta();
  }

  function removeCity(slug) {
    var i = state.slugs.indexOf(slug);
    if (i < 0) { return; }
    state.slugs.splice(i, 1);
    dropSlot(slug);
    updateMeta();
    if (state.slugs.length === 0) { showEmptyDashboard(); }
  }

  function showEmptyDashboard() {
    dom.stateArea.textContent = '';
    dom.stateArea.appendChild(ui.state({
      icon: 'empty', title: 'No cities yet',
      text: 'Search above to add a city, or restore the default six.',
      actionLabel: 'Restore defaults',
      onAction: function () {
        dom.stateArea.textContent = '';
        state.slugs = DEFAULT_SLUGS.slice();
        loadVisible();
      }
    }));
  }

  /* ---------- search ---------- */

  var debounceTimer = null;

  function closeResults() {
    dom.results.classList.add('is-hidden');
    dom.results.textContent = '';
    dom.input.setAttribute('aria-expanded', 'false');
    dom.input.removeAttribute('aria-activedescendant');
    state.options = [];
    state.activeOption = -1;
  }

  function highlight(nextIndex) {
    if (state.options.length === 0) { return; }
    var total = state.options.length;
    var index = ((nextIndex % total) + total) % total;
    for (var i = 0; i < total; i++) {
      state.options[i].node.setAttribute('aria-selected', i === index ? 'true' : 'false');
    }
    state.activeOption = index;
    dom.input.setAttribute('aria-activedescendant', state.options[index].node.id);
    state.options[index].node.scrollIntoView({ block: 'nearest' });
  }

  function renderResults(query) {
    if (!state.index) { return; }
    var matches = ui.search(state.index.list, query, 40);
    dom.results.textContent = '';
    state.options = [];
    state.activeOption = -1;

    if (matches.length === 0) {
      var empty = doc.createElement('li');
      empty.className = 'search__option';
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-selected', 'false');
      empty.setAttribute('aria-disabled', 'true');
      empty.textContent = 'No city matches “' + query + '”';
      dom.results.appendChild(empty);
    } else {
      matches.forEach(function (city, i) {
        var node = ui.searchOption(city, 'search-option-' + i, state.slugs.indexOf(city.slug) >= 0);
        node.addEventListener('mousedown', function (event) {
          event.preventDefault();
          choose(city.slug);
        });
        dom.results.appendChild(node);
        state.options.push({ node: node, slug: city.slug });
      });
    }

    dom.results.classList.remove('is-hidden');
    dom.input.setAttribute('aria-expanded', 'true');
  }

  function choose(slug) {
    addCity(slug);
    dom.input.value = '';
    dom.clear.classList.add('is-hidden');
    closeResults();
    dom.input.focus();
  }

  function onSearchInput() {
    var value = dom.input.value;
    dom.clear.classList.toggle('is-hidden', value === '');
    global.clearTimeout(debounceTimer);
    debounceTimer = global.setTimeout(function () {
      if (value.trim() === '') { closeResults(); return; }
      renderResults(value.trim());
    }, SEARCH_DEBOUNCE_MS);
  }

  function onSearchKeydown(event) {
    if (event.key === 'Escape') { closeResults(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); highlight(state.activeOption + 1); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); highlight(state.activeOption - 1); return; }
    if (event.key === 'Enter') {
      if (state.activeOption >= 0 && state.options[state.activeOption]) {
        event.preventDefault();
        choose(state.options[state.activeOption].slug);
      }
    }
  }

  /* ---------- refresh ---------- */

  /* Every trigger goes through here and every one is TTL-gated inside api/cache: within
     15 minutes the API would hand back a byte-identical file, so we reuse the cache. */
  function refresh() {
    dom.refresh.classList.add('is-busy');
    return loadVisible().then(function () {
      dom.refresh.classList.remove('is-busy');
    }, function () {
      dom.refresh.classList.remove('is-busy');
    });
  }

  /* ---------- startup ---------- */

  function requestedSlug() {
    var hash = global.location.hash || '';
    var query = global.location.search || '';
    var match = /[#&?]city=([^&]+)/.exec(hash) || /[?&]city=([^&]+)/.exec(query);
    if (!match) { return null; }
    try { return decodeURIComponent(match[1]); } catch (err) { return match[1]; }
  }

  function showIndexError(error) {
    dom.stateArea.textContent = '';
    dom.stateArea.appendChild(ui.stateForError(error, function () {
      dom.stateArea.textContent = '';
      start();
    }));
  }

  function showUnknownSlug(slug) {
    dom.stateArea.textContent = '';
    dom.stateArea.appendChild(ui.state({
      tone: 'error', icon: 'error', title: 'City not found',
      text: '“' + slug + '” is not in the city index. The cities below are still live.',
      actionLabel: 'Dismiss',
      onAction: function () { dom.stateArea.textContent = ''; }
    }));
  }

  function start() {
    state.slugs.forEach(function (slug) { fill(slug, ui.skeletonCard()); });

    api.getCities().then(function (res) {
      state.index = res.data;
      if (res.source === 'fixtures' || res.source === 'stale-cache') {
        dom.noticeArea.appendChild(ui.notice(
          'The city index came from a ' + (res.source === 'fixtures' ? 'bundled snapshot' : 'cached copy') +
          ' because the API could not be reached.'));
      }

      var wanted = requestedSlug();
      if (wanted) {
        if (state.index.bySlug[wanted]) {
          if (state.slugs.indexOf(wanted) < 0) { state.slugs.unshift(wanted); }
        } else {
          showUnknownSlug(wanted);
        }
      }
      return loadVisible();
    }, function (err) {
      /* No index means no search, but the default cities are independent of it. */
      showIndexError(err);
      return loadVisible();
    });
  }

  function init() {
    if (!WTW.storage.isPersistent()) {
      dom.noticeArea.appendChild(ui.notice(
        'This browser is blocking local storage, so settings will not be kept after you close the tab.'));
    }
    WTW.storage.onFallback(function () {
      dom.noticeArea.appendChild(ui.notice('Local storage filled up, so settings will not be kept this session.'));
    });

    dom.input.addEventListener('input', onSearchInput);
    dom.input.addEventListener('keydown', onSearchKeydown);
    dom.input.addEventListener('blur', function () { global.setTimeout(closeResults, 120); });
    dom.clear.addEventListener('click', function () {
      dom.input.value = '';
      dom.clear.classList.add('is-hidden');
      closeResults();
      dom.input.focus();
    });
    dom.refresh.addEventListener('click', refresh);

    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') { refresh(); }
    });

    start();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  WTW.app = { state: state, refresh: refresh, addCity: addCity, removeCity: removeCity };
})(typeof window !== 'undefined' ? window : globalThis);
