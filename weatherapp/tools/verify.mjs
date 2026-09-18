/* verify.mjs - development-only checker. Never loaded by the app and never referenced
   from index.html. Run it from the repository root:

     node weatherapp/tools/verify.mjs            (samples 40 cities)
     node weatherapp/tools/verify.mjs --all      (every city in the index)

   It answers the three questions a browser cannot answer for us here:
     1. is the live API still shaped the way normalize.js assumes?
     2. is the CORS header still permissive enough for GitHub Pages AND file://?
     3. does the shipped source still obey the no-modules / relative-path rules? */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://worldtimeweather.com/api/v1/';
const HEALTH = 'https://worldtimeweather.com/api/health.php';
const METEO = 'https://api.open-meteo.com/v1/forecast';
const SAMPLE = process.argv.includes('--all') ? Infinity : 40;

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;

const PAGES_ORIGIN = 'https://niktsanka.github.io';

/* An Origin header has to be sent explicitly: node's fetch omits it, and a server that
   echoes the origin back has nothing to echo, so the response looks like it has no CORS
   header at all. A browser always sends one, so a check without it proves nothing. */
async function getJson(url, origin = PAGES_ORIGIN) {
  const res = await fetch(url, { headers: { Origin: origin } });
  const acao = res.headers.get('access-control-allow-origin');
  const body = res.ok ? await res.json() : null;
  return { res, acao, body };
}

/* file:// pages send Origin: null. Only a wildcard satisfies that, which is why local
   double-click testing works at all. */
async function checkFileOrigin(label, url) {
  try {
    const res = await fetch(url, { headers: { Origin: 'null' } });
    const acao = res.headers.get('access-control-allow-origin');
    if (acao === '*') { pass(`${label}: CORS from file://`, 'origin null is accepted'); }
    else { fail(`${label}: CORS from file://`, `Access-Control-Allow-Origin: ${acao ?? '(absent)'}`); }
  } catch (err) {
    fail(`${label}: CORS from file://`, err.message);
  }
}

/* ---------- 1. endpoints, CORS and shape ---------- */

function checkCors(label, acao) {
  if (acao === '*') {
    pass(`${label}: CORS`, `Access-Control-Allow-Origin: * (also permits file://, origin null)`);
  } else if (acao === 'https://niktsanka.github.io') {
    fail(`${label}: CORS`, `Access-Control-Allow-Origin: ${acao} - Pages works, file:// does NOT`);
  } else {
    fail(`${label}: CORS`, `Access-Control-Allow-Origin: ${acao ?? '(absent)'}`);
  }
}

function checkCities(body) {
  if (!body || !Array.isArray(body.data)) {
    fail('cities.json: shape', 'expected an envelope with a `data` array');
    return [];
  }
  pass('cities.json: shape', `${body.data.length} rows under .data`);
  const bad = body.data.filter((r) => !isStr(r?.slug) || !isStr(r?.name) || !isStr(r?.timezone));
  if (bad.length) {
    fail('cities.json: rows', `${bad.length} row(s) missing slug/name/timezone`);
  } else {
    pass('cities.json: rows', 'every row has slug, name, country_code, timezone, url');
  }
  return body.data;
}

function checkTimezones(body) {
  const map = body?.data;
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    fail('timezones.json: shape', 'expected the zone map under `.data`');
    return;
  }
  const zones = Object.keys(map);
  const nonArray = zones.filter((z) => !Array.isArray(map[z]));
  if (nonArray.length) {
    fail('timezones.json: shape', `${nonArray.length} zone(s) do not map to an array`);
  } else {
    pass('timezones.json: shape', `${zones.length} IANA zones under .data`);
  }
  const unsupported = zones.filter((z) => {
    try { new Intl.DateTimeFormat('en-GB', { timeZone: z }).format(new Date()); return false; }
    catch { return true; }
  });
  if (unsupported.length) {
    fail('timezones.json: Intl', `zones this Node rejects: ${unsupported.slice(0, 5).join(', ')}`);
  } else {
    pass('timezones.json: Intl', 'every zone is accepted by Intl.DateTimeFormat');
  }
}

/* The fields normalize.js actually reads. A missing one is a real break; an extra one
   upstream is fine and deliberately not reported. */
