/* normalize.js - the single boundary between raw API JSON and the rest of the app.
   Nothing outside this file may read an API field name. When the upstream schema moves,
   only this file and the cache version change.

   Verified against the live API on 2026-09-18 (413 cities):
   - cities.json and timezones.json are envelopes; their payload sits under `.data`
     (the docs describe only the payload).
   - weather ships both unit systems, including feels_like_f and wind_speed_mph.
   - time.iso and weather.observed_at always carry an explicit +HH:MM / -HH:MM offset.
   - climate_normals was present on every city, and carries an extra `note` string. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function str(v) { return typeof v === 'string' && v !== '' ? v : null; }
  function bool(v) { return typeof v === 'boolean' ? v : null; }

  var HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/;

  function offsetSuffix(offsetSeconds) {
    var sign = offsetSeconds < 0 ? '-' : '+';
    var abs = Math.abs(offsetSeconds);
    var h = Math.floor(abs / 3600);
    var m = Math.floor((abs % 3600) / 60);
    return sign + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* observed_at is documented as a timestamp in the CITY's local zone. Every live sample
     carried an explicit offset, so Date.parse is correct - but if the API ever drops it,
     `new Date(s)` would silently read the string as local to the VIEWER and the "updated
     N min ago" line would be wrong by the difference between the two zones. So when no
     offset is present we append the city's own offset before parsing. */
  function parseInCity(value, offsetSeconds) {
    var s = str(value);
    if (!s) { return null; }
    var text = HAS_OFFSET.test(s) ? s : (s + offsetSuffix(num(offsetSeconds) || 0));
    var ms = Date.parse(text);
    return isFinite(ms) ? ms : null;
  }

  /* Diacritic- and case-insensitive folding, used for search matching only. */
  function fold(value) {
    var s = typeof value === 'string' ? value : '';
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    return s.toLowerCase();
  }

  function cityRow(raw) {
    if (!raw || typeof raw !== 'object') { return null; }
    var slug = str(raw.slug);
    var name = str(raw.name);
    if (!slug || !name) { return null; }
    var country = str(raw.country_code) || '';
    return {
      slug: slug,
      name: name,
      countryCode: country.toUpperCase(),
      timezone: str(raw.timezone),
      url: str(raw.url),
      foldedName: fold(name),
      foldedCode: fold(country)
    };
  }

  function cities(raw) {
    var list = [];
    var data = raw && raw.data;
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        var row = cityRow(data[i]);
        if (row) { list.push(row); }
      }
    }
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return {
      version: str(raw && raw.version),
      generatedAt: str(raw && raw.generated_at),
      list: list,
      bySlug: list.reduce(function (acc, row) { acc[row.slug] = row; return acc; }, Object.create(null))
    };
  }

  function timezones(raw) {
    var zones = Object.create(null);
    var data = raw && raw.data;
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (zone) {
        if (Array.isArray(data[zone])) {
          zones[zone] = data[zone].filter(function (s) { return typeof s === 'string'; });
        }
      });
    }
    return {
      version: str(raw && raw.version),
      generatedAt: str(raw && raw.generated_at),
      zones: zones,
      names: Object.keys(zones).sort()
    };
  }

  function weather(raw, offsetSeconds) {
    if (!raw || typeof raw !== 'object') { return null; }
    var condition = str(raw.condition);
    return {
      temperatureC: num(raw.temperature_c),
      temperatureF: num(raw.temperature_f),
      feelsLikeC: num(raw.feels_like_c),
      feelsLikeF: num(raw.feels_like_f),
      humidityPercent: num(raw.humidity_percent),
      windKmh: num(raw.wind_speed_kmh),
      windMph: num(raw.wind_speed_mph),
      /* Unmapped keys are kept verbatim for diagnostics; weather.js does the fallback. */
      condition: condition && WTW.weather.has(condition) ? condition : 'unknown',
      rawCondition: condition,
      wmoCode: num(raw.wmo_code),
      isDay: bool(raw.is_day),
      observedAt: str(raw.observed_at),
      observedAtMs: parseInCity(raw.observed_at, offsetSeconds),
      stale: raw.stale === true
    };
  }

  function climate(raw) {
    if (!raw || typeof raw !== 'object' || !raw.months) { return null; }
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var src = raw.months[String(m)];
      months.push(src ? {
        month: m,
        tmax: num(src.tmax),
        tmin: num(src.tmin),
        prcp: num(src.prcp),
        wet: num(src.wet)
      } : { month: m, tmax: null, tmin: null, prcp: null, wet: null });
    }
    return { period: str(raw.period), note: str(raw.note), months: months };
  }

  function city(raw) {
    if (!raw || typeof raw !== 'object' || !str(raw.slug)) { return null; }
    var time = raw.time || {};
    var dst = time.dst || {};
    var offsetSeconds = num(time.utc_offset_seconds);
    var coords = raw.coordinates || {};

    return {
      slug: str(raw.slug),
      name: str(raw.name) || str(raw.slug),
      countryCode: (str(raw.country_code) || '').toUpperCase(),
      coordinates: { latitude: num(coords.latitude), longitude: num(coords.longitude) },
      time: {
        timezone: str(time.timezone),
        iso: str(time.iso),
        utcOffsetSeconds: offsetSeconds,
        /* API label is unpadded ("UTC+5:45"); units.formatOffset pads it for display. */
        utcOffsetLabel: str(time.utc_offset),
        dst: {
          observesDst: dst.observes_dst === true,
          winterOffsetSeconds: num(dst.winter_offset_seconds),
          summerOffsetSeconds: num(dst.summer_offset_seconds)
        }
      },
      weather: weather(raw.weather, offsetSeconds),
      climate: climate(raw.climate_normals),
      pages: raw.page && typeof raw.page === 'object' ? raw.page : {},
      generatedAt: str(raw.generated_at),
      generatedAtMs: (function () {
        var ms = Date.parse(str(raw.generated_at) || '');
        return isFinite(ms) ? ms : null;
      })()
    };
  }

  /* Open-Meteo's daily forecast. A SECOND upstream shape, so it gets the same treatment
     as the first: nothing outside this file reads an Open-Meteo field name either.

     It answers with parallel arrays rather than a list of objects, and every array is
     optional, so each day is assembled by index with a missing value becoming null.
     Temperatures are metric-only here (we ask for Celsius explicitly), which is why
     units.js converts them - the same exception as the climate normals. */
  function forecast(raw) {
    var daily = raw && raw.daily;
    if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) { return null; }

    var at = function (array, i) {
      return Array.isArray(array) && isFinite(array[i]) && array[i] !== null ? array[i] : null;
    };
    var text = function (array, i) {
      return Array.isArray(array) && typeof array[i] === 'string' ? array[i] : null;
    };

    var days = [];
    for (var i = 0; i < daily.time.length; i++) {
      var code = at(daily.weather_code, i);
      days.push({
        date: text(daily.time, i),
        condition: WTW.weather.fromWmo(code),
        wmoCode: code,
        tmaxC: at(daily.temperature_2m_max, i),
        tminC: at(daily.temperature_2m_min, i),
        precipitationChance: at(daily.precipitation_probability_max, i),
        precipitationMm: at(daily.precipitation_sum, i),
        uvIndex: at(daily.uv_index_max, i),
        /* Sunrise and sunset come back as local wall clock with no offset, because we
           asked for the city's own zone. Kept as text: they are only ever displayed. */
        sunrise: text(daily.sunrise, i),
        sunset: text(daily.sunset, i)
      });
    }

    return {
      timezone: str(raw.timezone),
      utcOffsetSeconds: num(raw.utc_offset_seconds),
      elevation: num(raw.elevation),
      days: days
    };
  }

  WTW.normalize = {
    cities: cities,
    timezones: timezones,
    city: city,
    forecast: forecast,
    fold: fold,
    parseInCity: parseInCity
  };
})(typeof window !== 'undefined' ? window : globalThis);
