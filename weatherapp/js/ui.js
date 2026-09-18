/* ui.js - DOM construction and search matching. Builds nodes, never strings, except for
   the inline SVG we author ourselves. Nothing here fetches or stores anything. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var units = WTW.units;
  var weather = WTW.weather;
  var normalize = WTW.normalize;

  var STALE_AFTER_MS = 2 * 60 * 60 * 1000;

  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function svg(markup) {
    var holder = el('span');
    holder.innerHTML = markup;
    return holder.firstChild;
  }

  function chip(text, modifier) {
    return el('span', 'chip' + (modifier ? ' chip--' + modifier : ''), text);
  }

  /* ---------- skeletons ---------- */

  function skeletonCard() {
    var card = el('article', 'card skeleton');
    card.setAttribute('aria-hidden', 'true');
    var sizes = [[52, 14], [150, 40], [110, 12], [90, 26], [140, 12]];
    for (var i = 0; i < sizes.length; i++) {
      var bar = el('div', 'skeleton__bar');
      bar.style.width = sizes[i][0] + 'px';
      bar.style.height = sizes[i][1] + 'px';
      card.appendChild(bar);
    }
    return card;
  }

  /* ---------- states ---------- */

  var STATE_ICONS = {
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5"/><path d="M12 16.5v.1"/><circle cx="12" cy="12" r="9"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
    offline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 8a14 14 0 0 1 16 0M7.5 11.5a9 9 0 0 1 9 0M10.5 15a4.5 4.5 0 0 1 3 0M12 19v.1"/><path d="m3 3 18 18"/></svg>'
  };

  function state(options) {
    var opts = options || {};
    var box = el('div', 'state' + (opts.tone ? ' state--' + opts.tone : ''));
    box.setAttribute('role', opts.tone === 'error' ? 'alert' : 'status');

    var icon = el('div', 'state__icon');
    icon.appendChild(svg(STATE_ICONS[opts.icon] || STATE_ICONS.empty));
    box.appendChild(icon);
    box.appendChild(el('h3', 'state__title', opts.title || 'Something went wrong'));
    if (opts.text) { box.appendChild(el('p', 'state__text', opts.text)); }

    if (opts.actionLabel && typeof opts.onAction === 'function') {
      var btn = el('button', 'btn', opts.actionLabel);
      btn.type = 'button';
      btn.addEventListener('click', opts.onAction);
      box.appendChild(btn);
    }
    if (opts.linkLabel && opts.linkHref) {
      var link = el('a', null, opts.linkLabel);
      link.href = opts.linkHref;
      box.appendChild(link);
    }
    return box;
  }

  /* Maps an api.js error envelope onto a designed state. Every branch has a Retry. */
  function stateForError(error, onRetry) {
    var kind = (error && error.kind) || 'network';
    if (kind === 'offline') {
      return state({
        tone: 'error', icon: 'offline', title: 'You are offline',
        text: 'Showing nothing rather than something wrong. Reconnect and try again.',
        actionLabel: 'Retry', onAction: onRetry
      });
    }
    if (kind === 'notfound') {
      return state({
        tone: 'error', icon: 'error', title: 'City not found',
        text: 'The API has no entry with that slug. It may have been renamed.',
        actionLabel: 'Retry', onAction: onRetry
      });
    }
    if (kind === 'http') {
      return state({
        tone: 'error', icon: 'error', title: 'The API is not answering properly',
        text: (error && error.message) || 'The API returned an error response.',
        actionLabel: 'Retry', onAction: onRetry
      });
    }
    return state({
      tone: 'error', icon: 'error', title: 'Could not reach the API',
      text: (error && error.message) || 'The request failed.',
      actionLabel: 'Retry', onAction: onRetry
    });
  }

  function notice(text, onDismiss) {
    var box = el('div', 'notice');
    box.appendChild(el('p', null, text));
    var btn = el('button', 'icon-btn icon-btn--bare', null);
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Dismiss this notice');
    btn.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'));
    btn.addEventListener('click', function () {
      box.remove();
      if (typeof onDismiss === 'function') { onDismiss(); }
    });
    box.appendChild(btn);
    return box;
  }

  /* ---------- city card ---------- */

  function card(city, options) {
    var opts = options || {};
    var settings = opts.settings || {};
    var w = city.weather;

    var root = el('article', 'card');
    root.dataset.slug = city.slug;

    var head = el('div', 'card__head');
    /* Regional-indicator pair. Windows has no flag glyphs and falls back to the two
       letters, which is why the country code is not repeated in the line below. */
    var flag = el('span', 'card__flag', units.flag(city.countryCode));
    flag.setAttribute('aria-hidden', 'true');
    head.appendChild(flag);

    var names = el('div', 'card__names');
    names.appendChild(el('h3', 'card__name', city.name));
    names.appendChild(el('p', 'card__zone', city.time.timezone || 'Unknown time zone'));
    head.appendChild(names);

    if (typeof opts.onRemove === 'function') {
      var remove = el('button', 'icon-btn icon-btn--bare card__remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove ' + city.name);
      remove.appendChild(svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'));
      remove.addEventListener('click', function () { opts.onRemove(city.slug); });
      head.appendChild(remove);
    }
    root.appendChild(head);

    /* Live region announces the minute; clock.js hides the seconds from it. */
    var clockBox = el('div', 'clock');
    clockBox.setAttribute('aria-live', 'polite');
    clockBox.setAttribute('aria-label', 'Local time in ' + city.name);
    root.appendChild(clockBox);

    var dateLine = el('p', 'card__date', '');
    root.appendChild(dateLine);

    var chips = el('div', 'chips');
    chips.appendChild(chip(units.formatOffset(city.time.utcOffsetSeconds, city.time.utcOffsetLabel)));

    var handle = WTW.clock.register(clockBox, {
      timezone: city.time.timezone,
      offsetSeconds: city.time.utcOffsetSeconds,
      dateEl: dateLine,
      onPhase: function (phase) {
        root.className = 'card card--' + phase;
      }
    });
    if (handle.degraded) {
      chips.appendChild(chip('Offset only', 'warn'));
    }
    if (opts.source === 'stale-cache') { chips.appendChild(chip('Cached copy', 'warn')); }
    if (opts.source === 'fixtures') { chips.appendChild(chip('Bundled snapshot', 'warn')); }
    if (isOutOfDate(city)) { chips.appendChild(chip('May be out of date', 'warn')); }
    root.appendChild(chips);

    var weatherRow = el('div', 'card__weather');
    var icon = el('div', 'card__icon');
    icon.appendChild(svg(weather.icon(w && w.condition, w && w.isDay)));
    weatherRow.appendChild(icon);

    var readout = el('div');
    readout.appendChild(el('div', 'card__temp', units.formatTemperature(w, settings.temperatureUnit)));
    readout.appendChild(el('div', 'card__cond', weather.label(w && w.condition)));
    weatherRow.appendChild(readout);
    root.appendChild(weatherRow);

    var meta = el('div', 'card__meta');
    meta.appendChild(el('span', null, 'Feels ' + units.formatFeelsLike(w, settings.temperatureUnit)));
    meta.appendChild(el('span', null, 'Humidity ' + units.formatHumidity(w)));
    meta.appendChild(el('span', null, 'Wind ' + units.formatWind(w, settings.windUnit)));
    var age = w && units.relativeAge(w.observedAtMs);
    if (age) { meta.appendChild(el('span', null, 'Observed ' + age)); }
    root.appendChild(meta);

    root.__clock = handle;
    return root;
  }

  /* Either the API flagged the observation stale, or the file itself is over 2 h old.
     Both still render their numbers - a labelled number beats an empty card. */
  function isOutOfDate(city) {
    if (city.weather && city.weather.stale === true) { return true; }
    if (typeof city.generatedAtMs === 'number') {
      return (Date.now() - city.generatedAtMs) > STALE_AFTER_MS;
    }
    return false;
  }

  /* ---------- search ---------- */

  /* Subsequence match: "nyk" finds "New York". Returns the first matching index and how
     far the match is spread, which is what the ranking below sorts on. */
  function subsequence(haystack, needle) {
    var i = 0, j = 0, first = -1, last = -1;
    while (i < haystack.length && j < needle.length) {
      if (haystack.charAt(i) === needle.charAt(j)) {
        if (first < 0) { first = i; }
        last = i;
        j++;
      }
      i++;
    }
    return j === needle.length ? { first: first, spread: last - first } : null;
  }

  function search(list, query, limit) {
    var q = normalize.fold(query).replace(/\s+/g, '');
    if (!q) { return []; }
    var hits = [];
    for (var i = 0; i < list.length; i++) {
      var city = list[i];
      var m = subsequence(city.foldedName.replace(/\s+/g, ''), q);
      var viaCode = false;
      if (!m) {
        m = subsequence(city.foldedCode, q);
        viaCode = !!m;
      }
      if (m) {
        hits.push({ city: city, first: m.first + (viaCode ? 100 : 0), spread: m.spread, length: city.name.length });
      }
    }
    hits.sort(function (a, b) {
      return (a.first - b.first) || (a.spread - b.spread) || (a.length - b.length) ||
        a.city.name.localeCompare(b.city.name);
    });
    return hits.slice(0, limit || 40).map(function (h) { return h.city; });
  }

  function searchOption(city, id, alreadyAdded) {
    var li = el('li', 'search__option');
    li.id = id;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.slug = city.slug;

    var flagEl = el('span', 'search__option__flag', units.flag(city.countryCode));
    flagEl.setAttribute('aria-hidden', 'true');
    li.appendChild(flagEl);
    li.appendChild(el('span', 'search__option__name', city.name + ', ' + city.countryCode));
    li.appendChild(el('span', 'search__option__zone', city.timezone || ''));
    if (alreadyAdded) { li.appendChild(el('span', 'search__option__added', 'Added')); }
    return li;
  }

  WTW.ui = {
    el: el,
    svg: svg,
    chip: chip,
    card: card,
    skeletonCard: skeletonCard,
    state: state,
    stateForError: stateForError,
    notice: notice,
    search: search,
    searchOption: searchOption,
    isOutOfDate: isOutOfDate
  };
})(typeof window !== 'undefined' ? window : globalThis);
