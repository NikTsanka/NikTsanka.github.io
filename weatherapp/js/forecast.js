/* forecast.js - the seven-day outlook and the sun times, on a city page.

   The data comes from Open-Meteo rather than worldtimeweather.com, which has no forecast
   endpoint at all. Both are credited in the footer. This module renders; api.js fetches
   and normalize.js maps, exactly as for the first upstream. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var units = WTW.units;
  var weather = WTW.weather;
  var clock = WTW.clock;
  var el = ui.el;

  /* A yyyy-mm-dd string, read as a plain calendar date. Date.parse would treat it as UTC
     midnight and could name the wrong weekday for anyone east or west of Greenwich. */
  function weekday(dateText, index) {
    if (index === 0) { return 'Today'; }
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
    if (!parts) { return '—'; }
    var date = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3]));
    try {
      return new Intl.DateTimeFormat(clock.LOCALE, { weekday: 'short', timeZone: 'UTC' }).format(date);
    } catch (err) {
      return dateText.slice(5);
    }
  }

  function dayLabel(dateText) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
    if (!parts) { return dateText || ''; }
    var date = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3]));
    try {
      return new Intl.DateTimeFormat(clock.LOCALE, {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
      }).format(date);
    } catch (err) { return dateText; }
  }

  /* Sunrise and sunset arrive as local wall clock with no offset ("2026-09-18T06:43"),
     because the request names the city's own zone. Only the time half is displayed, and
     it is re-rendered rather than parsed so no zone maths can shift it. */
  function clockText(isoLocal) {
    var m = /T(\d{2}):(\d{2})/.exec(isoLocal || '');
    if (!m) { return null; }
    var hour = +m[1];
    if (!clock.isHour12()) { return m[1] + ':' + m[2]; }
    var period = hour < 12 ? 'AM' : 'PM';
    var shown = hour % 12 === 0 ? 12 : hour % 12;
    return shown + ':' + m[2] + ' ' + period;
  }

  function dayLength(sunrise, sunset) {
    var a = /T(\d{2}):(\d{2})/.exec(sunrise || '');
    var b = /T(\d{2}):(\d{2})/.exec(sunset || '');
    if (!a || !b) { return null; }
    var minutes = ((+b[1] * 60) + +b[2]) - ((+a[1] * 60) + +a[2]);
    if (minutes < 0) { minutes += 24 * 60; }
    return Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min';
  }

  function temperature(celsius, unit) {
    var value = units.normalTemperature(celsius, unit);
    return value === null ? '—' : value + '°';
  }

  function dayCard(day, index, unit) {
    var item = el('li', 'forecast__day' + (index === 0 ? ' forecast__day--today' : ''));

    item.appendChild(el('p', 'forecast__weekday', weekday(day.date, index)));

    var icon = el('div', 'forecast__icon');
    /* Daytime variant throughout: these are whole days, not moments. */
    icon.appendChild(ui.rawSvg(weather.icon(day.condition, true)));
    item.appendChild(icon);

    var temps = el('p', 'forecast__temps');
    temps.appendChild(el('span', 'forecast__high', temperature(day.tmaxC, unit)));
    temps.appendChild(el('span', 'forecast__low', temperature(day.tminC, unit)));
    item.appendChild(temps);

    item.appendChild(el('p', 'forecast__cond', weather.label(day.condition)));

    var chance = day.precipitationChance;
    var rain = el('p', 'forecast__rain');
    if (typeof chance === 'number') {
      rain.appendChild(ui.svg('<path d="M12 3s5 6.2 5 9.4a5 5 0 0 1-10 0C7 9.2 12 3 12 3Z"/>'));
      rain.appendChild(el('span', null, Math.round(chance) + '%'));
      if (chance < 20) { rain.classList.add('forecast__rain--dry'); }
    } else {
      rain.appendChild(el('span', null, '—'));
    }
    item.appendChild(rain);

    /* The card is a compact summary; the full sentence is the accessible name. */
    item.setAttribute('aria-label', dayLabel(day.date) + ': ' + weather.label(day.condition) +
      ', high ' + temperature(day.tmaxC, unit) + ', low ' + temperature(day.tminC, unit) +
      (typeof chance === 'number' ? ', ' + Math.round(chance) + '% chance of precipitation' : ''));
    return item;
  }

  function sunPanel(today) {
    if (!today || (!today.sunrise && !today.sunset)) { return null; }
    var list = el('dl', 'readout readout--compact');
    var add = function (term, value) {
      list.appendChild(el('dt', 'readout__term', term));
      list.appendChild(el('dd', 'readout__value', value || '—'));
    };
    add('Sunrise', clockText(today.sunrise));
    add('Sunset', clockText(today.sunset));
    add('Daylight', dayLength(today.sunrise, today.sunset));
    if (typeof today.uvIndex === 'number') { add('Peak UV index', String(Math.round(today.uvIndex))); }
    return list;
  }

  function render(forecast, options) {
    var opts = options || {};
    var unit = (opts.settings || {}).temperatureUnit;
    if (!forecast || !forecast.days || forecast.days.length === 0) { return null; }

    var box = el('div', 'forecast');

    var list = el('ul', 'forecast__days');
    list.setAttribute('aria-label', 'Seven day forecast');
    forecast.days.forEach(function (day, i) { list.appendChild(dayCard(day, i, unit)); });

    var scroller = el('div', 'forecast__scroll');
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', 'Seven day forecast, scrolls horizontally');
    scroller.tabIndex = 0;
    scroller.appendChild(list);
    box.appendChild(scroller);

    var sun = sunPanel(forecast.days[0]);
    if (sun) {
      var sunBox = el('div', 'forecast__sun');
      sunBox.appendChild(el('h4', 'forecast__subtitle', 'Sun today'));
      sunBox.appendChild(sun);
      box.appendChild(sunBox);
    }

    box.appendChild(el('p', 'forecast__source',
      'Forecast by Open-Meteo. Temperatures are daily highs and lows in ' +
      (unit === 'f' ? '°F' : '°C') + '.'));
    return box;
  }

  /* Mounts into a placeholder so the detail view can render synchronously and fill in
     when the forecast lands. A failure leaves a quiet line, not a red error: the forecast
     is an extra, and the page is still useful without it. */
  function mount(container, city, options) {
    container.textContent = '';
    var pending = el('p', 'forecast__pending', 'Loading the forecast…');
    container.appendChild(pending);

    return WTW.api.getForecast(city).then(function (res) {
      var node = render(res.data, options);
      container.textContent = '';
      if (node) {
        container.appendChild(node);
        if (res.source === 'stale-cache') {
          container.appendChild(el('p', 'forecast__source', 'Served from a cached copy.'));
        }
      } else {
        container.appendChild(el('p', 'forecast__pending', 'No forecast is available for this city.'));
      }
    }, function (err) {
      container.textContent = '';
      var message = el('p', 'forecast__pending',
        (err && err.message) || 'The forecast could not be loaded.');
      var retry = el('button', 'btn btn--quiet', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', function () { mount(container, city, options); });
      container.appendChild(message);
      container.appendChild(retry);
    });
  }

  WTW.forecast = {
    render: render,
    mount: mount,
    weekday: weekday,
    clockText: clockText,
    dayLength: dayLength
  };
})(typeof window !== 'undefined' ? window : globalThis);
