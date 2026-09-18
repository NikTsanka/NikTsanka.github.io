# World Time & Weather

Live clocks and current weather for cities around the world. Vanilla HTML, CSS and
JavaScript — no framework, no build step, no bundler, no npm dependency, no CDN script.

Deployed at <https://niktsanka.github.io/weatherapp/>, and it also runs from a
double-clicked `index.html` over `file://`.

> **Status:** complete, plus a seven-day forecast added after Phase 4.

## Running it locally

Double-click `weatherapp/index.html`. That is the whole procedure — everything is a
classic `<script>`, and no local file is ever fetched, so the `file://` restrictions do
not apply.

Optionally, to serve it over HTTP instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/weatherapp/
```

Both work because the API sends `Access-Control-Allow-Origin: *`, which permits the
`null` origin a `file://` page has.

## Deployment

This app is one folder inside a repository that also serves several unrelated sites, so
everything it owns lives under `weatherapp/` and it writes nothing at the repository root.

1. Copy the `weatherapp/` folder into the repository.
2. Commit and push.
3. Wait for the Pages build — up to about a minute after the push.
4. Open <https://niktsanka.github.io/weatherapp/>.
5. **Hard-refresh** (`Ctrl+Shift+R`, or `Cmd+Shift+R` on macOS). The Pages CDN caches
   assets for roughly 10 minutes, so a fresh deploy can otherwise serve the old CSS or JS.

Local assets carry a manual version query (`./css/styles.css?v=5`). Bump the `v` value
when you change a file and want to force every visitor past that CDN cache.

A `.nojekyll` file already exists at the repository root, so Jekyll does not process the
site and no file is dropped for starting with `_`.

## File structure and script load order

```
weatherapp/
  index.html
  icon.svg               the tab logo (carries its own colours - see the file header)
  apple-touch-icon.png   180x180 raster for an iOS home screen
  css/tokens.css         the palette and scale - the only file with colour literals
  css/styles.css         base layout, header, search, cards
  css/views.css          states, settings panel, detail view
  css/planner.css        view tabs, planner grid, zone browser
  css/chart.css          the climate chart
  css/forecast.css       the seven-day outlook and sun times
  data/fixtures.js       real API responses, captured 2026-09-18
  js/…                   see load order below
  tools/verify.mjs       development only — never loaded by the app
  README.md
```

The stylesheet and `app.js` are split rather than single files: the ~300-line ceiling
applies per file and both had outgrown it, so each was divided along its natural seam
(`views.css` and `planner.css`; `dashboard.js`, `search.js`, `settings.js`, `router.js`,
`detail.js`, `planner.js`, `zones.js`).

Scripts are plain `<script defer>` tags, so they execute in document order. Each file is
an IIFE under `'use strict'` that attaches to the single global `window.WTW`.

| # | File | Provides | Depends on |
|---|------|----------|------------|
| 1 | `data/fixtures.js` | `window.WTW_FIXTURES` — the offline fallback snapshot | — |
| 2 | `js/storage.js` | `WTW.storage` — persistence that never throws | — |
| 3 | `js/cache.js` | `WTW.cache` — versioned keys, TTLs, LRU eviction | `storage` |
| 4 | `js/units.js` | `WTW.units` — every number-to-text conversion | — |
| 5 | `js/weather.js` | `WTW.weather` — condition labels and inline SVG icons | — |
| 6 | `js/normalize.js` | `WTW.normalize` — raw API JSON to the internal model | `weather` |
| 7 | `js/api.js` | `WTW.api` — all network access and the fallback chain | `cache`, `normalize` |
| 8 | `js/clock.js` | `WTW.clock` — the single global ticker, and zone-offset maths | `weather` |
| 9 | `js/settings.js` | `WTW.settings` — the four persisted preferences and their panel | `storage`, `clock` |
| 10 | `js/search.js` | `WTW.search` — match, rank and drive the search box | `units`, `normalize` |
| 11 | `js/router.js` | `WTW.router` — hash routing | — |
| 12 | `js/ui.js` | `WTW.ui` — shared DOM primitives, the city card, designed states | `units`, `weather`, `clock`, `router` |
| 13 | `js/dashboard.js` | `WTW.dashboard` — the favourites list and the card grid | `ui`, `api`, `settings` |
| 14 | `js/detail.js` | `WTW.detail` — the single-city view and its DST block | `ui`, `clock`, `api` |
| 15 | `js/chart.js` | `WTW.chart` — the inline-SVG climate chart | `ui`, `units` |
| 15b | `js/forecast.js` | `WTW.forecast` — the seven-day outlook and sun times | `ui`, `units`, `weather`, `api` |
| 16 | `js/planner.js` | `WTW.planner` — the meeting planner and its time maths | `ui`, `clock`, `detail` |
| 17 | `js/zones.js` | `WTW.zones` — the time-zone browser | `ui`, `clock`, `units` |
| 18 | `js/app.js` | bootstrap and event wiring | everything above |

