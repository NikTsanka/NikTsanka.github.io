/* clock.js - ONE ticker for the whole app.
   A single setInterval walks every registered clock and writes into existing text nodes.
   No per-card timer, and no innerHTML on a tick: re-rendering a card every second would
   destroy focus, restart animations and thrash the layout.

   Time is always computed locally from the IANA zone. The API's `time.iso` is a snapshot
   of when the file was generated, not a clock source, so it is never used here. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;

  /* Pick the display locale once. navigator.language can be undefined or a weird tag,
     so fall back explicitly rather than letting Intl choose per call. */
  var LOCALE = (function () {
    var tag = global.navigator && global.navigator.language;
    if (typeof tag !== 'string' || tag.length < 2) { return 'en-GB'; }
    try { new Intl.DateTimeFormat(tag); return tag; } catch (err) { return 'en-GB'; }
  })();

  var entries = [];
  var timer = null;
  var hour12 = false;
  var formatters = Object.create(null);
  var supported = Object.create(null);

  function zoneSupported(timezone) {
    if (!timezone) { return false; }
    if (timezone in supported) { return supported[timezone]; }
    var ok = false;
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(new Date());
      ok = true;
    } catch (err) { ok = false; }
    supported[timezone] = ok;
    return ok;
  }

  /* hour12 is passed explicitly, together with the matching hourCycle. Relying on the
     locale default would make the 12/24-hour toggle a no-op in some locales. */
  function timeFormatter(timezone) {
    var key = 't|' + timezone + '|' + hour12;
    if (!formatters[key]) {
      formatters[key] = new Intl.DateTimeFormat(LOCALE, {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: hour12, hourCycle: hour12 ? 'h12' : 'h23'
      });
    }
    return formatters[key];
  }

  function dateFormatter(timezone) {
    var key = 'd|' + timezone;
    if (!formatters[key]) {
      formatters[key] = new Intl.DateTimeFormat(LOCALE, {
        timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long'
      });
    }
    return formatters[key];
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Degraded path: the zone is unknown to this browser's Intl, so shift UTC by the
     offset the API reported. Correct until that zone next changes its offset. */
  function offsetParts(offsetSeconds, date) {
    var shifted = new Date(date.getTime() + (offsetSeconds || 0) * 1000);
    var h = shifted.getUTCHours();
    var display = h;
    var period = '';
    if (hour12) {
      period = h < 12 ? 'AM' : 'PM';
      display = h % 12 === 0 ? 12 : h % 12;
    }
    return {
      hour: pad(display), minute: pad(shifted.getUTCMinutes()), second: pad(shifted.getUTCSeconds()),
      period: period, hour24: h
    };
  }

  function intlParts(timezone, date) {
    var parts = timeFormatter(timezone).formatToParts(date);
    var out = { hour: '00', minute: '00', second: '00', period: '', hour24: 0 };
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.type === 'hour') { out.hour = p.value; }
      else if (p.type === 'minute') { out.minute = p.value; }
      else if (p.type === 'second') { out.second = p.value; }
      else if (p.type === 'dayPeriod') { out.period = p.value; }
    }
    out.hour24 = hour12 ? to24(out.hour, out.period) : parseInt(out.hour, 10) || 0;
    return out;
  }

  function to24(hourText, period) {
    var h = parseInt(hourText, 10) || 0;
    var isPm = /p/i.test(period || '');
    if (h === 12) { return isPm ? 12 : 0; }
    return isPm ? h + 12 : h;
  }

  function span(className, text) {
    var el = doc.createElement('span');
    if (className) { el.className = className; }
    el.textContent = text || '';
    return el;
  }

  function tick() {
    var now = new Date();
    for (var i = 0; i < entries.length; i++) {
      render(entries[i], now);
    }
  }

  function render(entry, now) {
    var parts = entry.degraded ? offsetParts(entry.offsetSeconds, now) : intlParts(entry.timezone, now);

    if (entry.secEl.nodeValue !== parts.second) { entry.secEl.nodeValue = parts.second; }

    /* Only touch the hour/minute nodes when they actually change: they sit inside the
       aria-live region, so a needless write would re-announce the same minute. */
    var hm = parts.hour + ':' + parts.minute + '|' + parts.period;
    if (entry.lastHM !== hm) {
      entry.lastHM = hm;
      entry.hourEl.nodeValue = parts.hour;
      entry.minuteEl.nodeValue = parts.minute;
      if (entry.periodEl) { entry.periodEl.textContent = parts.period ? ' ' + parts.period : ''; }

      if (entry.dateEl) {
        var dateText = entry.degraded
          ? new Date(now.getTime() + (entry.offsetSeconds || 0) * 1000).toUTCString().slice(0, 16)
          : dateFormatter(entry.timezone).format(now);
        if (entry.dateEl.textContent !== dateText) { entry.dateEl.textContent = dateText; }
      }

      var phase = WTW.weather.phaseForHour(parts.hour24);
      if (phase !== entry.lastPhase) {
        entry.lastPhase = phase;
        if (entry.onPhase) { entry.onPhase(phase); }
      }
    }
  }

  function start() {
    if (timer === null) { timer = global.setInterval(tick, 1000); }
  }

  function stop() {
    if (timer !== null) { global.clearInterval(timer); timer = null; }
  }

  var clock = {
    LOCALE: LOCALE,
    zoneSupported: zoneSupported,

    /* container: the element carrying aria-live="polite". We build its inner spans so
       this module owns the text nodes it has to update. */
    register: function (container, options) {
      var opts = options || {};
      var degraded = !zoneSupported(opts.timezone);

      var hmEl = span('clock__hm', '');
      var hourNode = doc.createTextNode('00');
      var minuteNode = doc.createTextNode('00');
      hmEl.appendChild(hourNode);
      hmEl.appendChild(span('clock__colon', ':'));
      hmEl.appendChild(minuteNode);

      var secEl = span('clock__sec', '');
      secEl.setAttribute('aria-hidden', 'true');
      var secNode = doc.createTextNode('00');
      secEl.appendChild(doc.createTextNode(':'));
      secEl.appendChild(secNode);

      container.textContent = '';
      container.appendChild(hmEl);
      container.appendChild(secEl);

      /* AM/PM goes after the seconds so the line reads "11:00:34 AM". It stays outside
         the aria-hidden seconds so it is still announced with the minute. */
      var periodEl = null;
      if (hour12) { periodEl = span('clock__suffix', ''); container.appendChild(periodEl); }

      var entry = {
        timezone: opts.timezone,
        offsetSeconds: opts.offsetSeconds || 0,
        degraded: degraded,
        hourEl: hourNode,
        minuteEl: minuteNode,
        periodEl: periodEl,
        secEl: secNode,
        dateEl: opts.dateEl || null,
        onPhase: opts.onPhase || null,
        lastHM: null,
        lastPhase: null
      };

      entries.push(entry);
      render(entry, new Date());
      start();
      return {
        degraded: degraded,
        destroy: function () {
          var i = entries.indexOf(entry);
          if (i >= 0) { entries.splice(i, 1); }
          if (entries.length === 0) { stop(); }
        }
      };
    },

    clear: function () { entries.length = 0; stop(); },

    /* Changing the 12/24-hour setting rebuilds every clock's markup, so ui.js re-renders
       rather than calling this mid-flight. Kept for the Phase 2 settings panel. */
    setHour12: function (value) {
      hour12 = value === true;
      formatters = Object.create(null);
    },

    isHour12: function () { return hour12; },

    /* Exposed for the detail view and (Phase 3) the planner. */
    hourIn: function (timezone, date, offsetSeconds) {
      var d = date || new Date();
      return zoneSupported(timezone) ? intlParts(timezone, d).hour24 : offsetParts(offsetSeconds, d).hour24;
    },

    /* The zone's offset ON A GIVEN DATE, computed by Intl. This is the only correct way
       to ask the question: the API's utc_offset_seconds is today's offset and would be
       wrong on the other side of a DST boundary. Returns seconds, or null if the browser
       does not know the zone. */
    offsetAt: function (timezone, date) {
      if (!zoneSupported(timezone)) { return null; }
      var key = 'o|' + timezone;
      if (!formatters[key]) {
        formatters[key] = new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone, timeZoneName: 'longOffset'
        });
      }
      var parts = formatters[key].formatToParts(date || new Date());
      var name = '';
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') { name = parts[i].value; }
      }
      /* "GMT" alone means UTC; otherwise "GMT+05:45" / "GMT-03:30". */
      var m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
      if (!m) { return /GMT/.test(name) ? 0 : null; }
      var seconds = (parseInt(m[2], 10) * 3600) + (parseInt(m[3] || '0', 10) * 60);
      return m[1] === '-' ? -seconds : seconds;
    },

    /* The viewer's own zone, for the DST comparison. Undefined on very old engines. */
    userTimeZone: function () {
      try {
        var tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === 'string' && tz ? tz : null;
      } catch (err) { return null; }
    },

    longDate: function (timezone, date) {
      if (!zoneSupported(timezone)) { return null; }
      var key = 'l|' + timezone;
      if (!formatters[key]) {
        formatters[key] = new Intl.DateTimeFormat(LOCALE, {
          timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
      }
      return formatters[key].format(date || new Date());
    }
  };

  WTW.clock = clock;
})(typeof window !== 'undefined' ? window : globalThis);
