/* detail.js - the single-city view reached through #city=<slug>.
   Not modal: it replaces the dashboard rather than floating over it, so there is no focus
   trap to get wrong. app.js moves focus to the heading on open and back to the card that
   opened it on close. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var units = WTW.units;
  var weather = WTW.weather;
  var clock = WTW.clock;

  var el = ui.el;

  function row(list, term, value) {
    list.appendChild(el('dt', 'readout__term', term));
    list.appendChild(el('dd', 'readout__value', value));
  }

  /* A signed difference between two zones, in hours and minutes - India and Nepal make
     whole-hour formatting wrong. */
  function formatDelta(seconds) {
    if (typeof seconds !== 'number' || !isFinite(seconds)) { return null; }
    if (seconds === 0) { return 'the same time'; }
    var sign = seconds < 0 ? '-' : '+';
    var abs = Math.abs(seconds);
    var h = Math.floor(abs / 3600);
    var m = Math.floor((abs % 3600) / 60);
    return sign + h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  function observedLine(city) {
    var w = city.weather;
    if (!w || typeof w.observedAtMs !== 'number') { return '—'; }
    var age = units.relativeAge(w.observedAtMs);
    var local = null;
    try {
      local = new Intl.DateTimeFormat(clock.LOCALE, {
        timeZone: city.time.timezone, hour: '2-digit', minute: '2-digit',
        hour12: clock.isHour12(), hourCycle: clock.isHour12() ? 'h12' : 'h23'
      }).format(new Date(w.observedAtMs));
    } catch (err) { local = null; }
    /* observed_at is in the CITY's zone, so it is shown in the city's zone. */
    return local ? local + ' local time (' + age + ')' : age;
  }

  /* The January and July offsets come from Intl, computed for those dates, not from the
     API's utc_offset_seconds - that is today's offset and would be wrong on the other
     side of a DST boundary. The API's winter/summer values are only a fallback for a
     zone this browser does not know. */
  function dstBlock(city) {
    var tz = city.time.timezone;
    var dst = city.time.dst;
    var year = new Date().getUTCFullYear();
    var jan = new Date(Date.UTC(year, 0, 15, 12));
    var jul = new Date(Date.UTC(year, 6, 15, 12));

    var janOff = clock.offsetAt(tz, jan);
    var julOff = clock.offsetAt(tz, jul);
    var computed = janOff !== null && julOff !== null;
    if (!computed) {
      janOff = dst.winterOffsetSeconds;
      julOff = dst.summerOffsetSeconds;
    }

    var box = el('section', 'panel');
    box.appendChild(el('h3', 'panel__title', 'Daylight saving'));

    box.appendChild(el('p', 'panel__text', dst.observesDst
      ? city.name + ' observes daylight saving time, so its UTC offset changes during the year.'
      : city.name + ' does not observe daylight saving time. Its UTC offset is the same all year.'));

    var list = el('dl', 'readout readout--compact');
    row(list, 'January ' + year, units.formatOffset(janOff, city.time.utcOffsetLabel));
    row(list, 'July ' + year, units.formatOffset(julOff, city.time.utcOffsetLabel));
    box.appendChild(list);

    if (!computed) {
      box.appendChild(el('p', 'panel__note',
        'This browser does not know the zone ' + (tz || '') + ', so these are the offsets the API reported.'));
    }

    var userZone = clock.userTimeZone();
    if (!userZone) {
      box.appendChild(el('p', 'panel__note',
        'Your browser does not report your own time zone, so the difference cannot be compared.'));
      return box;
    }

    var userJan = clock.offsetAt(userZone, jan);
    var userJul = clock.offsetAt(userZone, jul);
    if (userJan === null || userJul === null || !computed) { return box; }

    var janDelta = janOff - userJan;
    var julDelta = julOff - userJul;

    if (janDelta === julDelta) {
      box.appendChild(el('p', 'panel__text',
        'Against your own zone (' + userZone + ') the difference is ' + formatDelta(janDelta) +
        ' all year.'));
    } else {
      var warn = el('p', 'panel__text panel__text--warn',
        'The difference from your own zone (' + userZone + ') changes during the year: ' +
        formatDelta(janDelta) + ' in January, ' + formatDelta(julDelta) + ' in July. ' +
        'A meeting time that works in one season will not in the other.');
      box.appendChild(warn);
    }
    return box;
  }

  /* "3 degrees warmer than the September average." Both numbers are already on the page:
     the current reading from worldtimeweather.com and the month's normal from the same
     document. No extra request, and it is the one line that turns a bare temperature into
     something a reader can judge.

     The month is the CITY's month, not the viewer's - at the turn of a month those differ
     for a third of the world, and the wrong column would be compared. */
  function versusNormal(city, unit) {
    var w = city.weather;
    if (!w || !city.climate || typeof w.temperatureC !== 'number') { return null; }

    var monthIndex;
    try {
      monthIndex = +new Intl.DateTimeFormat('en-GB', {
        timeZone: city.time.timezone, month: 'numeric'
      }).format(new Date()) - 1;
    } catch (err) { monthIndex = new Date().getUTCMonth(); }

    var month = city.climate.months[monthIndex];
    if (!month || typeof month.tmax !== 'number' || typeof month.tmin !== 'number') { return null; }

    /* The normal is the midpoint of the month's average high and low - the closest thing
       the data has to "a typical temperature right now". */
    var normalC = (month.tmax + month.tmin) / 2;
    var deltaC = w.temperatureC - normalC;
    var name = WTW.chart.MONTHS[monthIndex];
    var normalText = units.normalTemperature(normalC, unit) + '°';

    /* Compared in Celsius, then stated in the chosen unit: a degree of difference is
       bigger in Fahrenheit, so the threshold has to live in one fixed scale. */
    if (Math.abs(deltaC) < 1) {
      return 'About average for ' + name + ', which is usually around ' + normalText + '.';
    }
    var shown = units.normalTemperature(Math.abs(deltaC) * (unit === 'f' ? 9 / 5 : 1), 'c');
    return shown + '° ' + (deltaC > 0 ? 'warmer' : 'colder') + ' than the ' + name +
      ' average of ' + normalText + '.';
  }

  function render(city, options) {
    var opts = options || {};
    var settings = opts.settings || {};
    var w = city.weather;

    var root = el('section', 'detail');
    root.setAttribute('aria-labelledby', 'detail-title');

    var back = el('a', 'detail__back', '← All cities');
    back.href = WTW.router.hashFor(null) || '#';
    root.appendChild(back);

    var head = el('div', 'detail__head');
    var flag = el('span', 'detail__flag', units.flag(city.countryCode));
    flag.setAttribute('aria-hidden', 'true');
    head.appendChild(flag);

    var titles = el('div');
    var title = el('h2', 'detail__title', city.name);
    title.id = 'detail-title';
    title.tabIndex = -1;
    titles.appendChild(title);
    titles.appendChild(el('p', 'detail__zone',
      (city.time.timezone || 'Unknown time zone') + ' · ' +
      units.formatOffset(city.time.utcOffsetSeconds, city.time.utcOffsetLabel)));
    head.appendChild(titles);
    root.appendChild(head);

    var clockBox = el('div', 'clock clock--xl');
    clockBox.setAttribute('aria-live', 'polite');
    clockBox.setAttribute('aria-label', 'Local time in ' + city.name);
    root.appendChild(clockBox);

    var dateLine = el('p', 'detail__date', '');
    root.appendChild(dateLine);

    var chips = el('div', 'chips');
    var handle = clock.register(clockBox, {
      timezone: city.time.timezone,
      offsetSeconds: city.time.utcOffsetSeconds,
      dateEl: dateLine,
      onPhase: function (phase) { root.className = 'detail detail--' + phase; }
    });
    if (handle.degraded) { chips.appendChild(ui.chip('Offset only', 'warn')); }
    var srcChip = ui.sourceChip(opts.source);
    if (srcChip) { chips.appendChild(srcChip); }
    if (ui.isOutOfDate(city)) { chips.appendChild(ui.chip('May be out of date', 'warn')); }
    if (chips.firstChild) { root.appendChild(chips); }

    var weatherPanel = el('section', 'panel');
    weatherPanel.appendChild(el('h3', 'panel__title', 'Current weather'));

    var summary = el('div', 'detail__weather');
    var icon = el('div', 'detail__icon');
    icon.appendChild(ui.rawSvg(weather.icon(w && w.condition, w && w.isDay)));
    summary.appendChild(icon);
    var big = el('div');
    big.appendChild(el('div', 'detail__temp', units.formatTemperature(w, settings.temperatureUnit)));
    big.appendChild(el('div', 'detail__cond', weather.label(w && w.condition)));
    summary.appendChild(big);
    weatherPanel.appendChild(summary);

    var readout = el('dl', 'readout');
    row(readout, 'Feels like', units.formatFeelsLike(w, settings.temperatureUnit));
    row(readout, 'Humidity', units.formatHumidity(w));
    row(readout, 'Wind', units.formatWind(w, settings.windUnit));
    row(readout, 'Observed', observedLine(city));
    row(readout, 'Day or night', w && w.isDay === null ? '—' : (w && w.isDay ? 'Daytime' : 'Night'));
    weatherPanel.appendChild(readout);

    var comparison = versusNormal(city, settings.temperatureUnit);
    if (comparison) { weatherPanel.appendChild(el('p', 'detail__normal', comparison)); }

    root.appendChild(weatherPanel);

    /* The forecast comes from a second upstream and arrives later, so it mounts into a
       placeholder rather than holding up the rest of the page. */
    var forecastPanel = el('section', 'panel');
    forecastPanel.appendChild(el('h3', 'panel__title', 'Forecast'));
    var forecastSlot = el('div');
    forecastPanel.appendChild(forecastSlot);
    root.appendChild(forecastPanel);
    WTW.forecast.mount(forecastSlot, city, { settings: settings });

    root.appendChild(dstBlock(city));

    /* Climate normals are optional in the schema, so the panel is omitted rather than
       rendered empty when a city has none. */
    var chart = WTW.chart.climate(city.climate, settings);
    if (chart) {
      var climatePanel = el('section', 'panel');
      climatePanel.appendChild(el('h3', 'panel__title', 'Climate normals'));
      climatePanel.appendChild(chart);
      root.appendChild(climatePanel);
    }

    var page = WTW.api.pageUrl(city);
    if (page) {
      var out = el('a', 'detail__out', 'Open the full ' + city.name + ' page on worldtimeweather.com');
      out.href = page;
      out.rel = 'noopener';
      root.appendChild(out);
    }

    root.__clock = handle;
    return root;
  }

  WTW.detail = { render: render, formatDelta: formatDelta, versusNormal: versusNormal };
})(typeof window !== 'undefined' ? window : globalThis);
