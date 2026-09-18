/* overlap.js - "when can we all actually talk?"

   The planner already lays every city's day on a shared 24-column timeline, so the answer
   is a counting problem: for each column, how many cities are inside their own working
   hours? The best columns are the ones with the highest count.

   Ties are kept as a run rather than collapsed to a single hour - "13:00 to 16:00" is a
   more useful answer than "13:00", and a caller who wants one hour can take the first. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* hoursByCity[city][column] is that city's local hour in that column, or null.
     Returns the longest run of columns that share the highest count. */
  function best(hoursByCity, startH, endH) {
    var cities = hoursByCity.length;
    if (cities === 0) { return null; }
    var columns = hoursByCity[0].length;

    var counts = [];
    var c, h;
    for (c = 0; c < columns; c++) {
      var n = 0;
      for (h = 0; h < cities; h++) {
        var hour = hoursByCity[h][c];
        if (typeof hour === 'number' && hour >= startH && hour < endH) { n++; }
      }
      counts.push(n);
    }

    var top = Math.max.apply(null, counts);
    if (top === 0) { return { columns: [], count: 0, total: cities, counts: counts }; }

    /* The longest unbroken run at the top count, so a scattered tie does not win over a
       genuine window. */
    var bestRun = [];
    var run = [];
    for (c = 0; c < columns; c++) {
      if (counts[c] === top) {
        run.push(c);
        if (run.length > bestRun.length) { bestRun = run.slice(); }
      } else {
        run = [];
      }
    }
    return { columns: bestRun, count: top, total: cities, counts: counts };
  }

  /* One plain sentence. It names the reference city because the columns are its hours. */
  function describe(result, referenceName) {
    if (!result) { return null; }
    if (result.count === 0) {
      return 'There is no hour when anyone is inside working hours. Widen the working day, ' +
        'or accept that someone will be up late.';
    }

    var first = result.columns[0];
    var last = result.columns[result.columns.length - 1];
    var window = result.columns.length === 1
      ? pad(first) + ':00'
      : pad(first) + ':00 to ' + pad((last + 1) % 24) + ':00';

    var who;
    if (result.total === 1) { who = 'the only city is'; }
    else if (result.count === result.total) { who = 'all ' + result.total + ' cities are'; }
    else if (result.count === 1) { who = 'one of ' + result.total + ' cities is'; }
    else { who = result.count + ' of ' + result.total + ' cities are'; }

    return 'Best overlap: ' + window + ' in ' + referenceName + ', when ' + who +
      ' inside working hours.';
  }

  WTW.overlap = { best: best, describe: describe };
})(typeof window !== 'undefined' ? window : globalThis);