function checkCityDoc(slug, doc, iconKeys, problems) {
  const need = [
    ['slug', isStr(doc?.slug)],
    ['name', isStr(doc?.name)],
    ['country_code', isStr(doc?.country_code)],
    ['time.timezone', isStr(doc?.time?.timezone)],
    ['time.utc_offset_seconds', isNum(doc?.time?.utc_offset_seconds)],
    ['time.utc_offset', isStr(doc?.time?.utc_offset)],
    ['time.dst.observes_dst', typeof doc?.time?.dst?.observes_dst === 'boolean'],
    ['weather.temperature_c', isNum(doc?.weather?.temperature_c)],
    ['weather.temperature_f', isNum(doc?.weather?.temperature_f)],
    ['weather.condition', isStr(doc?.weather?.condition)],
    ['weather.is_day', typeof doc?.weather?.is_day === 'boolean'],
    ['weather.observed_at', isStr(doc?.weather?.observed_at)],
    ['generated_at', isStr(doc?.generated_at)]
  ];
  for (const [field, ok] of need) {
    if (!ok) { problems.push(`${slug}: missing or wrong type - ${field}`); }
  }

  const condition = doc?.weather?.condition;
  if (isStr(condition) && !iconKeys.has(condition)) {
    problems.push(`${slug}: condition "${condition}" has no entry in the icon map`);
  }

  /* normalize.js parses observed_at with Date.parse when it carries an offset. */
  if (isStr(doc?.weather?.observed_at) && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(doc.weather.observed_at)) {
    problems.push(`${slug}: observed_at "${doc.weather.observed_at}" carries no UTC offset`);
  }
}

/* Every WMO code weather.js claims to understand must resolve to a real condition key,
   or the forecast would render an empty icon slot. */
function checkWmoMap() {
  const icons = iconMapKeys();
  const wmo = wmoMapKeys();
  const bad = Object.entries(wmo).filter(([, key]) => !icons.has(key));
  if (bad.length) {
    fail('weather.js: WMO map', bad.map(([c, k]) => `${c} -> ${k}`).join(', '));
  } else {
    pass('weather.js: WMO map', `${Object.keys(wmo).length} codes map to known conditions`);
  }
}

function iconMapKeys() {
  const source = readFileSync(join(ROOT, 'js', 'weather.js'), 'utf8');
  const block = source.slice(source.indexOf('var CONDITIONS'), source.indexOf('function get('));
  const keys = new Set();
  for (const match of block.matchAll(/^\s{4}([a-z_]+):\s*\{/gm)) { keys.add(match[1]); }
  return keys;
}

async function checkApi() {
  const icons = iconMapKeys();
  pass('weather.js: icon map', `${icons.size} condition keys mapped`);

  for (const [label, url] of [['index.json', BASE + 'index.json'], ['health.php', HEALTH]]) {
    try {
      const { res, acao, body } = await getJson(url);
      if (res.ok) { pass(`${label}: reachable`, `HTTP ${res.status} over ${new URL(url).protocol}`); }
      else { fail(`${label}: reachable`, `HTTP ${res.status}`); }
      checkCors(label, acao);
      if (label === 'health.php' && body?.status !== 'ok') {
        fail('health.php: status', `status is "${body?.status}"`);
      }
    } catch (err) {
      fail(`${label}: reachable`, err.message);
    }
  }

  let rows = [];
  try {
    const { res, acao, body } = await getJson(BASE + 'cities.json');
    checkCors('cities.json', acao);
    if (!res.ok) { fail('cities.json: reachable', `HTTP ${res.status}`); }
    else { pass('cities.json: reachable', `HTTP ${res.status}`); rows = checkCities(body); }
    await checkFileOrigin('cities.json', BASE + 'cities.json');
  } catch (err) { fail('cities.json: reachable', err.message); }

  try {
    const { res, acao, body } = await getJson(BASE + 'timezones.json');
    checkCors('timezones.json', acao);
    if (!res.ok) { fail('timezones.json: reachable', `HTTP ${res.status}`); }
    else { pass('timezones.json: reachable', `HTTP ${res.status}`); checkTimezones(body); }
  } catch (err) { fail('timezones.json: reachable', err.message); }

  if (!rows.length) { return; }

  const sample = rows.length <= SAMPLE
    ? rows
    : rows.filter((_, i) => i % Math.ceil(rows.length / SAMPLE) === 0);
  const problems = [];
  let fetched = 0;

  const queue = sample.slice();
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const row = queue.shift();
      try {
        const res = await fetch(`${BASE}city/${encodeURIComponent(row.slug)}.json`);
        if (!res.ok) { problems.push(`${row.slug}: HTTP ${res.status}`); continue; }
        checkCityDoc(row.slug, await res.json(), icons, problems);
        fetched++;
      } catch (err) { problems.push(`${row.slug}: ${err.message}`); }
    }
  });
  await Promise.all(workers);

  if (problems.length) {
    fail('city documents', `${problems.length} problem(s):\n      ` + problems.slice(0, 15).join('\n      '));
  } else {
    pass('city documents', `${fetched} document(s) match what normalize.js expects`);
  }

  /* An unknown slug must stay a clean 404 so the "city not found" state is reachable. */
  try {
    const res = await fetch(`${BASE}city/definitely-not-a-city.json`);
    if (res.status === 404) { pass('unknown slug', 'HTTP 404, as the not-found state expects'); }
    else { fail('unknown slug', `expected HTTP 404, got ${res.status}`); }
  } catch (err) { fail('unknown slug', err.message); }
}

/* ---------- 1b. the forecast upstream ---------- */

/* Open-Meteo is the app's second permitted origin. It has to clear the same two bars as
   the first: a permissive CORS header, and a shape normalize.forecast still understands. */