**No ES modules.** A module script is blocked over `file://` (origin `null`), and this app
has to run from a double-clicked file, so there is no `type="module"`, no `import` and no
`export` anywhere in the shipped source. `tools/verify.mjs` greps for exactly that.

## Routing, favourites and settings

Links are `#city=<slug>`, driven by `hashchange`. An incoming `?city=<slug>` is normalised
to the hash form on first load so older links keep working. `pushState` is never called:
it throws a `SecurityError` on `file://` in Chrome, and one code path has to serve both
targets. An unknown slug renders a designed "city not found" state with a link back.

Favourites live in `wtw:pref:favourites` — add from the search box, remove and reorder with
the up/down buttons on each card. No drag-and-drop: it has no keyboard equivalent without a
second, hidden implementation. The buttons are always visible rather than hover-only, so
they work on a touch screen.

Settings live in `wtw:pref:settings`: °C/°F, km/h / mph, 24-hour / 12-hour, and
light / dark / auto. `auto` removes `data-theme` entirely so the `prefers-color-scheme`
block in the stylesheet takes over. Both `wtw:pref:` keys are deliberately exempt from the
cache sweep, so bumping the cache version never resets what you chose.

The detail view is not modal — it replaces the dashboard — so there is no focus trap to get
wrong. Focus moves to its heading on open, Escape closes it, and focus returns to the card
that opened it.

## The meeting planner

Three views share the header: **Cities** (`#`), **Planner** (`#planner`) and **Time zones**
(`#zones`).

The planner compares whatever is on your dashboard, so it needs no picker of its own and
makes no extra requests — `cities.json` already carries every city's IANA zone. Pick a
date, a time and which city that time is expressed in; each row then shows that city's
local time, its UTC offset, the difference from the reference city, and a **+1 day** or
**−1 day** marker whenever the local date differs.

**Every offset is computed with `Intl` for the date being planned**, never from
`time.utc_offset_seconds`. That field is the offset *today*: plan a call for a date on the
other side of a DST boundary and it is wrong by an hour, and wrong differently for each
city — precisely the mistake a meeting planner exists to prevent. Concretely, London is
4 hours behind Tbilisi in January and 3 hours behind in July; the planner shows both
correctly, and there are tests that fail if that ever collapses to one answer.

Each row is a 24-column strip. **A column is one absolute instant**, derived once from the
reference city's wall clock — that is what makes overlapping working hours line up
vertically. Cells are coloured night / early morning / working hours / evening, working
hours default to 09:00–18:00 and are configurable and persisted in `wtw:pref:planner`.
Non-integer offsets (+05:45 Kathmandu, +09:30 and +10:30 Adelaide, +12:45 Chatham) are
handled in both the maths and the display; because the hour number alone would hide the
minutes, those cells are italic and every cell carries the exact local time in its
`aria-label` and tooltip. The grid is a real `<table>` with row and column headers inside a
keyboard-scrollable region.

## The climate chart

On a city page, `climate_normals` is drawn as hand-written inline SVG — no chart library,
no canvas, no image request. Twelve months, the average high and low as a filled band with
a line along each edge, rainfall as bars on a **secondary right-hand axis**, and the period
(e.g. 2021-2025) and units stated in the caption. Both axes snap to round tick values.

The tooltip gives the month's high, low, rainfall and **wet days**, and works on tap as
well as hover: each month has a transparent hit area listening for `pointerenter` *and*
`pointerdown`, because a touch never fires an enter event of its own.

