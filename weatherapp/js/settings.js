/* settings.js - the four persisted global preferences, and the panel that edits them.
   Stored under wtw:pref:, which cache.js deliberately never sweeps, so a cache version
   bump does not reset what the reader chose. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var storage = WTW.storage;

  var KEY = 'wtw:pref:settings';

  var FIELDS = [
    {
      key: 'temperatureUnit', legend: 'Temperature', fallback: 'c',
      options: [{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]
    },
    {
      key: 'windUnit', legend: 'Wind speed', fallback: 'kmh',
      options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }]
    },
    {
      key: 'clock', legend: 'Clock', fallback: '24',
      options: [{ value: '24', label: '24-hour' }, { value: '12', label: '12-hour' }]
    },
    {
      key: 'theme', legend: 'Theme', fallback: 'auto',
      options: [
        { value: 'auto', label: 'Auto' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' }
      ]
    }
  ];

  var current = read();
  var listeners = [];

  function defaults() {
    var out = {};
    for (var i = 0; i < FIELDS.length; i++) { out[FIELDS[i].key] = FIELDS[i].fallback; }
    return out;
  }

  function read() {
    var stored = storage.getJSON(KEY);
    var out = defaults();
    if (stored && typeof stored === 'object') {
      for (var i = 0; i < FIELDS.length; i++) {
        var field = FIELDS[i];
        var value = stored[field.key];
        var allowed = field.options.some(function (o) { return o.value === value; });
        if (allowed) { out[field.key] = value; }
      }
    }
    return out;
  }

  /* Theme "auto" removes the attribute entirely so the prefers-color-scheme block in the
     stylesheet takes over; light and dark pin it. */
  function applyTheme() {
    var root = doc.documentElement;
    if (current.theme === 'auto') { root.removeAttribute('data-theme'); }
    else { root.setAttribute('data-theme', current.theme); }
  }

  function apply() {
    applyTheme();
    WTW.clock.setHour12(current.clock === '12');
  }

  function emit(changedKey) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](settings.get(), changedKey); } catch (err) { /* keep going */ }
    }
  }

  function allowed(key, value) {
    for (var i = 0; i < FIELDS.length; i++) {
      if (FIELDS[i].key === key) {
        return FIELDS[i].options.some(function (o) { return o.value === value; });
      }
    }
    return false;
  }

  /* Validated on the way in as well as on the way out: a caller passing a value this
     app does not understand must not be able to wedge the UI into an unrenderable state. */
  function set(key, value) {
    if (!allowed(key, value) || current[key] === value) { return; }
    current[key] = value;
    storage.setJSON(KEY, current);
    apply();
    emit(key);
  }

  function segment(field) {
    var box = doc.createElement('fieldset');
    box.className = 'segment';
    var legend = doc.createElement('legend');
    legend.className = 'segment__legend';
    legend.textContent = field.legend;
    box.appendChild(legend);

    var row = doc.createElement('div');
    row.className = 'segment__row';

    field.options.forEach(function (option) {
      var id = 'set-' + field.key + '-' + option.value;
      var input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'set-' + field.key;
      input.id = id;
      input.value = option.value;
      input.className = 'segment__input';
      input.checked = current[field.key] === option.value;
      input.addEventListener('change', function () {
        if (input.checked) { set(field.key, option.value); }
      });

      var label = doc.createElement('label');
      label.className = 'segment__label';
      label.setAttribute('for', id);
      label.textContent = option.label;

      row.appendChild(input);
      row.appendChild(label);
    });

    box.appendChild(row);
    return box;
  }

  var settings = {
    /* A copy, so nothing can mutate the store by holding on to the object. */
    get: function () {
      return {
        temperatureUnit: current.temperatureUnit,
        windUnit: current.windUnit,
        clock: current.clock,
        hour12: current.clock === '12',
        theme: current.theme
      };
    },

    set: set,

    subscribe: function (fn) { listeners.push(fn); },

    /* Builds the panel body. app.js owns showing and hiding it. */
    panel: function () {
      var box = doc.createElement('div');
      box.className = 'settings__body';
      for (var i = 0; i < FIELDS.length; i++) { box.appendChild(segment(FIELDS[i])); }
      return box;
    }
  };

  apply();
  WTW.settings = settings;
})(typeof window !== 'undefined' ? window : globalThis);
