/* chart.js - the climate-normals chart, hand-written inline SVG. No chart library.

   The SVG is aria-hidden and paired with a visually-hidden <table> carrying exactly the
   same numbers. That table is the accessible version AND the fallback if the SVG does not
   render, which is why the numbers are formatted once, up front, and used by both. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var units = WTW.units;
  var el = ui.el;

  var NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  var W = 720, H = 300;
  var PAD = { top: 14, right: 46, bottom: 26, left: 40 };
  var PLOT_W = W - PAD.left - PAD.right;
  var PLOT_H = H - PAD.top - PAD.bottom;

  function svgEl(name, attrs) {
    var node = doc.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  /* Axis bounds that land on round numbers. Picking the step first, then snapping the
     bounds outwards to a multiple of it, is what keeps the gridline labels readable -
     dividing the raw range into four gives ticks like 9, 18, 26. */
  var STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500];

  function niceStep(rough) {
    for (var i = 0; i < STEPS.length; i++) {
      if (rough <= STEPS[i]) { return STEPS[i]; }
    }
    return STEPS[STEPS.length - 1];
  }

  function niceScale(min, max, targetTicks) {
    var span = (max - min) || 1;
    var step = niceStep(span / targetTicks);
    return {
      min: Math.floor(min / step) * step,
      max: Math.ceil(max / step) * step,
      step: step
    };
  }

  /* Every number the chart and the table both need, converted once. */
  function prepare(climate, unit) {
    var tempUnit = unit === 'f' ? '°F' : '°C';
    var rainUnit = unit === 'f' ? 'in' : 'mm';
    /* "rainfall in in" reads badly, so prose uses the long form and values the short. */
    var rainUnitLong = unit === 'f' ? 'inches' : 'millimetres';
    var rows = climate.months.map(function (m, i) {
      return {
        index: i,
        name: MONTHS[i],
        short: SHORT[i],
        tmax: units.normalTemperature(m.tmax, unit),
        tmin: units.normalTemperature(m.tmin, unit),
        prcp: units.normalPrecipitation(m.prcp, unit),
        wet: isNum(m.wet) ? Math.round(m.wet) : null
      };
    });
    var temps = [];
    var rains = [];
    rows.forEach(function (r) {
      if (isNum(r.tmax)) { temps.push(r.tmax); }
      if (isNum(r.tmin)) { temps.push(r.tmin); }
      if (isNum(r.prcp)) { rains.push(r.prcp); }
    });
    var temp = niceScale(
      temps.length ? Math.min.apply(null, temps) : 0,
      temps.length ? Math.max.apply(null, temps) : 10, 4);
    var rain = niceScale(0, rains.length ? Math.max.apply(null, rains) : 1, 4);

    return {
      rows: rows,
      tempUnit: tempUnit,
      rainUnit: rainUnit,
      rainUnitLong: rainUnitLong,
      tempMin: temp.min, tempMax: temp.max, tempStep: temp.step,
      rainMax: rain.max, rainStep: rain.step
    };
  }

  function buildSvg(data, tip) {
    var band = PLOT_W / 12;
    var tempSpan = (data.tempMax - data.tempMin) || 1;
    var tempY = function (v) { return PAD.top + PLOT_H - ((v - data.tempMin) / tempSpan) * PLOT_H; };
    var rainY = function (v) { return PAD.top + PLOT_H - (v / (data.rainMax || 1)) * PLOT_H; };
    var centre = function (i) { return PAD.left + (i + 0.5) * band; };

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H, class: 'chart__svg',
      preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false'
    });

    /* Gridlines follow the temperature scale; the rainfall axis is labelled on its own
       round steps, so neither axis is forced onto the other's tick positions. */
    var value;
    for (value = data.tempMin; value <= data.tempMax + 1e-9; value += data.tempStep) {
      var y = tempY(value);
      svg.appendChild(svgEl('line', {
        class: 'chart__grid', x1: PAD.left, x2: PAD.left + PLOT_W, y1: y, y2: y
      }));
      var label = svgEl('text', { class: 'chart__axis chart__axis--left', x: PAD.left - 6, y: y + 4 });
      label.textContent = Math.round(value * 10) / 10;
      svg.appendChild(label);
    }
    for (value = 0; value <= data.rainMax + 1e-9; value += data.rainStep) {
      var rainLabel = svgEl('text', {
        class: 'chart__axis chart__axis--right', x: PAD.left + PLOT_W + 6, y: rainY(value) + 4
      });
      rainLabel.textContent = Math.round(value * 10) / 10;
      svg.appendChild(rainLabel);
    }

    /* Precipitation bars sit behind the temperature band. */
    data.rows.forEach(function (row, i) {
      if (!isNum(row.prcp)) { return; }
      var top = rainY(row.prcp);
      svg.appendChild(svgEl('rect', {
        class: 'chart__bar', x: centre(i) - band * 0.26, width: band * 0.52,
        y: top, height: Math.max(0, PAD.top + PLOT_H - top), rx: 2
      }));
    });

    /* The tmax/tmin band: forward along the highs, back along the lows. */
    var top = [], bottom = [];
    data.rows.forEach(function (row, i) {
      if (isNum(row.tmax)) { top.push(centre(i) + ',' + tempY(row.tmax)); }
      if (isNum(row.tmin)) { bottom.unshift(centre(i) + ',' + tempY(row.tmin)); }
    });
    if (top.length && bottom.length) {
      svg.appendChild(svgEl('path', {
        class: 'chart__band', d: 'M' + top.join(' L') + ' L' + bottom.join(' L') + ' Z'
      }));
    }
    if (top.length) { svg.appendChild(svgEl('path', { class: 'chart__line chart__line--max', d: 'M' + top.join(' L') })); }
    if (bottom.length) {
      svg.appendChild(svgEl('path', {
        class: 'chart__line chart__line--min', d: 'M' + bottom.slice().reverse().join(' L')
      }));
    }

    /* Month labels, then one transparent hit area per month on top of everything. */
    data.rows.forEach(function (row, i) {
      var month = svgEl('text', { class: 'chart__month', x: centre(i), y: H - 8 });
      month.textContent = row.short;
      svg.appendChild(month);

      var marker = svgEl('line', {
        class: 'chart__marker', x1: centre(i), x2: centre(i),
        y1: PAD.top, y2: PAD.top + PLOT_H, opacity: 0
      });
      svg.appendChild(marker);

      var hit = svgEl('rect', {
        class: 'chart__hit', x: PAD.left + i * band, width: band,
        y: PAD.top, height: PLOT_H
      });
      /* pointerenter covers the mouse; pointerdown covers a tap, which never fires an
         enter on its own on iOS. Both land on the same handler. */
      var show = function (event) {
        event.preventDefault();
        tip.show(row, data, centre(i) / W);
        svg.querySelectorAll('.chart__marker').forEach(function (m) { m.setAttribute('opacity', 0); });
        marker.setAttribute('opacity', 1);
      };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointerdown', show);
      svg.appendChild(hit);
    });

    svg.addEventListener('pointerleave', function () {
      tip.hide();
      svg.querySelectorAll('.chart__marker').forEach(function (m) { m.setAttribute('opacity', 0); });
    });

    return svg;
  }

  function makeTip(container) {
    var node = el('div', 'chart__tip');
    node.setAttribute('aria-hidden', 'true');
    node.hidden = true;
    container.appendChild(node);

    return {
      node: node,
      hide: function () { node.hidden = true; },
      show: function (row, data, fraction) {
        node.textContent = '';
        node.appendChild(el('strong', null, row.name));
        var list = el('dl', 'chart__tip-list');
        var add = function (term, value) {
          list.appendChild(el('dt', null, term));
          list.appendChild(el('dd', null, value));
        };
        add('High', isNum(row.tmax) ? row.tmax + data.tempUnit : '—');
        add('Low', isNum(row.tmin) ? row.tmin + data.tempUnit : '—');
        add('Rainfall', isNum(row.prcp) ? row.prcp + ' ' + data.rainUnit : '—');
        add('Wet days', isNum(row.wet) ? String(row.wet) : '—');
        node.appendChild(list);
        node.hidden = false;
        /* Clamped so the tooltip never leaves the plot at either edge. */
        node.style.left = Math.min(88, Math.max(12, fraction * 100)) + '%';
      }
    };
  }

  /* The table goes inside a visually-hidden DIV rather than wearing the class itself:
     width:1px does not shrink a <table>, which sizes to its content, and setting
     display:block on it would strip the table semantics screen readers depend on. */
  function buildTable(data, period) {
    var wrap = el('div', 'visually-hidden');
    var table = el('table');
    var caption = el('caption', null,
      'Monthly climate normals' + (period ? ' for ' + period : '') +
      '. Temperatures in ' + data.tempUnit + ', rainfall in ' + data.rainUnitLong + '.');
    table.appendChild(caption);

    var head = el('thead');
    var headRow = el('tr');
    ['Month', 'Average high', 'Average low', 'Rainfall', 'Wet days'].forEach(function (text) {
      var th = el('th', null, text);
      th.scope = 'col';
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = el('tbody');
    data.rows.forEach(function (row) {
      var tr = el('tr');
      var th = el('th', null, row.name);
      th.scope = 'row';
      tr.appendChild(th);
      tr.appendChild(el('td', null, isNum(row.tmax) ? row.tmax + data.tempUnit : 'no data'));
      tr.appendChild(el('td', null, isNum(row.tmin) ? row.tmin + data.tempUnit : 'no data'));
      tr.appendChild(el('td', null, isNum(row.prcp) ? row.prcp + ' ' + data.rainUnit : 'no data'));
      tr.appendChild(el('td', null, isNum(row.wet) ? String(row.wet) : 'no data'));
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function legend(data) {
    var list = el('ul', 'chart__legend');
    [
      ['band', 'High to low (' + data.tempUnit + ', left axis)'],
      ['bar', 'Rainfall (' + data.rainUnit + ', right axis)']
    ].forEach(function (pair) {
      var item = el('li', 'chart__legend-item');
      var swatch = el('span', 'chart__swatch chart__swatch--' + pair[0]);
      swatch.setAttribute('aria-hidden', 'true');
      item.appendChild(swatch);
      item.appendChild(el('span', null, pair[1]));
      list.appendChild(item);
    });
    return list;
  }

  /* Returns null when there are no normals, so the caller simply omits the panel.
     No city in the live API lacked them, so this path is defensive rather than observed. */
  function climate(climateData, options) {
    if (!climateData || !climateData.months || climateData.months.length !== 12) { return null; }
    var opts = options || {};
    var data = prepare(climateData, opts.temperatureUnit);

    var figure = el('figure', 'chart');
    figure.appendChild(el('figcaption', 'chart__caption',
      'Monthly averages' + (climateData.period ? ', ' + climateData.period : '') +
      ' · temperature in ' + data.tempUnit + ', rainfall in ' + data.rainUnitLong));

    var plot = el('div', 'chart__plot');
    var tip = makeTip(plot);
    plot.insertBefore(buildSvg(data, tip), tip.node);
    figure.appendChild(plot);
    figure.appendChild(legend(data));
    figure.appendChild(buildTable(data, climateData.period));
    if (climateData.note) { figure.appendChild(el('p', 'chart__note', climateData.note)); }
    return figure;
  }

  WTW.chart = { climate: climate, prepare: prepare, MONTHS: MONTHS };
})(typeof window !== 'undefined' ? window : globalThis);
