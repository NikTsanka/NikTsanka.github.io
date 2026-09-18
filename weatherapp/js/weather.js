/* weather.js - condition key -> human label + inline SVG icon.
   The API documents 20 condition keys and says new ones may appear, so every lookup
   funnels through get(), which falls back to `unknown` rather than rendering an empty
   slot. Icons are inline SVG using currentColor: no icon font, no image request. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  var OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var CLOSE = '</svg>';

  var CLOUD = '<path d="M7.5 18a3.5 3.5 0 0 1-.3-6.99A5 5 0 0 1 17 11.2 3.4 3.4 0 0 1 16.6 18Z"/>';
  var CLOUD_HIGH = '<path d="M7.5 15a3.2 3.2 0 0 1-.3-6.39A4.6 4.6 0 0 1 16.4 8.8 3.1 3.1 0 0 1 16 15Z"/>';
  var SUN_CORE = '<circle cx="12" cy="12" r="4"/>';
  var SUN_RAYS = '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>';
  var MOON = '<path d="M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z"/>';
  var SUN_SMALL = '<circle cx="8.5" cy="7.5" r="2.6"/><path d="M8.5 2.6v1.4M8.5 11v1.4M3.6 7.5H5M12 7.5h1.4M5 4 6 5M11 10l1 1M12 4l-1 1M6 10 5 11"/>';
  var MOON_SMALL = '<path d="M12.4 8.2A3.6 3.6 0 0 1 8 3.8a3.8 3.8 0 1 0 4.4 4.4Z"/>';

  function drops(count) {
    var xs = count === 1 ? [12] : count === 2 ? [9.5, 14.5] : [8, 12, 16];
    var out = '';
    for (var i = 0; i < xs.length; i++) {
      out += '<path d="M' + xs[i] + ' 19.5v.6"/>';
    }
    return out;
  }

  function rainLines(count) {
    var xs = count === 1 ? [12] : count === 2 ? [9.5, 14.5] : [8, 12, 16];
    var out = '';
    for (var i = 0; i < xs.length; i++) {
      out += '<path d="M' + xs[i] + ' 19.2 ' + (xs[i] - 1) + ' 22"/>';
    }
    return out;
  }

  function flakes(count) {
    var xs = count === 1 ? [12] : count === 2 ? [9.5, 14.5] : [8, 12, 16];
    var out = '';
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      out += '<path d="M' + x + ' 19v3M' + (x - 1.3) + ' 19.8l2.6 1.4M' + (x + 1.3) + ' 19.8l-2.6 1.4"/>';
    }
    return out;
  }

  var GLYPHS = {
    sun: SUN_CORE + SUN_RAYS,
    moon: MOON,
    'sun-cloud': SUN_SMALL + CLOUD,
    'moon-cloud': MOON_SMALL + CLOUD,
    'partly-day': SUN_SMALL + CLOUD,
    'partly-night': MOON_SMALL + CLOUD,
    overcast: CLOUD_HIGH + '<path d="M9 18h9"/>',
    fog: CLOUD_HIGH + '<path d="M5 18h9M8 21h10"/>',
    'rime-fog': CLOUD_HIGH + '<path d="M5 18h9M8 21h10"/><path d="M12 6.5v2M11 7l2 1M13 7l-2 1"/>',
    'drizzle-1': CLOUD + drops(1),
    'drizzle-2': CLOUD + drops(2),
    'drizzle-3': CLOUD + drops(3),
    'rain-1': CLOUD + rainLines(1),
    'rain-2': CLOUD + rainLines(2),
    'rain-3': CLOUD + rainLines(3),
    'snow-1': CLOUD + flakes(1),
    'snow-2': CLOUD + flakes(2),
    'snow-3': CLOUD + flakes(3),
    showers: CLOUD + '<path d="M9.5 19l-1.2 3M14.5 19l-1.2 3"/>',
    'showers-violent': CLOUD + '<path d="M8 19l-1.4 3.4M12 19l-1.4 3.4M16 19l-1.4 3.4"/>',
    /* Kept inside the 0 0 24 24 viewBox: an earlier bolt reached y=25 and had its tail
       clipped off at every size. */
    storm: CLOUD + '<path d="M13 18.5 10.8 21.4h2.4L11.2 23.8"/>',
    'storm-hail': CLOUD + '<path d="M13.5 18.4 11 21.6h2.6"/><circle cx="8.6" cy="20.8" r=".7"/><circle cx="16" cy="21.4" r=".7"/>',
    unknown: CLOUD_HIGH + '<path d="M10.6 19.4a1.5 1.5 0 1 1 1.9 1.5v.8"/><path d="M12.5 23.2v.1"/>'
  };

  /* condition key -> { label, day glyph, night glyph }. Night variants exist only where
     the sky itself is visible; a rain cloud looks the same at midnight. */
  var CONDITIONS = {
    clear:             { label: 'Clear', day: 'sun', night: 'moon' },
    mainly_clear:      { label: 'Mainly clear', day: 'sun-cloud', night: 'moon-cloud' },
    partly_cloudy:     { label: 'Partly cloudy', day: 'partly-day', night: 'partly-night' },
    overcast:          { label: 'Overcast', day: 'overcast' },
    fog:               { label: 'Fog', day: 'fog' },
    rime_fog:          { label: 'Freezing fog', day: 'rime-fog' },
    light_drizzle:     { label: 'Light drizzle', day: 'drizzle-1' },
    drizzle:           { label: 'Drizzle', day: 'drizzle-2' },
    heavy_drizzle:     { label: 'Heavy drizzle', day: 'drizzle-3' },
    light_rain:        { label: 'Light rain', day: 'rain-1' },
    rain:              { label: 'Rain', day: 'rain-2' },
    heavy_rain:        { label: 'Heavy rain', day: 'rain-3' },
    light_snow:        { label: 'Light snow', day: 'snow-1' },
    snow:              { label: 'Snow', day: 'snow-2' },
    heavy_snow:        { label: 'Heavy snow', day: 'snow-3' },
    rain_showers:      { label: 'Rain showers', day: 'showers' },
    violent_showers:   { label: 'Violent showers', day: 'showers-violent' },
    thunderstorm:      { label: 'Thunderstorm', day: 'storm' },
    thunderstorm_hail: { label: 'Thunderstorm with hail', day: 'storm-hail' },
    unknown:           { label: 'Unknown conditions', day: 'unknown' }
  };

  /* Open-Meteo reports raw WMO codes rather than the string keys worldtimeweather.com
     emits, so the forecast needs this bridge. Every pairing below that the live API
     exercises was confirmed against it in the Phase 0 survey (0 clear, 1 mainly_clear,
     2 partly_cloudy, 3 overcast, 45 fog, 51/53/55 drizzle, 61 light_rain, 80/81
     rain_showers, 95 thunderstorm, 96 thunderstorm_hail); the rest follow the WMO table.
     Freezing and grain variants fold into their nearest mapped key rather than inventing
     icons that the current-weather path would never use. */
  var WMO = {
    0: 'clear', 1: 'mainly_clear', 2: 'partly_cloudy', 3: 'overcast',
    45: 'fog', 48: 'rime_fog',
    51: 'light_drizzle', 53: 'drizzle', 55: 'heavy_drizzle',
    56: 'light_drizzle', 57: 'drizzle',
    61: 'light_rain', 63: 'rain', 65: 'heavy_rain',
    66: 'light_rain', 67: 'rain',
    71: 'light_snow', 73: 'snow', 75: 'heavy_snow', 77: 'light_snow',
    80: 'rain_showers', 81: 'rain_showers', 82: 'violent_showers',
    85: 'light_snow', 86: 'heavy_snow',
    95: 'thunderstorm', 96: 'thunderstorm_hail', 99: 'thunderstorm_hail'
  };

  function get(condition) {
    var key = typeof condition === 'string' ? condition : 'unknown';
    return Object.prototype.hasOwnProperty.call(CONDITIONS, key) ? CONDITIONS[key] : CONDITIONS.unknown;
  }

  WTW.weather = {
    CONDITIONS: CONDITIONS,
    keys: Object.keys(CONDITIONS),

    has: function (condition) {
      return Object.prototype.hasOwnProperty.call(CONDITIONS, condition);
    },

    label: function (condition) { return get(condition).label; },

    /* An unknown or absent code degrades to `unknown`, never to an empty slot. */
    fromWmo: function (code) {
      return Object.prototype.hasOwnProperty.call(WMO, code) ? WMO[code] : 'unknown';
    },

    WMO: WMO,

    /* isDay drives the day/night icon variant; unmapped keys degrade to `unknown`. */
    icon: function (condition, isDay) {
      var entry = get(condition);
      var name = (isDay === false && entry.night) ? entry.night : entry.day;
      return OPEN + (GLYPHS[name] || GLYPHS.unknown) + CLOSE;
    },

    /* Local hour -> card tint band. Purely cosmetic, but it must never be undefined. */
    phaseForHour: function (hour) {
      if (typeof hour !== 'number' || !isFinite(hour)) { return 'day'; }
      if (hour >= 5 && hour < 8) { return 'dawn'; }
      if (hour >= 8 && hour < 17) { return 'day'; }
      if (hour >= 17 && hour < 20) { return 'dusk'; }
      return 'night';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
