/* planner.js - the meeting planner.

   THE RULE THAT SHAPES THIS FILE: every offset here is computed with Intl for the DATE
   BEING PLANNED, never taken from the API's time.utc_offset_seconds. That value is the
   offset *today*. Plan a call for a date on the other side of a DST boundary and it is
   wrong by an hour - and wrong differently for each city, which is exactly the mistake a
   meeting planner exists to prevent. clock.offsetAt(zone, date) is the only source. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var ui = WTW.ui;
  var clock = WTW.clock;
  var units = WTW.units;

  var PREF_KEY = 'wtw:pref:planner';
  var DEFAULTS = { workStart: '09:00', workEnd: '18:00' };
  var el = ui.el;

  var prefs = readPrefs();
  var reference = null;     // slug of the city the chosen time is expressed in
  var cities = [];          // [{ slug, name, countryCode, timezone }]

  function readPrefs() {
    var stored = WTW.storage.getJSON(PREF_KEY);
    var out = { workStart: DEFAULTS.workStart, workEnd: DEFAULTS.workEnd };
    if (stored && typeof stored === 'object') {
      if (isTime(stored.workStart)) { out.workStart = stored.workStart; }
      if (isTime(stored.workEnd)) { out.workEnd = stored.workEnd; }
    }
    return out;
  }

  function isTime(value) { return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value); }
  function toMinutes(value) {
    var m = /^(\d{2}):(\d{2})$/.exec(value);
    return m ? (parseInt(m[1], 10) * 60) + parseInt(m[2], 10) : 0;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- time maths ---------- */

  /* The wall-clock fields of an instant, in a given zone. */
  function partsIn(zone, ms) {
    var fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23'
    });
    var out = {};
    fmt.formatToParts(new Date(ms)).forEach(function (p) {
      if (p.type !== 'literal') { out[p.type] = p.value; }
    });
    return {
      year: +out.year, month: +out.month, day: +out.day,
      hour: +out.hour, minute: +out.minute,
      dateKey: out.year + '-' + out.month + '-' + out.day,
      hhmm: out.hour + ':' + out.minute
    };
  }

  /* The instant at which a given wall clock reads in a given zone. Solved by guessing
     UTC, measuring the zone's offset at that guess and correcting - twice, because the
     first correction can itself land on the other side of a DST transition. */
  function instantAt(zone, y, mo, d, hh, mi) {
    var guess = Date.UTC(y, mo - 1, d, hh, mi);
    var offset = clock.offsetAt(zone, new Date(guess));
    if (offset === null) { return guess; }
    var ts = guess - (offset * 1000);
    offset = clock.offsetAt(zone, new Date(ts));
    return offset === null ? ts : guess - (offset * 1000);
  }

  /* Whole days between two local dates, so the +1 / -1 marker is exact rather than a
     rounded hour difference. */
  function dayDelta(a, b) {
    var da = Date.UTC(a.year, a.month - 1, a.day);
    var db = Date.UTC(b.year, b.month - 1, b.day);
    return Math.round((da - db) / 86400000);
  }

  /* ---------- band colouring ---------- */

  function bandFor(hour, startH, endH) {
    if (hour < 6 || hour >= 22) { return 'night'; }
    if (hour >= startH && hour < endH) { return 'work'; }
    if (hour >= endH) { return 'evening'; }
    return 'morning';
  }

  var BAND_LABEL = { night: 'night', morning: 'early morning', work: 'working hours', evening: 'evening' };

  /* ---------- rendering ---------- */

  function field(labelText, input) {
    var label = el('label', 'field');
    label.appendChild(el('span', 'field__label', labelText));
    label.appendChild(input);
    return label;
  }

  function input(type, value, onDone) {
    var node = el('input', 'field__input');
    node.type = type;
    node.value = value;
    node.addEventListener('change', function () { if (node.value) { onDone(node.value); } });
    return node;
  }

  function controls(state, onChange) {
    var form = el('form', 'planner__controls');
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    var startInput, endInput;
    function saveHours() {
      if (!isTime(startInput.value) || !isTime(endInput.value)) { return; }
      prefs = { workStart: startInput.value, workEnd: endInput.value };
      WTW.storage.setJSON(PREF_KEY, prefs);
      onChange({});
    }
    startInput = input('time', prefs.workStart, saveHours);
    endInput = input('time', prefs.workEnd, saveHours);

    var refSelect = el('select', 'field__input');
    cities.forEach(function (city) {
      var option = el('option', null, city.name);
      option.value = city.slug;
      if (city.slug === state.reference) { option.selected = true; }
      refSelect.appendChild(option);
    });
    refSelect.addEventListener('change', function () { onChange({ reference: refSelect.value }); });

    form.appendChild(field('Date', input('date', state.date, function (v) { onChange({ date: v }); })));
    form.appendChild(field('Time', input('time', state.time, function (v) { onChange({ time: v }); })));
    form.appendChild(field('In the time zone of', refSelect));
    form.appendChild(field('Working hours from', startInput));
    form.appendChild(field('to', endInput));

    var now = el('button', 'btn btn--quiet', 'Now');
    now.type = 'button';
    now.addEventListener('click', function () { onChange(nowState(state.reference)); });
    form.appendChild(now);
    return form;
  }

  function legend() {
    var list = el('ul', 'legend');
    ['work', 'evening', 'morning', 'night'].forEach(function (band) {
      var item = el('li', 'legend__item');
      var swatch = el('span', 'legend__swatch legend__swatch--' + band);
      swatch.setAttribute('aria-hidden', 'true');
      item.appendChild(swatch);
      item.appendChild(el('span', null, BAND_LABEL[band]));
      list.appendChild(item);
    });
    return list;
  }

  function grid(state) {
    var startH = Math.floor(toMinutes(prefs.workStart) / 60);
    var endH = Math.ceil(toMinutes(prefs.workEnd) / 60);
    var refCity = cities.filter(function (c) { return c.slug === state.reference; })[0] || cities[0];
    var refTime = state.time.split(':');
    var refDate = state.date.split('-');

    /* One absolute instant, derived once from the reference city's wall clock. Every
       column below is that instant plus N hours, so a column is the same moment
       everywhere - which is what makes overlapping working hours readable. */
    var base = instantAt(refCity.timezone, +refDate[0], +refDate[1], +refDate[2],
      +refTime[0], +refTime[1]);
    var midnight = instantAt(refCity.timezone, +refDate[0], +refDate[1], +refDate[2], 0, 0);
    var refParts = partsIn(refCity.timezone, base);
    var refOffset = clock.offsetAt(refCity.timezone, new Date(base));

    var table = el('table', 'grid');
    var caption = el('caption', 'grid__caption',
      'Local time in each city when it is ' + state.time + ' on ' + state.date + ' in ' + refCity.name +
      '. Each column is one hour of ' + refCity.name + "'s day.");
    table.appendChild(caption);

    var head = el('thead');
    var headRow = el('tr');
    headRow.appendChild(el('th', 'grid__corner', 'City'));
    for (var h = 0; h < 24; h++) {
      var th = el('th', 'grid__hour', pad(h));
      th.scope = 'col';
      headRow.appendChild(th);
    }
    head.appendChild(headRow);
    table.appendChild(head);

    var body = el('tbody');
    cities.forEach(function (city) {
      body.appendChild(cityRow(city, base, midnight, refParts, refOffset, startH, endH));
    });
    table.appendChild(body);
    return table;
  }

  function cityRow(city, base, midnight, refParts, refOffset, startH, endH) {
    var row = el('tr');
    var here = partsIn(city.timezone, base);
    var offset = clock.offsetAt(city.timezone, new Date(base));
    var delta = (offset === null || refOffset === null) ? null : offset - refOffset;
    var days = dayDelta(here, refParts);

    var header = el('th', 'grid__city');
    header.scope = 'row';
    header.appendChild(el('span', 'grid__city-name', city.name));

    var when = el('span', 'grid__city-time', here.hhmm);
    if (days !== 0) {
      /* The local date differs from the reference date - the classic meeting mistake. */
      var marker = el('span', 'grid__day', (days > 0 ? '+' : '−') + Math.abs(days) + ' day');
      when.appendChild(marker);
    }
    header.appendChild(when);
    header.appendChild(el('span', 'grid__city-meta',
      units.formatOffset(offset, null) + (delta === null ? '' : ' · ' + WTW.detail.formatDelta(delta))));
    row.appendChild(header);

    for (var h = 0; h < 24; h++) {
      var cellParts = partsIn(city.timezone, midnight + (h * 3600000));
      var band = bandFor(cellParts.hour, startH, endH);
      var cell = el('td', 'cell cell--' + band, pad(cellParts.hour));
      /* Non-integer offsets mean the hour number alone hides the minutes, so the exact
         local time goes in the accessible name and the tooltip. */
      cell.title = city.name + ' ' + cellParts.hhmm + ' (' + BAND_LABEL[band] + ')';
      cell.setAttribute('aria-label', city.name + ' ' + cellParts.hhmm + ', ' + BAND_LABEL[band]);
      if (cellParts.minute !== 0) { cell.classList.add('cell--offbeat'); }
      row.appendChild(cell);
    }
    return row;
  }

  function nowState(referenceSlug) {
    var zone = (cities.filter(function (c) { return c.slug === referenceSlug; })[0] || cities[0] || {}).timezone;
    var parts = partsIn(zone || 'UTC', Date.now());
    return {
      date: parts.year + '-' + pad(parts.month) + '-' + pad(parts.day),
      time: pad(parts.hour) + ':' + pad(parts.minute)
    };
  }

  var state = null;

  function render(container, index, slugs) {
    cities = slugs.map(function (slug) { return index && index.bySlug[slug]; })
      .filter(function (city) { return city && city.timezone; });

    container.textContent = '';
    var section = el('section', 'view');
    section.setAttribute('aria-labelledby', 'planner-title');
    var title = el('h2', 'view__title', 'Meeting planner');
    title.id = 'planner-title';
    title.tabIndex = -1;
    section.appendChild(title);

    if (cities.length < 2) {
      section.appendChild(ui.state({
        icon: 'empty', title: 'Add at least two cities',
        text: 'The planner compares the cities on your dashboard. Add another one from the search box.',
        linkLabel: '← Back to all cities', linkHref: WTW.router.hashFor(null) || '#'
      }));
      container.appendChild(section);
      return;
    }

    if (!state || !cities.some(function (c) { return c.slug === state.reference; })) {
      reference = cities[0].slug;
      state = nowState(reference);
      state.reference = reference;
    }

    var update = function (patch) {
      Object.keys(patch).forEach(function (key) { state[key] = patch[key]; });
      render(container, index, slugs);
    };

    section.appendChild(controls(state, update));

    var scroller = el('div', 'grid__scroll');
    scroller.setAttribute('role', 'region');
    scroller.setAttribute('aria-label', 'Hour-by-hour comparison, scrolls horizontally');
    scroller.tabIndex = 0;
    scroller.appendChild(grid(state));
    section.appendChild(scroller);
    section.appendChild(legend());

    container.appendChild(section);
  }

  WTW.planner = {
    render: render,
    partsIn: partsIn,
    instantAt: instantAt,
    dayDelta: dayDelta,
    bandFor: bandFor,
    prefs: function () { return { workStart: prefs.workStart, workEnd: prefs.workEnd }; },
    reset: function () { state = null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
