# World Time & Weather

Live clocks and current weather for cities around the world. Vanilla HTML, CSS and
JavaScript — no framework, no build step, no bundler, no npm dependency, no CDN script.

Deployed at <https://niktsanka.github.io/weatherapp/>, and it also runs from a
double-clicked `index.html` over `file://`.

> **Status:** Phase 1 (core dashboard) is complete. Favourites, hash routing and the city
> detail view (Phase 2), the meeting planner and zone browser (Phase 3), and the climate
> chart (Phase 4) are not built yet.

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

Local assets carry a manual version query (`./css/styles.css?v=1`). Bump the `v` value
when you change a file and want to force every visitor past that CDN cache.

A `.nojekyll` file already exists at the repository root, so Jekyll does not process the
site and no file is dropped for starting with `_`.

## File structure and script load order

```
weatherapp/
  index.html
  css/styles.css
  data/fixtures.js       real API responses, captured 2026-09-18
  js/…                   see load order below
  tools/verify.mjs       development only — never loaded by the app
  README.md
```

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
| 8 | `js/clock.js` | `WTW.clock` — the single global ticker | `weather` |
| 9 | `js/ui.js` | `WTW.ui` — DOM construction and search matching | `units`, `weather`, `normalize`, `clock` |
| 10 | `js/app.js` | bootstrap, visible set, event wiring | everything above |

**No ES modules.** A module script is blocked over `file://` (origin `null`), and this app
has to run from a double-clicked file, so there is no `type="module"`, no `import` and no
`export` anywhere in the shipped source. `tools/verify.mjs` greps for exactly that.

## Endpoints used

Everything comes from `https://worldtimeweather.com/api/v1/` over HTTPS:

| Endpoint | Used for |
|---|---|
| `cities.json` | the search index (413 cities) |
| `city/{slug}.json` | one city's time, weather and climate normals |
| `timezones.json` | the zone browser (Phase 3 — fetched but not yet displayed) |
| `api/health.php` | not used by the app; checked by `tools/verify.mjs` |

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
- **Hard dependency on the API's CORS header.** If `Access-Control-Allow-Origin` ever stops
  being `*`, `file://` testing breaks immediately; if it stops including
  `https://niktsanka.github.io`, the deployed site breaks too. `verify.mjs` reports the raw
  value so this is caught early.
- **The app must stay in its own subfolder.** Every path is relative and lowercase, and
  nothing is ever written to the repository root — a root `index.html`, `_config.yml` or
  `404.html` would break the sibling sites.
- **Country flags render as two letters on Windows.** They are regional-indicator code
  points, which Windows has no glyphs for. This is a platform font gap, not a bug, and it
  is why the country code is not repeated next to the flag.
- **`climate_normals` was present on all 413 cities** when the API was surveyed, so the
  absent-normals path has never been exercised against real data. Phase 4 will handle it
  defensively.

## Attribution

Data from [World Time & Weather](https://worldtimeweather.com/) · Weather by
[Open-Meteo](https://open-meteo.com)