The SVG is `aria-hidden`, and a **visually-hidden `<table>`** beside it carries exactly the
same numbers with proper row and column headers. That table is both the screen-reader
version and the fallback if the SVG never renders; both are formatted from one prepared set
of values, so they cannot drift apart. The table sits inside a visually-hidden `<div>`
rather than wearing the class itself — `width: 1px` does not shrink a `<table>`, which
sizes to its content, and setting `display: block` on it would strip the table semantics
screen readers rely on.

`tmax` / `tmin` / `prcp` are metric-only in the API, so this is the one place unit
conversion is unavoidable; it happens in `js/units.js` and nowhere else.

## The time-zone browser

Cities grouped by IANA zone, collapsible with `aria-expanded`, sorted by each zone's
**current** offset — `timezones.json` carries no offset data at all, so the order is
computed with `Intl.DateTimeFormat(zone, { timeZoneName: 'longOffset' })`. Roughly half the
zones are on summer time at any moment, so that order genuinely shifts through the year.

## The seven-day forecast

`worldtimeweather.com` has **no forecast endpoint** — only current weather and climate
normals. So the outlook comes from [Open-Meteo](https://open-meteo.com), the upstream that
site already credits: keyless, HTTPS, and `Access-Control-Allow-Origin: *`, so it works
from Pages and from a double-clicked file alike. It is the app's **second and last**
permitted origin, and `tools/verify.mjs` checks its CORS header from both the Pages origin
and `Origin: null`.

Open-Meteo reports raw **WMO codes** rather than the string keys worldtimeweather.com
emits, so `js/weather.js` carries a code → condition bridge. Every pairing the live API was
observed using (0 clear, 3 overcast, 45 fog, 51/53/55 drizzle, 61 light rain, 80/81 rain
showers, 95 thunderstorm, 96 hail) is reproduced exactly, so the same sky never gets two
different icons; the rest follow the WMO table, and freezing and grain variants fold into
their nearest mapped key. `verify.mjs` fails if any code in the map points at a condition
the icon set does not have.

The request always asks for **Celsius and millimetres** and converts in `js/units.js`. That
keeps one cache entry per city rather than one per unit setting, and the conversion already
existed there for the climate normals. Sunrise and sunset are requested in the city's own
IANA zone, so they come back as bare local wall clock (`2026-09-18T06:43`) and are rendered
by slicing out the time rather than parsing — no zone maths can shift them.

Forecasts cache for **one hour**, which is roughly how often Open-Meteo recomputes. There
is no fixture fallback: a forecast from a snapshot captured weeks ago would be worse than
none. If the request fails the panel shows a quiet line and a Retry, and the rest of the
city page — clock, current weather, DST block, climate chart — renders regardless.

It is fetched **only on a city page**, one request at a time. Putting it on the dashboard
would mean seven extra requests on every load.

## Endpoints used

Everything comes from `https://worldtimeweather.com/api/v1/` over HTTPS, except the
forecast:

| Endpoint | Used for |
|---|---|
| `cities.json` | the search index (413 cities) |
| `city/{slug}.json` | one city's time, weather and climate normals |
| `timezones.json` | the time-zone browser |
| `api/health.php` | not used by the app; checked by `tools/verify.mjs` |
| `api.open-meteo.com/v1/forecast` | the seven-day outlook, sunrise, sunset and UV index |

`index.json` is documentation only. Weather ultimately comes from
[Open-Meteo](https://open-meteo.com), which is why both are credited in the footer.

Two shape notes that cost real debugging time, in case you meet them again:

- `cities.json` and `timezones.json` are **envelopes**. The payload the docs describe sits
  under `.data`, not at the top level.
- The London slug is **`london-gb`**, not `london`. `hyderabad-in` / `hyderabad-pk` and
  `casablanca-cl` / `casablanca-ma` collide the same way.

## Caching strategy

Resolution order for every resource, in `js/api.js`:

```
fresh cache  ->  network  ->  stale cache (labelled)  ->  bundled fixtures (labelled)
```

| Kind | TTL | Why |
|---|---|---|
| `city/{slug}` | 15 minutes | The API regenerates every 30 min behind `Cache-Control: max-age=900`. Asking sooner returns a byte-identical file. |
| `forecast/{slug}` | 1 hour | Open-Meteo recomputes roughly hourly. |
| `cities.json` | 24 hours | The city list changes rarely. |
| `timezones.json` | 24 hours | Same. |

Keys are `wtw:v1:<kind>:<key>`. The `v1` segment is the invalidation lever: bump
`CACHE_VERSION` in `js/cache.js` whenever `js/normalize.js` changes shape, and every older
entry is ignored and swept instead of being handed to code that no longer understands it.
City entries are capped at 80 and evicted least-recently-used first; a
`QuotaExceededError` drops the ten oldest and retries once, and a cache write never fails
the request it belongs to.

When a refetch fails, the stale cached copy is served and the card is visibly labelled
**Cached copy**. If there is no cache either, the bundled snapshot in `data/fixtures.js` is
used and labelled **Bundled snapshot**.

Refresh happens on load, on `visibilitychange` when the tab becomes visible, and on the
Refresh button. All three are gated by the same TTL — there is no background polling loop,
and clocks never poll the API at all: time is computed locally from the IANA zone.

## Verification

```sh
node weatherapp/tools/verify.mjs          # samples 40 cities
node weatherapp/tools/verify.mjs --all    # every city in the index
```

It checks that every endpoint is reachable over HTTPS, reports the **raw**
`Access-Control-Allow-Origin` header value, confirms the live shape still matches what
`normalize.js` expects, confirms every `condition` key in the live API exists in the icon
map, and statically greps the shipped source for `type="module"`, `import`, `export`, a
`fetch()` of a local path, an absolute local reference, an uppercase letter in a path, or a
path segment starting with `_`.

## Known limitations

- **No service worker.** On a shared domain, a wrong scope would hijack the sibling sites,
  and stale-cache debugging is not worth the cost. So there is no offline mode beyond the
  `localStorage` cache and the bundled snapshot.
- **Safari blocks `localStorage` on `file://`.** `js/storage.js` detects that and falls
  back to an in-memory store, and the app shows one dismissible notice saying settings will
  not persist. Nothing throws.
- **Hash routing, not clean URLs.** GitHub Pages cannot rewrite unknown paths to
  `index.html`, so `/weatherapp/city/tokyo` is impossible. Links use `#city=<slug>`.
- **Two upstreams, so two things can break.** A city page needs `worldtimeweather.com` for
  everything and `api.open-meteo.com` for the forecast panel only; the page degrades to
  a Retry line if the second is unreachable.
- **Hard dependency on the API's CORS header.** If `Access-Control-Allow-Origin` ever stops
  being `*`, `file://` testing breaks immediately; if it stops including
  `https://niktsanka.github.io`, the deployed site breaks too. `verify.mjs` reports the raw
  value so this is caught early.
- **The app must stay in its own subfolder.** Every path is relative and lowercase, and
  nothing is ever written to the repository root — a root `index.html`, `_config.yml` or
  `404.html` would break the sibling sites.
- **The logo is a plain dial on purpose.** Sun rays and a cloud were both tried and both
  turned to mush at 16px, which is the only size a browser tab ever shows.
- **Country flags render as two letters on Windows.** They are regional-indicator code
  points, which Windows has no glyphs for. This is a platform font gap, not a bug, and it
  is why the country code is not repeated next to the flag.
- **`climate_normals` was present on all 413 cities** when the API was surveyed, so the
  absent-normals path has never been exercised against real data. It is handled
  defensively: `WTW.chart.climate()` returns `null` and the detail view omits the panel
  rather than rendering an empty frame.
- **The chart tooltip is pointer-only.** It is an enhancement for mouse and touch; the
  visually-hidden table is the accessible route to the same numbers, so the tooltip
  deliberately adds no extra tab stops.
- **The planner plans across your dashboard cities**, not an independent selection. Add or
  remove cities from the search box and the open planner updates in place.
- **The planner grid is always 24-hour**, regardless of the 12/24-hour setting: a
  24-column strip of a day is inherently a 24-hour view.
- **The January/July offsets are computed with `Intl`, not from the API.**
  `time.utc_offset_seconds` is today's offset and would be wrong across a DST boundary. If
  a browser does not know the zone at all, the API's `winter`/`summer` values are shown
  instead and the view says so.

## Attribution

Data from [World Time & Weather](https://worldtimeweather.com/) · Weather by
[Open-Meteo](https://open-meteo.com)
