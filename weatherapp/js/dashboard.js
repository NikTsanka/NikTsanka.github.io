/* dashboard.js - the favourites list and the card grid that renders it.
   Owns the persisted order, the per-city load, and the grid's designed states. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var api = WTW.api;
  var units = WTW.units;
  var settings = WTW.settings;

  /* "london" is not a slug in this API - the index calls it "london-gb". */
  var DEFAULT_SLUGS = ['tbilisi', 'london-gb', 'new-york', 'tokyo', 'dubai', 'berlin'];
  var FAV_KEY = 'wtw:pref:favourites';

  var grid, stateArea, meta;
  var slugs = [];
  var index = null;
  var slots = Object.create(null);
  var lastRefresh = null;

  function cssEscape(value) {
    return typeof global.CSS !== 'undefined' && global.CSS.escape
      ? global.CSS.escape(value)
      : String(value).replace(/["\\]/g, '\\$&');
  }

  /* ---------- persisted order ---------- */

  function load() {
    var stored = WTW.storage.getJSON(FAV_KEY);
    if (Array.isArray(stored) && stored.length) {
      var clean = stored.filter(function (s) { return typeof s === 'string' && s; });
      if (clean.length) { return clean; }
    }
    /* Not persisted until the reader changes something, so a later change to the
       defaults still reaches anyone who never customised the list. */
    return DEFAULT_SLUGS.slice();
  }

  function save() { WTW.storage.setJSON(FAV_KEY, slugs); }

  /* ---------- slots ---------- */

  /* Only attaches a slot that is not already in the grid. appendChild on an attached
     node MOVES it to the end, which would reorder the grid by whichever city answered
     first every time a card was re-filled. Order is changed deliberately, in reorderDom. */
  function slotFor(slug) {
    if (!slots[slug]) {
      var slot = doc.createElement('div');
      slot.dataset.slot = slug;
      slots[slug] = slot;
    }
    if (slots[slug].parentNode !== grid) { grid.appendChild(slots[slug]); }
    return slots[slug];
  }

  function fill(slug, node) {
    var slot = slotFor(slug);
    var previous = slot.firstChild;
    if (previous && previous.__clock) { previous.__clock.destroy(); }
    slot.textContent = '';
    slot.appendChild(node);
  }

  function dropSlot(slug) {
    var slot = slots[slug];
    if (!slot) { return; }
    var child = slot.firstChild;
    if (child && child.__clock) { child.__clock.destroy(); }
    slot.remove();
    delete slots[slug];
  }

  /* ---------- rendering ---------- */

  function loadCity(slug) {
    fill(slug, ui.skeletonCard());
    return api.getCity(slug).then(function (res) {
      if (slugs.indexOf(slug) < 0) { return; }
      fill(slug, ui.card(res.data, {
        settings: settings.get(),
        source: res.source,
        isFirst: slugs.indexOf(slug) === 0,
        isLast: slugs.indexOf(slug) === slugs.length - 1,
        onRemove: remove,
        onMove: move
      }));
    }, function (err) {
      if (slugs.indexOf(slug) < 0) { return; }
      var name = index && index.bySlug[slug] ? index.bySlug[slug].name : slug;
      fill(slug, ui.state({
        tone: 'error', icon: err && err.kind === 'offline' ? 'offline' : 'error',
        title: name, text: (err && err.message) || 'This city could not be loaded.',
        actionLabel: 'Retry', onAction: function () { loadCity(slug); }
      }));
    });
  }

  /* Progressive: every city is requested at once and each card lands as it arrives.
     allSettled, never a sequential await loop - one slow city must not hold up five. */
  function loadAll() {
    grid.setAttribute('aria-busy', 'true');
    return Promise.allSettled(slugs.map(loadCity)).then(function () {
      grid.setAttribute('aria-busy', 'false');
      lastRefresh = Date.now();
      updateMeta();
    });
  }

  function updateMeta() {
    var count = slugs.length;
    var when = lastRefresh ? units.relativeAge(lastRefresh) : null;
    meta.textContent = count + (count === 1 ? ' city' : ' cities') +
      (when ? ' \u00B7 refreshed ' + when : '');
  }

  /* Re-appends every slot in list order and refreshes the first/last button states.
     Here the move semantics of appendChild are exactly what is wanted. */
  function reorderDom() {
    slugs.forEach(function (slug, position) {
      grid.appendChild(slotFor(slug));
      var card = slots[slug] && slots[slug].firstChild;
      if (!card || !card.classList || !card.classList.contains('card')) { return; }
      var buttons = card.querySelectorAll('.card__actions button');
      if (buttons.length === 3) {
        buttons[0].disabled = position === 0;
        buttons[1].disabled = position === slugs.length - 1;
      }
    });
    updateMeta();
  }

  function showEmpty() {
    stateArea.textContent = '';
    stateArea.appendChild(ui.state({
      icon: 'empty', title: 'No cities yet',
      text: 'Search above to add a city, or restore the default six.',
      actionLabel: 'Restore defaults',
      onAction: function () {
        stateArea.textContent = '';
        slugs = DEFAULT_SLUGS.slice();
        save();
        loadAll();
      }
    }));
  }

  /* ---------- mutations ---------- */

  function add(slug) {
    if (slugs.indexOf(slug) >= 0) { return; }
    slugs.push(slug);
    save();
    stateArea.textContent = '';
    loadCity(slug).then(reorderDom);
  }

  function remove(slug) {
    var i = slugs.indexOf(slug);
    if (i < 0) { return; }
    slugs.splice(i, 1);
    save();
    dropSlot(slug);
    reorderDom();
    if (slugs.length === 0) { showEmpty(); }
  }

  function move(slug, delta) {
    var from = slugs.indexOf(slug);
    var to = from + delta;
    if (from < 0 || to < 0 || to >= slugs.length) { return; }
    slugs.splice(to, 0, slugs.splice(from, 1)[0]);
    save();
    reorderDom();
    /* Focus follows the card that moved, so a keyboard reorder can continue. */
    focusCard(slug);
  }

  function focusCard(slug) {
    var link = grid.querySelector('[data-slot="' + cssEscape(slug) + '"] .card__link');
    if (link) { link.focus(); }
    return !!link;
  }

  WTW.dashboard = {
    DEFAULT_SLUGS: DEFAULT_SLUGS,

    init: function () {
      grid = doc.getElementById('card-grid');
      stateArea = doc.getElementById('state-area');
      meta = doc.getElementById('dashboard-meta');
      slugs = load();
      slugs.forEach(function (slug) { fill(slug, ui.skeletonCard()); });
    },

    setIndex: function (value) { index = value; },
    slugs: function () { return slugs.slice(); },
    has: function (slug) { return slugs.indexOf(slug) >= 0; },
    loadAll: loadAll,
    loadCity: loadCity,
    add: add,
    remove: remove,
    move: move,
    focusCard: focusCard,
    clearState: function () { stateArea.textContent = ''; },
    stateArea: function () { return stateArea; },

    /* Units and the 12/24-hour choice change both text and the clock's own markup, so
       rendered cards are rebuilt rather than patched. */
    rerender: function () {
      slugs.forEach(function (slug) {
        var card = slots[slug] && slots[slug].firstChild;
        if (card && card.classList && card.classList.contains('card')) { loadCity(slug); }
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
