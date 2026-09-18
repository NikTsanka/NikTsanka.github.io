/* cache.js - versioned, TTL-bounded, LRU-evicting cache on top of storage.js.
   Key shape: wtw:v1:<kind>:<key>. The version segment is the invalidation lever: bump
   CACHE_VERSION whenever normalize.js changes shape and every older entry is ignored and
   swept, rather than being fed to code that no longer understands it. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var storage = WTW.storage;

  var CACHE_VERSION = 'v1';
  var PREFIX = 'wtw:' + CACHE_VERSION + ':';
  var LEGACY_PREFIX = 'wtw:';
  var PREF_PREFIX = 'wtw:pref:';

  /* The API regenerates every 30 min behind Cache-Control: max-age=900, so refetching a
     city sooner than 15 min returns a byte-identical file. These TTLs encode that. */
  var TTL = {
    city: 15 * 60 * 1000,
    cities: 24 * 60 * 60 * 1000,
    timezones: 24 * 60 * 60 * 1000,
    /* Open-Meteo recomputes its forecast roughly hourly, so asking more often than that
       returns the same numbers. */
    forecast: 60 * 60 * 1000
  };

  var MAX_CITY_ENTRIES = 80;

  function keyFor(kind, key) { return PREFIX + kind + ':' + key; }

  /* Entry shape: { v: value, t: stored-at ms, a: last-access ms } */
  function read(kind, key) {
    var full = keyFor(kind, key);
    var entry = storage.getJSON(full);
    if (!entry || typeof entry !== 'object' || !('v' in entry) || typeof entry.t !== 'number') {
      return null;
    }
    var ttl = TTL[kind] || TTL.city;
    var age = Date.now() - entry.t;
    entry.a = Date.now();
    storage.setJSON(full, entry);
    return { value: entry.v, storedAt: entry.t, age: age, fresh: age >= 0 && age < ttl };
  }

  function evictOldest(kind, count) {
    var keys = storage.keys(PREFIX + kind + ':');
    var scored = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      var entry = storage.getJSON(keys[i]);
      scored.push({ key: keys[i], at: (entry && (entry.a || entry.t)) || 0 });
    }
    scored.sort(function (a, b) { return a.at - b.at; });
    var removed = 0;
    for (i = 0; i < scored.length && removed < count; i++) {
      storage.remove(scored[i].key);
      removed++;
    }
    return removed;
  }

  function trim() {
    var keys = storage.keys(PREFIX + 'city:');
    if (keys.length > MAX_CITY_ENTRIES) {
      evictOldest('city', keys.length - MAX_CITY_ENTRIES);
    }
  }

  function write(kind, key, value) {
    var entry = { v: value, t: Date.now(), a: Date.now() };
    var full = keyFor(kind, key);

    if (storage.setJSON(full, entry)) {
      if (kind === 'city') { trim(); }
      return true;
    }

    /* Quota hit: drop the least recently used city entries and try once more. A cache
       write is never important enough to fail the request it belongs to. */
    if (evictOldest('city', 10) > 0 && storage.setJSON(full, entry)) { return true; }
    return false;
  }

  /* Remove entries written by an older cache version so they cannot accumulate forever.
     Preferences live under wtw:pref: and survive a cache version bump. */
  function sweepOldVersions() {
    var keys = storage.keys(LEGACY_PREFIX);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(PREFIX) !== 0 && keys[i].indexOf(PREF_PREFIX) !== 0) {
        storage.remove(keys[i]);
      }
    }
  }

  sweepOldVersions();

  WTW.cache = {
    VERSION: CACHE_VERSION,
    TTL: TTL,
    get: read,
    set: write,
    remove: function (kind, key) { storage.remove(keyFor(kind, key)); },
    clear: function () {
      var keys = storage.keys(PREFIX);
      for (var i = 0; i < keys.length; i++) { storage.remove(keys[i]); }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
