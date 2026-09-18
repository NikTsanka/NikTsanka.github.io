/* ui.js - shared DOM primitives, the city card, skeletons and the designed states.
   Builds nodes, never strings, except for the inline SVG we author ourselves.
   Nothing here fetches or stores anything. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var units = WTW.units;
  var weather = WTW.weather;

  var STALE_AFTER_MS = 2 * 60 * 60 * 1000;

  var GLYPH = {
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    error: '<path d="M12 8v5"/><path d="M12 16.5v.1"/><circle cx="12" cy="12" r="9"/>',
    empty: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
    offline: '<path d="M4 8a14 14 0 0 1 16 0M7.5 11.5a9 9 0 0 1 9 0M10.5 15a4.5 4.5 0 0 1 3 0M12 19v.1"/><path d="m3 3 18 18"/>'
  };

  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function svg(body) {
    var holder = el('span');
    holder.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
      'focusable="false">' + body + '</svg>';
    return holder.firstChild;
  }

  function rawSvg(markup) {
    var holder = el('span');
    holder.innerHTML = markup;
    return holder.firstChild;
  }

  function chip(text, modifier) {
    return el('span', 'chip' + (modifier ? ' chip--' + modifier : ''), text);
  }

  function iconButton(glyph, label, onClick, disabled) {
    var btn = el('button', 'icon-btn icon-btn--bare');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.appendChild(svg(glyph));
    if (disabled) { btn.disabled = true; }
    btn.addEventListener('click', onClick);
    return btn;
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

  function state(options) {
    var opts = options || {};
    var box = el('div', 'state' + (opts.tone ? ' state--' + opts.tone : ''));
    box.setAttribute('role', opts.tone === 'error' ? 'alert' : 'status');

    var icon = el('div', 'state__icon');
    icon.appendChild(svg(GLYPH[opts.icon] || GLYPH.empty));
    box.appendChild(icon);
    box.appendChild(el('h3', 'state__title', opts.title || 'Something went wrong'));
    if (opts.text) { box.appendChild(el('p', 'state__text', opts.text)); }

    if (opts.actionLabel && typeof opts.onAction === 'function') {
      var btn = el('button', 'btn', opts.actionLabel);
      btn.type = 'button';
      btn.addEventListener('click', opts.onAction);
      box.appendChild(btn);
    }
    if (opts.linkLabel && opts.linkHref !== undefined) {
      var link = el('a', 'state__link', opts.linkLabel);
      link.href = opts.linkHref;
      box.appendChild(link);
    }
    return box;
  }

  /* Maps an api.js error envelope onto a designed state. Every branch has a Retry. */
  function stateForError(error, onRetry) {
    var kind = (error && error.kind) || 'network';
    var common = { tone: 'error', actionLabel: 'Retry', onAction: onRetry };

    if (kind === 'offline') {
      common.icon = 'offline';
      common.title = 'You are offline';
      common.text = 'Showing nothing rather than something wrong. Reconnect and try again.';
    } else if (kind === 'notfound') {
      common.icon = 'error';
      common.title = 'City not found';
      common.text = 'The API has no entry with that slug. It may have been renamed.';
    } else if (kind === 'http') {
      common.icon = 'error';
      common.title = 'The API is not answering properly';
      common.text = (error && error.message) || 'The API returned an error response.';
    } else {
      common.icon = 'error';
      common.title = 'Could not reach the API';
      common.text = (error && error.message) || 'The request failed.';
    }
    return state(common);
  }

  function notice(text, onDismiss) {
    var box = el('div', 'notice');
    box.appendChild(el('p', null, text));
    box.appendChild(iconButton(GLYPH.close, 'Dismiss this notice', function () {
      box.remove();
      if (typeof onDismiss === 'function') { onDismiss(); }
    }));
    return box;
  }

  /* ---------- city card ---------- */

  function sourceChip(source) {
    if (source === 'stale-cache') { return chip('Cached copy', 'warn'); }
    if (source === 'fixtures') { return chip('Bundled snapshot', 'warn'); }
    return null;
  }

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
    var heading = el('h3', 'card__name');
    var link = el('a', 'card__link', city.name);
    link.href = WTW.router.hashFor(city.slug);
    link.dataset.slug = city.slug;
    heading.appendChild(link);
    names.appendChild(heading);
    names.appendChild(el('p', 'card__zone', city.time.timezone || 'Unknown time zone'));
    head.appendChild(names);

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
      onPhase: function (phase) { root.className = 'card card--' + phase; }
    });
    if (handle.degraded) { chips.appendChild(chip('Offset only', 'warn')); }
    var srcChip = sourceChip(opts.source);
    if (srcChip) { chips.appendChild(srcChip); }
    if (isOutOfDate(city)) { chips.appendChild(chip('May be out of date', 'warn')); }
    root.appendChild(chips);

    var weatherRow = el('div', 'card__weather');
    var icon = el('div', 'card__icon');
    icon.appendChild(rawSvg(weather.icon(w && w.condition, w && w.isDay)));
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

    /* Reorder is up/down buttons on purpose: drag-and-drop has no keyboard equivalent
       without a second, hidden implementation. The row sits at the foot of the card and
       is always visible - a hover-only control is unreachable on a touch screen, and
       reserving its width in the header squeezed the time-zone line. */
    var actions = el('div', 'card__actions');
    if (typeof opts.onMove === 'function') {
      actions.appendChild(iconButton(GLYPH.up, 'Move ' + city.name + ' earlier',
        function () { opts.onMove(city.slug, -1); }, opts.isFirst));
      actions.appendChild(iconButton(GLYPH.down, 'Move ' + city.name + ' later',
        function () { opts.onMove(city.slug, 1); }, opts.isLast));
    }
    if (typeof opts.onRemove === 'function') {
      actions.appendChild(iconButton(GLYPH.close, 'Remove ' + city.name,
        function () { opts.onRemove(city.slug); }));
    }
    if (actions.firstChild) { root.appendChild(actions); }

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

  WTW.ui = {
    GLYPH: GLYPH,
    el: el,
    svg: svg,
    rawSvg: rawSvg,
    chip: chip,
    iconButton: iconButton,
    card: card,
    skeletonCard: skeletonCard,
    state: state,
    stateForError: stateForError,
    sourceChip: sourceChip,
    notice: notice,
    isOutOfDate: isOutOfDate
  };
})(typeof window !== 'undefined' ? window : globalThis);
