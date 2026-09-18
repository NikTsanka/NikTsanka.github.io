/* zones.js - the time-zone browser, built from timezones.json.

   timezones.json carries no offset data at all: it is purely zone -> [slug]. So the sort
   order is computed here with Intl.DateTimeFormat(zone, { timeZoneName: 'longOffset' }),
   which gives each zone's offset RIGHT NOW - half the zones listed are on summer time at
   any given moment, and an alphabetical list would scatter them. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var ui = WTW.ui;
  var units = WTW.units;
  var clock = WTW.clock;
  var el = ui.el;

  var open = Object.create(null);

  function zoneRows(zoneMap, index) {
    var now = new Date();
    return Object.keys(zoneMap).map(function (zone) {
      var offset = clock.offsetAt(zone, now);
      return {
        zone: zone,
        offset: offset,
        label: units.formatOffset(offset, 'UTC'),
        slugs: zoneMap[zone],
        cities: zoneMap[zone].map(function (slug) {
          return (index && index.bySlug[slug]) || { slug: slug, name: slug, countryCode: '' };
        })
      };
    }).sort(function (a, b) {
      /* A zone this browser cannot resolve sorts last rather than as UTC. */
      if (a.offset === null && b.offset === null) { return a.zone.localeCompare(b.zone); }
      if (a.offset === null) { return 1; }
      if (b.offset === null) { return -1; }
      return (a.offset - b.offset) || a.zone.localeCompare(b.zone);
    });
  }

  function group(row, idPrefix) {
    var item = el('li', 'zone');
    var panelId = idPrefix + '-' + row.zone.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    var toggle = el('button', 'zone__toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', open[row.zone] ? 'true' : 'false');
    toggle.setAttribute('aria-controls', panelId);

    var chevron = el('span', 'zone__chevron');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.appendChild(ui.svg('<path d="m9 6 6 6-6 6"/>'));
    toggle.appendChild(chevron);
    toggle.appendChild(el('span', 'zone__name', row.zone));
    toggle.appendChild(el('span', 'zone__offset', row.label));
    toggle.appendChild(el('span', 'zone__count',
      row.cities.length + (row.cities.length === 1 ? ' city' : ' cities')));

    var panel = el('ul', 'zone__cities');
    panel.id = panelId;
    if (!open[row.zone]) { panel.hidden = true; }

    row.cities.forEach(function (city) {
      var li = el('li');
      var link = el('a', 'zone__city');
      link.href = WTW.router.hashFor(city.slug);
      var flag = el('span', 'zone__flag', units.flag(city.countryCode));
      flag.setAttribute('aria-hidden', 'true');
      link.appendChild(flag);
      link.appendChild(el('span', null, city.name));
      li.appendChild(link);
      panel.appendChild(li);
    });

    toggle.addEventListener('click', function () {
      var next = !open[row.zone];
      open[row.zone] = next;
      toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
      panel.hidden = !next;
      item.classList.toggle('is-open', next);
    });

    if (open[row.zone]) { item.classList.add('is-open'); }
    item.appendChild(toggle);
    item.appendChild(panel);
    return item;
  }

  function render(container, zoneData, index) {
    container.textContent = '';

    var section = el('section', 'view');
    section.setAttribute('aria-labelledby', 'zones-title');
    var title = el('h2', 'view__title', 'Time zones');
    title.id = 'zones-title';
    title.tabIndex = -1;
    section.appendChild(title);

    var zoneMap = zoneData && zoneData.zones;
    var names = zoneMap ? Object.keys(zoneMap) : [];
    if (names.length === 0) {
      section.appendChild(ui.state({
        tone: 'error', icon: 'error', title: 'No zone data',
        text: 'The time-zone index could not be loaded.',
        linkLabel: '← Back to all cities', linkHref: WTW.router.hashFor(null) || '#'
      }));
      container.appendChild(section);
      return;
    }

    var rows = zoneRows(zoneMap, index);
    section.appendChild(el('p', 'view__lede',
      rows.length + ' zones, ordered by their offset from UTC right now. ' +
      'Half of them are on summer time at any moment, so this order shifts through the year.'));

    var list = el('ul', 'zones');
    rows.forEach(function (row) { list.appendChild(group(row, 'zone')); });
    section.appendChild(list);
    container.appendChild(section);
  }

  WTW.zones = { render: render, rows: zoneRows };
})(typeof window !== 'undefined' ? window : globalThis);
