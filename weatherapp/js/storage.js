/* storage.js - persistence that can never throw.
   Safari blocks localStorage entirely on file://, and any browser can hit a full quota,
   so every call is probed once and then routed to an in-memory map if that fails. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  var memory = Object.create(null);
  var persistent = false;
  var listeners = [];

  function probe() {
    try {
      var probeKey = 'wtw:probe';
      global.localStorage.setItem(probeKey, '1');
      global.localStorage.removeItem(probeKey);
      return true;
    } catch (err) {
      return false;
    }
  }

  persistent = probe();

  function demote() {
    if (!persistent) { return; }
    persistent = false;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (err) { /* a broken listener must not break storage */ }
    }
  }

  var storage = {
    isPersistent: function () { return persistent; },

    /* Called when we start persistent and are later demoted (quota exhausted mid-session). */
    onFallback: function (fn) { listeners.push(fn); },

    get: function (key) {
      if (persistent) {
        try { return global.localStorage.getItem(key); } catch (err) { demote(); }
      }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },

    set: function (key, value) {
      var str = String(value);
      if (persistent) {
        try {
          global.localStorage.setItem(key, str);
          return true;
        } catch (err) {
          /* QuotaExceededError is the caller's problem to resolve (cache.js evicts and
             retries); anything else means storage is gone and we fall back for good. */
          memory[key] = str;
          if (!isQuotaError(err)) { demote(); }
          return false;
        }
      }
      memory[key] = str;
      return true;
    },

    remove: function (key) {
      if (persistent) {
        try { global.localStorage.removeItem(key); } catch (err) { demote(); }
      }
      delete memory[key];
    },

    /* Every key we own, prefix-filtered. Used by the cache for eviction. */
    keys: function (prefix) {
      var out = [];
      var i;
      if (persistent) {
        try {
          for (i = 0; i < global.localStorage.length; i++) {
            var k = global.localStorage.key(i);
            if (k && (!prefix || k.indexOf(prefix) === 0)) { out.push(k); }
          }
          return out;
        } catch (err) { demote(); }
      }
      for (var key in memory) {
        if (!prefix || key.indexOf(prefix) === 0) { out.push(key); }
      }
      return out;
    },

    getJSON: function (key) {
      var raw = storage.get(key);
      if (raw === null) { return null; }
      try { return JSON.parse(raw); } catch (err) { storage.remove(key); return null; }
    },

    setJSON: function (key, value) {
      try { return storage.set(key, JSON.stringify(value)); } catch (err) { return false; }
    }
  };

  function isQuotaError(err) {
    if (!err) { return false; }
    return err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 || err.code === 1014;
  }

  storage.isQuotaError = isQuotaError;
  WTW.storage = storage;
})(typeof window !== 'undefined' ? window : globalThis);
