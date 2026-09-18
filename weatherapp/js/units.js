/* units.js - the only place a number turns into display text.
   The API already ships both unit systems for live weather (temperature_c/_f,
   feels_like_c/_f, wind_speed_kmh/_mph), so nothing there is converted - we just pick.
   Climate normals are the one genuine exception: tmax / tmin / prcp are metric-only in
   the API, so their imperial forms have to be computed, and this file is where. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var DASH = '—';
  var DEG = '°';

  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  function round(n, places) {
    if (!isNum(n)) { return null; }
    var f = Math.pow(10, places || 0);
    return Math.round(n * f) / f;
  }

  function cToF(c) { return isNum(c) ? (c * 9 / 5) + 32 : null; }
  function mmToIn(mm) { return isNum(mm) ? mm / 25.4 : null; }

  function pick(metric, imperial, useMetric) {
    var value = useMetric ? metric : imperial;
    return isNum(value) ? value : null;
  }

  var units = {
    round: round,
    cToF: cToF,
    mmToIn: mmToIn,

    temperature: function (weather, unit) {
      var v = pick(weather && weather.temperatureC, weather && weather.temperatureF, unit !== 'f');
      return v === null ? null : { value: round(v, 0), suffix: DEG + (unit === 'f' ? 'F' : 'C') };
    },

    feelsLike: function (weather, unit) {
      var v = pick(weather && weather.feelsLikeC, weather && weather.feelsLikeF, unit !== 'f');
      return v === null ? null : { value: round(v, 0), suffix: DEG + (unit === 'f' ? 'F' : 'C') };
    },

    wind: function (weather, unit) {
      var v = pick(weather && weather.windKmh, weather && weather.windMph, unit !== 'mph');
      return v === null ? null : { value: round(v, 0), suffix: unit === 'mph' ? 'mph' : 'km/h' };
    },

    formatTemperature: function (weather, unit) {
      var t = units.temperature(weather, unit);
      return t ? t.value + t.suffix : DASH;
    },

    formatFeelsLike: function (weather, unit) {
      var t = units.feelsLike(weather, unit);
      return t ? t.value + t.suffix : DASH;
    },

    formatWind: function (weather, unit) {
      var w = units.wind(weather, unit);
      return w ? w.value + ' ' + w.suffix : DASH;
    },

    formatHumidity: function (weather) {
      var h = weather && weather.humidityPercent;
      return isNum(h) ? round(h, 0) + '%' : DASH;
    },

    /* Climate normals only - see the file header for why conversion is unavoidable here. */
    normalTemperature: function (celsius, unit) {
      var v = unit === 'f' ? cToF(celsius) : celsius;
      return isNum(v) ? round(v, 0) : null;
    },

    normalPrecipitation: function (mm, unit) {
      var v = unit === 'f' ? mmToIn(mm) : mm;
      return isNum(v) ? round(v, 1) : null;
    },

    relativeAge: function (fromMs, toMs) {
      if (!isNum(fromMs)) { return null; }
      var diff = Math.round(((isNum(toMs) ? toMs : Date.now()) - fromMs) / 60000);
      if (diff < 1) { return 'just now'; }
      if (diff < 60) { return diff + ' min ago'; }
      var hours = Math.round(diff / 60);
      if (hours < 24) { return hours + (hours === 1 ? ' hour ago' : ' hours ago'); }
      var days = Math.round(hours / 24);
      return days + (days === 1 ? ' day ago' : ' days ago');
    },

    /* The API writes offsets unpadded ("UTC+4", "UTC+5:45", bare "UTC"). Pad them so a
       column of offsets lines up, and keep the API's own label as the fallback. */
    formatOffset: function (offsetSeconds, fallbackLabel) {
      if (!isNum(offsetSeconds)) { return fallbackLabel || 'UTC'; }
      var sign = offsetSeconds < 0 ? '-' : '+';
      var abs = Math.abs(offsetSeconds);
      var h = Math.floor(abs / 3600);
      var m = Math.floor((abs % 3600) / 60);
      return 'UTC' + sign + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },

    /* Regional-indicator pair from an ISO-3166 alpha-2 code. No image requests. */
    flag: function (countryCode) {
      if (typeof countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(countryCode)) {
        return '🏳';
      }
      var cc = countryCode.toUpperCase();
      return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
    }
  };

  WTW.units = units;
})(typeof window !== 'undefined' ? window : globalThis);
