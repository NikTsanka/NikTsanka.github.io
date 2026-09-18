/* timemath.js - converting between a wall clock and an instant, in a named zone.

   Split out of planner.js only to keep each file inside the ~300 line ceiling. Every
   function here is pure and takes its zone explicitly; none of them reads the API's
   utc_offset_seconds, which is today's offset and wrong across a DST boundary. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var clock = WTW.clock;

  var partsFormatters = Object.create(null);

  /* The wall-clock fields of an instant, in a given zone. The formatter is cached: a
     seven-city grid calls this 175 times per render, and building an Intl.DateTimeFormat
     each time is by far the most expensive thing on the page. */
  function partsIn(zone, ms) {
    var fmt = partsFormatters[zone];
    if (!fmt) {
      fmt = partsFormatters[zone] = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23'
      });
    }
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

  WTW.timemath = {
    partsIn: partsIn,
    instantAt: instantAt,
    dayDelta: dayDelta
  };
})(typeof window !== 'undefined' ? window : globalThis);
