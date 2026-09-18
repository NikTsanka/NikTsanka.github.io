/* hourly.js - the next 24 hours as a compact inline-SVG sparkline.

   The hours ride along in the same Open-Meteo request as the seven-day outlook, so this
   view costs no extra network traffic at all.

   Deliberately no tooltip: the temperature is printed on the line every third hour, which
   answers the question a tooltip would, without a hover-only interaction. The full set of
   numbers is in the visually-hidden table, exactly as in the climate chart. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var units = WTW.units;
  var el = ui.el;

  var NS = 'http://www.w3.org/2000/svg';
  var W = 720, H = 152;
  var PAD = { top: 24, right: 14, bottom: 28, left: 14 };
  var PLOT_W = W - PAD.left - PAD.right;
  var TEMP_H = 62;                       /* the band the temperature line lives in */
  var RAIN_TOP = PAD.top + TEMP_H + 12;  /* precipitation bars hang below it */
  var RAIN_H = H - PAD.bottom - RAIN_TOP;
  var LABEL_EVERY = 3;

  function svgEl(name, attrs) {
    var node = doc.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  /* "2026-09-18T15:00" -> "15" or "3 PM". Sliced, never parsed: the string is already the
     city's own wall clock, and parsing would invite a zone shift. */
  function hourLabel(time, hour12) {
    var m = /T(\d{2}):/.exec(time || '');
    if (!m) { return ''; }
    var hour = +m[1];
    if (!hour12) { return m[1]; }
    return (hour % 12 === 0 ? 12 : hour % 12) + (hour < 12 ? ' AM' : ' PM');
  }

  function prepare(hours, unit) {
    var rows = hours.map(function (h, i) {
      return {
        index: i,
        time: h.time,
        temp: units.normalTemperature(h.tempC, unit),
        chance: isNum(h.precipitationChance) ? Math.round(h.precipitationChance) : null,
        condition: h.condition
      };
    });
    var temps = rows.map(function (r) { return r.temp; }).filter(isNum);
    var min = temps.length ? Math.min.apply(null, temps) : 0;
    var max = temps.length ? Math.max.apply(null, temps) : 1;
    /* A flat day would otherwise collapse the line onto a single row of pixels. */
    if (max - min < 2) { max = min + 2; }
    return {
      rows: rows,
      min: min - 1,
      max: max + 1,
      unit: unit === 'f' ? '°F' : '°C',
      anyRain: rows.some(function (r) { return r.chance !== null && r.chance > 0; })
    };
  }

  function buildSvg(data, hour12) {
    var band = PLOT_W / data.rows.length;
    var span = (data.max - data.min) || 1;
    var x = function (i) { return PAD.left + (i + 0.5) * band; };
    var y = function (t) { return PAD.top + TEMP_H - ((t - data.min) / span) * TEMP_H; };

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H, class: 'hourly__svg',
      preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false'
    });

    /* Precipitation bars first, so the temperature line always sits on top. */
    data.rows.forEach(function (row, i) {
      if (row.chance === null || row.chance === 0) { return; }
      var height = Math.max(1.5, (row.chance / 100) * RAIN_H);
      svg.appendChild(svgEl('rect', {
        class: 'hourly__bar', x: x(i) - band * 0.3, width: band * 0.6,
        y: RAIN_TOP + RAIN_H - height, height: height, rx: 1.5
      }));
    });
    svg.appendChild(svgEl('line', {
      class: 'hourly__baseline', x1: PAD.left, x2: PAD.left + PLOT_W,
      y1: RAIN_TOP + RAIN_H, y2: RAIN_TOP + RAIN_H
    }));

    var points = data.rows
      .filter(function (r) { return isNum(r.temp); })
      .map(function (r) { return x(r.index) + ',' + y(r.temp); });

    if (points.length > 1) {
      svg.appendChild(svgEl('path', {
        class: 'hourly__area',
        d: 'M' + points[0].split(',')[0] + ',' + (PAD.top + TEMP_H) +
          ' L' + points.join(' L') +
          ' L' + points[points.length - 1].split(',')[0] + ',' + (PAD.top + TEMP_H) + ' Z'
      }));
      svg.appendChild(svgEl('path', { class: 'hourly__line', d: 'M' + points.join(' L') }));
    }

    data.rows.forEach(function (row, i) {
      var labelled = i % LABEL_EVERY === 0;

      if (isNum(row.temp) && labelled) {
        svg.appendChild(svgEl('circle', {
          class: 'hourly__dot' + (i === 0 ? ' hourly__dot--now' : ''),
          cx: x(i), cy: y(row.temp), r: i === 0 ? 3.4 : 2.4
        }));
        var value = svgEl('text', { class: 'hourly__value', x: x(i), y: y(row.temp) - 8 });
        value.textContent = row.temp + '°';
        svg.appendChild(value);
      }

      if (labelled) {
        var hour = svgEl('text', {
          class: 'hourly__hour' + (i === 0 ? ' hourly__hour--now' : ''),
          x: x(i), y: H - 9
        });
        hour.textContent = i === 0 ? 'Now' : hourLabel(row.time, hour12);
        svg.appendChild(hour);
      }
    });

    return svg;
  }

  function buildTable(data, hour12) {
    var wrap = el('div', 'visually-hidden');
    var table = el('table');
    table.appendChild(el('caption', null,
      'The next ' + data.rows.length + ' hours. Temperature in ' + data.unit +
      ', and the chance of precipitation.'));

    var head = el('thead');
    var headRow = el('tr');
    ['Hour', 'Temperature', 'Chance of precipitation'].forEach(function (text) {
      var th = el('th', null, text);
      th.scope = 'col';
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = el('tbody');
    data.rows.forEach(function (row, i) {
      var tr = el('tr');
      var th = el('th', null, i === 0 ? 'Now' : hourLabel(row.time, hour12));
      th.scope = 'row';
      tr.appendChild(th);
      tr.appendChild(el('td', null, isNum(row.temp) ? row.temp + data.unit : 'no data'));
      tr.appendChild(el('td', null, row.chance === null ? 'no data' : row.chance + '%'));
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  /* Returns null when there are no hours, so the caller omits the section entirely. */
  function render(hours, options) {
    if (!Array.isArray(hours) || hours.length < 2) { return null; }
    var opts = options || {};
    var hour12 = WTW.clock.isHour12();
    var data = prepare(hours, (opts.settings || {}).temperatureUnit);

    var box = el('figure', 'hourly');
    box.appendChild(el('figcaption', 'hourly__caption',
      data.anyRain
        ? 'Temperature and the chance of precipitation, hour by hour.'
        : 'Temperature hour by hour. No precipitation expected.'));

    var plot = el('div', 'hourly__plot');
    plot.appendChild(buildSvg(data, hour12));
    box.appendChild(plot);
    box.appendChild(buildTable(data, hour12));
    return box;
  }

  WTW.hourly = { render: render, prepare: prepare, hourLabel: hourLabel };
})(typeof window !== 'undefined' ? window : globalThis);
