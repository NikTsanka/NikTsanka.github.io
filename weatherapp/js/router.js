/* router.js - hash routing, and nothing else.

   Hash rather than paths because GitHub Pages cannot rewrite an unknown path back to
   index.html, so /weatherapp/city/tokyo would simply 404. Hash rather than pushState
   because pushState throws a SecurityError on file:// in Chrome - one code path has to
   serve both targets, so it is the one that works in both. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  var handler = null;

  function decode(value) {
    try { return decodeURIComponent(value); } catch (err) { return value; }
  }

  /* Slugs in this API are not all bare words - "st.-john's-ag" is real - so the slug is
     always encoded on the way out and decoded on the way in. */
  function hashFor(slug) {
    return slug ? '#city=' + encodeURIComponent(slug) : '';
  }

  var VIEWS = ['planner', 'zones'];

  function hashForView(name) {
    return VIEWS.indexOf(name) >= 0 ? '#' + name : '';
  }

  function parse() {
    var hash = global.location.hash || '';

    var view = /^#([a-z]+)$/.exec(hash);
    if (view && VIEWS.indexOf(view[1]) >= 0) { return { name: view[1], slug: null }; }

    var match = /^#city=(.+)$/.exec(hash);
    if (match) {
      var slug = decode(match[1]).trim();
      if (slug) { return { name: 'city', slug: slug }; }
    }
    return { name: 'dashboard', slug: null };
  }

  /* Older links used ?city=<slug>. Normalise them to the hash form on first load so a
     single route shape reaches the rest of the app. */
  function legacyQuerySlug() {
    var match = /[?&]city=([^&]+)/.exec(global.location.search || '');
    if (!match) { return null; }
    var slug = decode(match[1]).trim();
    return slug || null;
  }

  function onHashChange() {
    if (handler) { handler(parse()); }
  }

  WTW.router = {
    VIEWS: VIEWS,
    route: parse,
    hashFor: hashFor,
    hashForView: hashForView,

    /* Setting location.hash is the only navigation primitive used here. */
    go: function (slug) {
      var next = hashFor(slug);
      if ((global.location.hash || '') === next) { onHashChange(); return; }
      if (next) { global.location.hash = next; }
      else if (global.location.hash) { global.location.hash = ''; }
      else { onHashChange(); }
    },

    start: function (fn) {
      handler = fn;
      var legacy = legacyQuerySlug();
      if (legacy && parse().name === 'dashboard') {
        /* Replaces the query form with the hash form without a reload. */
        global.location.hash = hashFor(legacy);
      }
      global.addEventListener('hashchange', onHashChange);
      onHashChange();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
