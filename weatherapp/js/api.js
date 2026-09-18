/* api.js - every network request in the app, and the cache/stale/fixture fallback chain.
   Resolution order for each resource:
     fresh cache -> network -> stale cache (labelled) -> bundled fixtures (labelled).
   A caller never sees a rejected promise for a *data* problem: it gets an envelope with
   `source` and `error` so the UI can render a designed state instead of a blank screen. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var cache = WTW.cache;
  var normalize = WTW.normalize;

  var BASE = 'https://worldtimeweather.com/api/v1/';
  var TIMEOUT_MS = 12000;

  var inflight = Object.create(null);

  function apiError(kind, message, status) {
    return { kind: kind, message: message, status: status || null };
  }

  function fixtures() {
    return global.WTW_FIXTURES || null;
  }

  /* fetch() rejects with a bare TypeError for a DNS failure, a dropped connection AND a
     blocked CORS preflight alike - the browser deliberately does not tell scripts which.
     We report it as one "could not reach" kind and let the UI mention both causes. */
  function fetchJson(url) {
    if (global.navigator && global.navigator.onLine === false) {
      return Promise.reject(apiError('offline', 'The browser reports no network connection.'));
    }

    var controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    var timer = global.setTimeout(function () {
      if (controller) { controller.abort(); }
    }, TIMEOUT_MS);

    return global.fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'default',
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (res.status === 404) {
        throw apiError('notfound', 'That city is not in the API index.', 404);
      }
      if (!res.ok) {
        throw apiError('http', 'The API answered with HTTP ' + res.status + '.', res.status);
      }
      return res.json().catch(function () {
        throw apiError('parse', 'The API returned something that is not JSON.');
      });
    }).catch(function (err) {
      if (err && err.kind) { throw err; }
      if (err && err.name === 'AbortError') {
        throw apiError('network', 'The API did not answer within ' + (TIMEOUT_MS / 1000) + ' seconds.');
      }
      throw apiError('network', 'Could not reach the API - the network is down, or the ' +
        'browser blocked the request because the API did not send a CORS header.');
    }).then(function (json) {
      global.clearTimeout(timer);
      return json;
    }, function (err) {
      global.clearTimeout(timer);
      throw err;
    });
  }

  function envelope(data, source, error, storedAt) {
    return {
      data: data,
      source: source,
      error: error || null,
      storedAt: storedAt || null,
      isStale: source === 'stale-cache' || source === 'fixtures'
    };
  }

  /* One shared promise per in-flight URL: two cards asking for the same city, or a
     refresh landing on top of a load, must not produce two requests. */
  function once(key, factory) {
    if (inflight[key]) { return inflight[key]; }
    var p = factory().then(function (value) {
      delete inflight[key];
      return value;
    }, function (err) {
      delete inflight[key];
      throw err;
    });
    inflight[key] = p;
    return p;
  }

  function load(kind, cacheKey, url, mapper, fixtureGetter, force) {
    var cached = cache.get(kind, cacheKey);

    if (cached && cached.fresh && !force) {
      return Promise.resolve(envelope(mapper(cached.value), 'cache', null, cached.storedAt));
    }

    return once(url, function () { return fetchJson(url); })
      .then(function (raw) {
        var mapped = mapper(raw);
        if (!mapped) { throw apiError('parse', 'The API response did not match the expected shape.'); }
        cache.set(kind, cacheKey, raw);
        return envelope(mapped, 'network', null, Date.now());
      })
      .catch(function (err) {
        /* A 404 is an answer, not a failure to reach the API: never paper over it. */
        if (err && err.kind === 'notfound') { throw err; }

        if (cached) {
          return envelope(mapper(cached.value), 'stale-cache', err, cached.storedAt);
        }
        var fixture = fixtureGetter();
        if (fixture) {
          var mappedFixture = mapper(fixture);
          if (mappedFixture) { return envelope(mappedFixture, 'fixtures', err, null); }
        }
        throw err;
      });
  }

  WTW.api = {
    BASE: BASE,

    citiesUrl: function () { return BASE + 'cities.json'; },
    timezonesUrl: function () { return BASE + 'timezones.json'; },
    /* Slugs are not all bare words - the index contains "st.-john's-ag" - so encode. */
    cityUrl: function (slug) { return BASE + 'city/' + encodeURIComponent(slug) + '.json'; },
    pageUrl: function (city) { return (city && city.pages && city.pages.en) || null; },

    getCities: function (force) {
      return load('cities', 'index', WTW.api.citiesUrl(), normalize.cities, function () {
        var f = fixtures();
        return f ? f.cities : null;
      }, force);
    },

    getTimezones: function (force) {
      return load('timezones', 'index', WTW.api.timezonesUrl(), normalize.timezones, function () {
        var f = fixtures();
        return f ? f.timezones : null;
      }, force);
    },

    getCity: function (slug, force) {
      return load('city', slug, WTW.api.cityUrl(slug), normalize.city, function () {
        var f = fixtures();
        return f && f.city ? (f.city[slug] || null) : null;
      }, force);
    },

    error: apiError
  };
})(typeof window !== 'undefined' ? window : globalThis);
