/* air.js - current air quality on a city page.

   A third origin (air-quality-api.open-meteo.com), keyless and HTTPS with
   Access-Control-Allow-Origin: *, so it behaves like the forecast host. It is the last
   one; see the README's "Known limitations".

   The European AQI is used for the banding because its scale is fixed and published:
   0-20 good, 20-40 fair, and so on up to 100+. The raw index is always shown next to the
   word, because "Fair" alone is an opinion and the number is the fact. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var ui = WTW.ui;
  var el = ui.el;

  var BANDS = [
    { max: 20, key: 'good', label: 'Good' },
    { max: 40, key: 'fair', label: 'Fair' },
    { max: 60, key: 'moderate', label: 'Moderate' },
    { max: 80, key: 'poor', label: 'Poor' },
    { max: 100, key: 'very-poor', label: 'Very poor' },
    { max: Infinity, key: 'extreme', label: 'Extremely poor' }
  ];

  function bandFor(aqi) {
    if (typeof aqi !== 'number' || !isFinite(aqi)) { return null; }
    for (var i = 0; i < BANDS.length; i++) {
      if (aqi < BANDS[i].max) { return BANDS[i]; }
    }
    return BANDS[BANDS.length - 1];
  }

  function render(air) {
    var band = air && bandFor(air.europeanAqi);
    if (!band) { return null; }

    var box = el('div', 'air air--' + band.key);

    var headline = el('p', 'air__headline');
    headline.appendChild(el('span', 'air__badge', band.label));
    headline.appendChild(el('span', 'air__index', 'European AQI ' + Math.round(air.europeanAqi)));
    box.appendChild(headline);

    var parts = [];
    if (typeof air.pm25 === 'number') { parts.push('PM2.5 ' + air.pm25 + ' µg/m³'); }
    if (typeof air.pm10 === 'number') { parts.push('PM10 ' + air.pm10 + ' µg/m³'); }
    if (typeof air.usAqi === 'number') { parts.push('US AQI ' + Math.round(air.usAqi)); }
    if (parts.length) { box.appendChild(el('p', 'air__detail', parts.join(' · '))); }

    box.setAttribute('aria-label', 'Air quality: ' + band.label +
      ', European AQI ' + Math.round(air.europeanAqi) +
      (parts.length ? '. ' + parts.join(', ') : ''));
    return box;
  }

  /* Air quality is a bonus reading, so a failure leaves nothing behind rather than an
     error: the slot collapses and the page reads as if the feature were not there. */
  function mount(container, city) {
    return WTW.api.getAir(city).then(function (res) {
      if (!container.isConnected) { return; }
      var node = render(res.data);
      if (node) {
        container.appendChild(el('h4', 'air__title', 'Air quality'));
        container.appendChild(node);
      }
    }, function () { /* silent by design */ });
  }

  WTW.air = { render: render, mount: mount, bandFor: bandFor, BANDS: BANDS };
})(typeof window !== 'undefined' ? window : globalThis);
