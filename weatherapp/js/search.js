/* search.js - matching and ranking for the city search box. Pure except for the one
   function that builds an option row. */
(function (global) {
  'use strict';

  var WTW = global.WTW = global.WTW || {};
  var doc = global.document;
  var units = WTW.units;
  var normalize = WTW.normalize;

  /* Subsequence match: "nyk" finds "New York". Returns where the match starts and how
     far it is spread, which is exactly what the ranking below sorts on. */
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

  /* Matching is case- and diacritic-insensitive (normalize.fold strips combining marks),
     so "sanjose" finds "San Jose". Ranked by match position, then compactness, then the
     shorter name - a query that is a whole name should not rank under a longer one. */
  function match(list, query, limit) {
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
        /* A country-code hit is a weaker signal than a name hit, so push it down. */
        hits.push({
          city: city,
          first: m.first + (viaCode ? 100 : 0),
          spread: m.spread,
          length: city.name.length
        });
      }
    }

    hits.sort(function (a, b) {
      return (a.first - b.first) || (a.spread - b.spread) || (a.length - b.length) ||
        a.city.name.localeCompare(b.city.name);
    });

    return hits.slice(0, limit || 40).map(function (hit) { return hit.city; });
  }

  function option(city, id, alreadyAdded) {
    var li = doc.createElement('li');
    li.className = 'search__option';
    li.id = id;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.slug = city.slug;

    var flag = doc.createElement('span');
    flag.className = 'search__option__flag';
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = units.flag(city.countryCode);
    li.appendChild(flag);

    var name = doc.createElement('span');
    name.className = 'search__option__name';
    name.textContent = city.name + ', ' + city.countryCode;
    li.appendChild(name);

    var zone = doc.createElement('span');
    zone.className = 'search__option__zone';
    zone.textContent = city.timezone || '';
    li.appendChild(zone);

    if (alreadyAdded) {
      var added = doc.createElement('span');
      added.className = 'search__option__added';
      added.textContent = 'Added';
      li.appendChild(added);
    }
    return li;
  }

  /* ---------- the search box itself ---------- */

  var DEBOUNCE_MS = 150;

  function bind(config) {
    var input = doc.getElementById('search-input');
    var results = doc.getElementById('search-results');
    var clear = doc.getElementById('search-clear');

    var options = [];
    var active = -1;
    var timer = null;

    function close() {
      results.classList.add('is-hidden');
      results.textContent = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      options = [];
      active = -1;
    }

    function highlight(next) {
      var total = options.length;
      if (total === 0) { return; }
      var i = ((next % total) + total) % total;
      for (var n = 0; n < total; n++) {
        options[n].node.setAttribute('aria-selected', n === i ? 'true' : 'false');
      }
      active = i;
      input.setAttribute('aria-activedescendant', options[i].node.id);
      options[i].node.scrollIntoView({ block: 'nearest' });
    }

    function render(query) {
      var list = config.list();
      if (!list) { return; }
      var matches = match(list, query, 40);
      results.textContent = '';
      options = [];
      active = -1;

      if (matches.length === 0) {
        var empty = doc.createElement('li');
        empty.className = 'search__option';
        empty.setAttribute('role', 'option');
        empty.setAttribute('aria-selected', 'false');
        empty.setAttribute('aria-disabled', 'true');
        empty.textContent = 'No city matches “' + query + '”';
        results.appendChild(empty);
      } else {
        matches.forEach(function (city, i) {
          var node = option(city, 'search-option-' + i, config.isAdded(city.slug));
          node.addEventListener('mousedown', function (event) {
            event.preventDefault();
            choose(city.slug);
          });
          results.appendChild(node);
          options.push({ node: node, slug: city.slug });
        });
      }
      results.classList.remove('is-hidden');
      input.setAttribute('aria-expanded', 'true');
    }

    function choose(slug) {
      config.onChoose(slug);
      input.value = '';
      clear.classList.add('is-hidden');
      close();
      input.focus();
    }

    input.addEventListener('input', function () {
      var value = input.value;
      clear.classList.toggle('is-hidden', value === '');
      global.clearTimeout(timer);
      timer = global.setTimeout(function () {
        if (value.trim() === '') { close(); return; }
        render(value.trim());
      }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); highlight(active + 1); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); highlight(active - 1); return; }
      if (event.key === 'Enter' && active >= 0 && options[active]) {
        event.preventDefault();
        choose(options[active].slug);
      }
    });

    /* The delay lets a mousedown on an option land before the list disappears. */
    input.addEventListener('blur', function () { global.setTimeout(close, 120); });

    clear.addEventListener('click', function () {
      input.value = '';
      clear.classList.add('is-hidden');
      close();
      input.focus();
    });
  }

  WTW.search = { match: match, option: option, bind: bind };
})(typeof window !== 'undefined' ? window : globalThis);
