/* overlap.js - "when can we all actually talk?"

   The planner already lays every city's day on a shared 24-column timeline, so the answer
   is a counting problem: for each column, how many cities are inside their own working
   hours? The best columns are the ones with the highest count.

   TIES ARE REPORTED, NOT HIDDEN. Six cities across Europe, the US and Japan typically
   produce two equally good windows - one that leaves New York asleep and one that leaves
   Tokyo up late - and silently picking the earlier of them made the planner look
   arbitrary: adding a seventh city would flip the answer with no explanation. Every window
   at the top count is returned and marked, longest run first. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Consecutive columns are one window; "10:00 to 17:00" beats listing eight hours. */
  function runsOf(columns) {
    var runs = [];
    var run = [];
    for (var i = 0; i < columns.length; i++) {
      if (run.length && columns[i] === columns[i - 1] + 1) { run.push(columns[i]); }
      else { if (run.length) { runs.push(run); } run = [columns[i]]; }
    }
    if (run.length) { runs.push(run); }
    return runs;
  }

  /* hoursByCity[city][column] is that city's local hour in that column, or null. */
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
    if (top === 0) {
      return { columns: [], runs: [], count: 0, total: cities, counts: counts };
    }

    var winning = [];
    for (c = 0; c < columns; c++) {
      if (counts[c] === top) { winning.push(c); }
    }

    /* A longer window is genuinely more useful than a single hour, so it leads; equal
       runs keep their natural order through the day. */
    var runs = runsOf(winning).sort(function (a, b) {
      return (b.length - a.length) || (a[0] - b[0]);
    });

    return { columns: winning, runs: runs, count: top, total: cities, counts: counts };
  }

  function label(run) {
    var first = run[0];
    var last = run[run.length - 1];
    return run.length === 1
      ? pad(first) + ':00'
      : pad(first) + ':00 to ' + pad((last + 1) % 24) + ':00';
  }

  /* One plain sentence. It names the reference city because the columns are its hours. */
  function describe(result, referenceName) {
    if (!result) { return null; }
    if (result.count === 0) {
      return 'There is no hour when anyone is inside working hours. Widen the working day, ' +
        'or accept that someone will be up late.';
    }

    var who;
    if (result.total === 1) { who = 'the only city is'; }
    else if (result.count === result.total) { who = 'all ' + result.total + ' cities are'; }
    else if (result.count === 1) { who = 'one of ' + result.total + ' cities is'; }
    else { who = result.count + ' of ' + result.total + ' cities are'; }

    var sentence = 'Best overlap: ' + label(result.runs[0]) + ' in ' + referenceName +
      ', when ' + who + ' inside working hours.';

    var others = result.runs.slice(1);
    if (others.length === 0) { return sentence; }

    /* Listing every tie would be noise; naming two and counting the rest is enough to
       show that the first was a choice among equals rather than the only answer. */
    var parts = others.slice(0, 2).map(label);
    var extra = others.length - parts.length;
    if (extra > 0) { parts.push(extra + ' other window' + (extra === 1 ? '' : 's')); }

    var list = parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];

    return sentence + ' ' + list + (parts.length === 1 ? ' works' : ' work') + ' equally well.';
  }

  WTW.overlap = { best: best, describe: describe, label: label };
})(typeof window !== 'undefined' ? window : globalThis);