async function checkForecast() {
  const wmoKeys = new Set(Object.keys(wmoMapKeys()).map(Number));
  const url = `${METEO}?latitude=41.7225&longitude=44.7925` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,' +
    'precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset' +
    '&timezone=Asia%2FTbilisi&forecast_days=7&temperature_unit=celsius' +
    '&precipitation_unit=mm&timeformat=iso8601';

  try {
    const { res, acao, body } = await getJson(url);
    if (!res.ok) { fail('open-meteo: reachable', `HTTP ${res.status}`); return; }
    pass('open-meteo: reachable', `HTTP ${res.status} over https:`);
    checkCors('open-meteo', acao);
    await checkFileOrigin('open-meteo', url);

    const daily = body?.daily;
    if (!daily || !Array.isArray(daily.time)) {
      fail('open-meteo: shape', 'no daily.time array');
      return;
    }
    pass('open-meteo: shape', `${daily.time.length} days under .daily`);

    const problems = [];
    for (const field of ['weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'precipitation_probability_max', 'sunrise', 'sunset']) {
      if (!Array.isArray(daily[field])) { problems.push(`daily.${field} is missing`); }
      else if (daily[field].length !== daily.time.length) {
        problems.push(`daily.${field} has ${daily[field].length} entries, expected ${daily.time.length}`);
      }
    }
    for (const code of daily.weather_code ?? []) {
      if (!wmoKeys.has(code)) { problems.push(`WMO code ${code} is not in weather.js's map`); }
    }
    /* Sunrise must be bare local wall clock: forecast.js slices the time out of it and
       would silently shift the hour if an offset ever appeared. */
    for (const t of (daily.sunrise ?? []).slice(0, 2)) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) {
        problems.push(`sunrise "${t}" is not bare local wall clock`);
      }
    }
    if (problems.length) {
      fail('open-meteo: fields', [...new Set(problems)].join('; '));
    } else {
      pass('open-meteo: fields', 'every field normalize.forecast reads is present and aligned');
    }
  } catch (err) {
    fail('open-meteo: reachable', err.message);
  }
}

function wmoMapKeys() {
  const source = readFileSync(join(ROOT, 'js', 'weather.js'), 'utf8');
  const block = source.slice(source.indexOf('var WMO = {'), source.indexOf('function get('));
  const out = {};
  for (const match of block.matchAll(/(\d+):\s*'([a-z_]+)'/g)) { out[match[1]] = match[2]; }
  return out;
}

/* ---------- 2. static scan of the shipped source ---------- */

/* README.md is deliberately exempt from the lowercase-filename rule: it is documentation,
   never requested by the browser, and the conventional spelling is uppercase. */
const SCAN_SKIP = new Set(['tools', 'README.md']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SCAN_SKIP.has(name)) { continue; }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full, out); } else { out.push(full); }
  }
  return out;
}

const FORBIDDEN = [
  [/type\s*=\s*["']module["']/, 'ES module script tag'],
  [/^\s*import\s/m, 'ES `import` statement'],
  [/^\s*export\s/m, 'ES `export` statement'],
  [/\bfetch\(\s*["'`](?!https:)/, 'fetch() of a local or relative path'],
  [/\bsrc\s*=\s*["']\//, 'absolute local src="/..."'],
  [/\bhref\s*=\s*["']\/(?!\/)/, 'absolute local href="/..."'],
  [/url\(\s*["']?\/(?!\/)/, 'absolute local url(/...) in CSS']
];

function scanSource() {
  const files = walk(ROOT);
  const problems = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join('/');

    for (const segment of rel.split('/')) {
      if (/[A-Z]/.test(segment)) { problems.push(`${rel}: path segment "${segment}" contains an uppercase letter`); }
      if (segment.startsWith('_')) { problems.push(`${rel}: path segment "${segment}" starts with _ (Jekyll will not publish it)`); }
    }

    if (!/\.(html|css|js)$/.test(file)) { continue; }
    const text = readFileSync(file, 'utf8');
    for (const [pattern, label] of FORBIDDEN) {
      if (pattern.test(text)) { problems.push(`${rel}: ${label}`); }
    }
  }

  /* Every locally referenced asset must exist with exactly that spelling. */
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)\s*=\s*["'](\.\/[^"'?]+)/g)) {
    const target = join(ROOT, match[1].replace(/^\.\//, ''));
    try { statSync(target); } catch { problems.push(`index.html references ${match[1]}, which does not exist`); }
  }

  if (problems.length) {
    fail('static source scan', `${problems.length} problem(s):\n      ` + problems.join('\n      '));
  } else {
    pass('static source scan', `${files.length} shipped file(s) clean`);
  }
}

/* ---------- report ---------- */

scanSource();
await checkApi();
await checkForecast();
checkWmoMap();

let failed = 0;
console.log('\nWorld Time & Weather - verification\n');
for (const r of results) {
  if (!r.ok) { failed++; }
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` - ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
