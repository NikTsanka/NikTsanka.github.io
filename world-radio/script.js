'use strict';

const API = 'https://de1.api.radio-browser.info/json';
const LIMIT = 48;
const FAV_KEY = 'wr-favs';
const FAV_DATA_KEY = 'wr-favs-data';

// ── State ──────────────────────────────────────────────────────────────────────
const stationsById = new Map();
let favIds = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
let favData = JSON.parse(localStorage.getItem(FAV_DATA_KEY) || '[]');

let currentStation = null;
let activeGenres = new Set();
let searchTimer = null;
let offset = 0;
let hasMore = false;
let loading = false;
let showFavs = false;

// ── Audio ──────────────────────────────────────────────────────────────────────
const audio = new Audio();
audio.volume = 0.8;
let playing = false;
let muted = false;
let prevVol = 80;

// ── DOM ────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const grid         = $('stationsGrid');
const searchInput  = $('searchInput');
const searchClear  = $('searchClear');
const countrySelect = $('countrySelect');
const sortSelect   = $('sortSelect');
const resultsInfo  = $('resultsInfo');
const clearAllBtn  = $('clearAllBtn');
const loadMoreWrap = $('loadMoreWrap');
const emptyState   = $('emptyState');
const playerArt    = $('playerArt');
const playerName   = $('playerName');
const playerSub    = $('playerSub');
const playerFavBtn = $('playerFavBtn');
const playerPlayBtn = $('playerPlayBtn');
const playerPlayIcon = $('playerPlayIcon');
const playerVolIcon = $('playerVolIcon');
const favBadge     = $('favBadge');

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme();
    refreshFavBadge();
    initVolSlider();
    bindAudio();

    await Promise.all([loadCountries(), loadGenres()]);
    await fetchStations(true);
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function flagOf(code) {
    if (!code || code.length !== 2) return '🌍';
    return [...code.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

function esc(s) {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

async function apiFetch(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme() {
    if (localStorage.getItem('rb-theme') === 'light') {
        document.body.classList.add('light-mode');
        $('themeIcon').className = 'fas fa-sun';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const light = document.body.classList.contains('light-mode');
    $('themeIcon').className = light ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('rb-theme', light ? 'light' : 'dark');
}

// ── Countries ──────────────────────────────────────────────────────────────────
async function loadCountries() {
    try {
        const data = await apiFetch('/countries?order=name&hidebroken=true');
        data.filter(c => c.stationcount >= 5).forEach(c => {
            const o = new Option(
                `${flagOf(c.iso_3166_1)} ${c.name} (${c.stationcount})`,
                c.iso_3166_1
            );
            countrySelect.add(o);
        });
    } catch (e) {
        console.warn('Countries load failed:', e);
    }
}

// ── Genres ─────────────────────────────────────────────────────────────────────
async function loadGenres() {
    try {
        const data = await apiFetch('/tags?order=stationcount&reverse=true&limit=80&hidebroken=true');
        const genreChips = $('genreChips');
        genreChips.innerHTML = '';

        data
            .filter(t => t.stationcount >= 80 && t.name.length >= 2 && t.name.length <= 20 && !/^\d/.test(t.name))
            .slice(0, 28)
            .forEach(tag => {
                const btn = document.createElement('button');
                btn.className = 'genre-chip';
                btn.textContent = cap(tag.name);
                btn.dataset.genre = tag.name;
                btn.addEventListener('click', () => {
                    if (activeGenres.has(tag.name)) {
                        activeGenres.delete(tag.name);
                        btn.classList.remove('active');
                    } else {
                        activeGenres.add(tag.name);
                        btn.classList.add('active');
                    }
                    applyFilters();
                });
                genreChips.appendChild(btn);
            });
    } catch (e) {
        $('genreChips').innerHTML = '';
        console.warn('Genres load failed:', e);
    }
}

// ── Fetch stations ─────────────────────────────────────────────────────────────
function buildParams(off = 0) {
    const p = new URLSearchParams({
        hidebroken: 'true',
        order: sortSelect.value || 'votes',
        reverse: 'true',
        limit: LIMIT,
        offset: off
    });
    const q = searchInput.value.trim();
    if (q) p.set('name', q);
    if (countrySelect.value) p.set('countrycode', countrySelect.value);
    if (activeGenres.size) p.set('tagList', [...activeGenres].join(','));
    return p;
}

async function fetchStations(reset = false) {
    if (loading) return;
    if (showFavs) { renderFavs(); return; }
    loading = true;

    if (reset) {
        offset = 0;
        grid.innerHTML = skeletons();
        loadMoreWrap.style.display = 'none';
        emptyState.style.display = 'none';
    }

    try {
        const data = await apiFetch('/stations/search?' + buildParams(offset));
        if (reset) grid.innerHTML = '';

        if (data.length === 0 && offset === 0) {
            emptyState.style.display = 'flex';
            resultsInfo.textContent = 'No stations found';
        } else {
            data.forEach(s => {
                stationsById.set(s.stationuuid, s);
                grid.appendChild(buildCard(s));
            });
            offset += data.length;
            hasMore = data.length === LIMIT;
            loadMoreWrap.style.display = hasMore ? 'flex' : 'none';
            resultsInfo.textContent = `${offset}+ stations`;
        }
    } catch (e) {
        console.error('fetchStations error:', e);
        if (reset) {
            grid.innerHTML = `<div class="error-block">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load stations</p>
                <button onclick="fetchStations(true)">Retry</button>
            </div>`;
        }
    }

    loading = false;
    refreshClearBtn();
}

function skeletons() {
    return Array(12).fill(0).map(() => `
        <div class="station-card sk-card">
            <div class="sk-art"></div>
            <div class="sk-body">
                <div class="sk-line w70"></div>
                <div class="sk-line w45"></div>
                <div class="sk-tags">
                    <div class="sk-tag"></div><div class="sk-tag"></div>
                </div>
            </div>
            <div class="sk-btns">
                <div class="sk-btn"></div><div class="sk-btn"></div>
            </div>
        </div>`
    ).join('');
}

// ── Build card ─────────────────────────────────────────────────────────────────
function buildCard(s) {
    const isFav = favIds.has(s.stationuuid);
    const isCur = currentStation?.stationuuid === s.stationuuid;
    const tags = (s.tags || '').split(',').map(t => t.trim()).filter(t => t && t.length < 24).slice(0, 3);
    const flag = flagOf(s.countrycode);
    const br = s.bitrate > 0 ? `${s.bitrate}k` : '';

    const card = document.createElement('div');
    card.className = `station-card${isCur ? ' now-playing' : ''}`;
    card.dataset.uuid = s.stationuuid;

    const artHtml = s.favicon
        ? `<img src="${esc(s.favicon)}" alt="" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="art-ph" style="display:none"><i class="fas fa-radio"></i></div>`
        : `<div class="art-ph"><i class="fas fa-radio"></i></div>`;

    card.innerHTML = `
        <div class="card-art">${artHtml}</div>
        <div class="card-body">
            <div class="card-name" title="${esc(s.name)}">${esc(s.name)}</div>
            <div class="card-meta">
                <span class="card-country">${flag} ${esc(s.country || s.countrycode || '')}</span>
                ${br ? `<span class="card-br">${br}</span>` : ''}
            </div>
            ${tags.length ? `<div class="card-tags">${tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="card-btns">
            <button class="btn-heart ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <button class="btn-play ${isCur && playing ? 'active' : ''}" title="Play">
                <i class="fas ${isCur && playing ? 'fa-pause' : 'fa-play'}"></i>
            </button>
        </div>
        ${isCur ? '<div class="eq-bar"><span></span><span></span><span></span></div>' : ''}
    `;

    card.querySelector('.btn-heart').addEventListener('click', e => {
        e.stopPropagation();
        toggleFav(s.stationuuid, e.currentTarget);
    });

    card.querySelector('.btn-play').addEventListener('click', e => {
        e.stopPropagation();
        tuneIn(s.stationuuid);
    });

    card.addEventListener('click', () => tuneIn(s.stationuuid));
    return card;
}

// ── Playback ───────────────────────────────────────────────────────────────────
async function tuneIn(uuid) {
    const s = stationsById.get(uuid);
    if (!s) return;

    if (currentStation?.stationuuid === uuid) {
        togglePlay();
        return;
    }

    currentStation = s;

    // Update player bar
    playerName.textContent = s.name;
    const subParts = [
        flagOf(s.countrycode) + ' ' + (s.country || s.countrycode || ''),
        (s.tags || '').split(',')[0]?.trim()
    ].filter(Boolean);
    playerSub.textContent = subParts.join(' · ') || 'World Radio';

    if (s.favicon) {
        playerArt.innerHTML = `<img src="${esc(s.favicon)}" alt=""
            onerror="this.parentElement.innerHTML='<i class=\\"fas fa-radio\\"></i>'">`;
        // Ambient background
        $('bgBlur').style.backgroundImage = `url('${esc(s.favicon)}')`;
    } else {
        playerArt.innerHTML = '<i class="fas fa-radio"></i>';
        $('bgBlur').style.backgroundImage = "url('/img/cover.png')";
    }

    playerPlayBtn.disabled = false;
    refreshPlayerFav();

    // Update card states
    document.querySelectorAll('.station-card').forEach(card => {
        const isThis = card.dataset.uuid === uuid;
        card.classList.toggle('now-playing', isThis);
        const pb = card.querySelector('.btn-play');
        const eq = card.querySelector('.eq-bar');
        if (isThis) {
            if (!eq) {
                const bar = document.createElement('div');
                bar.className = 'eq-bar';
                bar.innerHTML = '<span></span><span></span><span></span>';
                card.appendChild(bar);
            }
        } else {
            if (eq) eq.remove();
            if (pb) {
                pb.classList.remove('active');
                pb.querySelector('i').className = 'fas fa-play';
            }
        }
    });

    // Register click with API (non-blocking)
    fetch(`${API}/url/${uuid}`).catch(() => {});

    audio.src = s.url_resolved || s.url;
    audio.load();
    try {
        await audio.play();
    } catch (e) {
        console.error('Play failed:', e);
        showToast('Could not play this station', true);
    }
}

function togglePlay() {
    if (!currentStation) return;
    if (audio.paused) {
        audio.play().catch(console.error);
    } else {
        audio.pause();
    }
}

function setVolume(val) {
    audio.volume = val / 100;
    muted = false;
    audio.muted = false;
    prevVol = +val;
    updateVolUI(+val);
}

function toggleMute() {
    muted = !muted;
    audio.muted = muted;
    const slider = $('volSlider');
    if (muted) {
        slider.value = 0;
        slider.style.background = 'linear-gradient(to right, #c9a96e 0%, rgba(255,255,255,0.15) 0%)';
        playerVolIcon.className = 'fas fa-volume-mute player-vol-icon';
    } else {
        slider.value = prevVol;
        updateVolUI(prevVol);
    }
}

function updateVolUI(val) {
    const slider = $('volSlider');
    slider.style.background = `linear-gradient(to right, #c9a96e ${val}%, rgba(255,255,255,0.15) ${val}%)`;
    playerVolIcon.className = `fas fa-volume-${val <= 0 ? 'mute' : val < 50 ? 'down' : 'up'} player-vol-icon`;
}

function initVolSlider() {
    $('volSlider').style.background = 'linear-gradient(to right, #c9a96e 80%, rgba(255,255,255,0.15) 80%)';
}

function bindAudio() {
    audio.addEventListener('play', () => {
        playing = true;
        playerPlayIcon.className = 'fas fa-pause';
        playerPlayBtn.classList.add('playing');
        updateCurrentCard(true);
        document.title = (currentStation?.name || 'Playing') + ' — World Radio';
    });

    audio.addEventListener('pause', () => {
        playing = false;
        playerPlayIcon.className = 'fas fa-play';
        playerPlayBtn.classList.remove('playing');
        updateCurrentCard(false);
        document.title = 'World Radio — Radio Hangi';
    });

    audio.addEventListener('waiting', () => {
        playerPlayIcon.className = 'fas fa-spinner fa-spin';
    });

    audio.addEventListener('playing', () => {
        playerPlayIcon.className = 'fas fa-pause';
    });

    audio.addEventListener('error', () => {
        showToast('Stream error — try another station', true);
        playing = false;
        playerPlayIcon.className = 'fas fa-play';
        playerPlayBtn.classList.remove('playing');
    });
}

function updateCurrentCard(nowPlaying) {
    if (!currentStation) return;
    const card = document.querySelector(`.station-card[data-uuid="${currentStation.stationuuid}"]`);
    if (!card) return;
    const pb = card.querySelector('.btn-play');
    if (pb) {
        pb.classList.toggle('active', nowPlaying);
        pb.querySelector('i').className = `fas ${nowPlaying ? 'fa-pause' : 'fa-play'}`;
    }
}

// ── Favorites ──────────────────────────────────────────────────────────────────
function toggleFav(uuid, btnEl) {
    const s = stationsById.get(uuid);
    if (!s) return;

    if (favIds.has(uuid)) {
        favIds.delete(uuid);
        favData = favData.filter(f => f.stationuuid !== uuid);
        if (btnEl) {
            btnEl.classList.remove('active');
            btnEl.querySelector('i').className = 'far fa-heart';
        }
        showToast('Removed from favorites');
    } else {
        favIds.add(uuid);
        if (!favData.some(f => f.stationuuid === uuid)) favData.push(s);
        if (btnEl) {
            btnEl.classList.add('active');
            btnEl.querySelector('i').className = 'fas fa-heart';
        }
        showToast('Added to favorites ❤️');
    }

    saveFavs();
    refreshFavBadge();
    refreshPlayerFav();
    if (showFavs) renderFavs();
}

function toggleCurrentFav() {
    if (!currentStation) return;
    const uuid = currentStation.stationuuid;
    const cardHeart = document.querySelector(`.station-card[data-uuid="${uuid}"] .btn-heart`);
    toggleFav(uuid, cardHeart);
}

function saveFavs() {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favIds]));
    localStorage.setItem(FAV_DATA_KEY, JSON.stringify(favData));
}

function refreshFavBadge() {
    favBadge.textContent = favIds.size;
    favBadge.style.display = favIds.size > 0 ? 'flex' : 'none';
}

function refreshPlayerFav() {
    if (!currentStation) return;
    const isFav = favIds.has(currentStation.stationuuid);
    playerFavBtn.querySelector('i').className = isFav ? 'fas fa-heart' : 'far fa-heart';
    playerFavBtn.classList.toggle('active', isFav);
}

function toggleFavsView() {
    showFavs = !showFavs;
    $('favViewBtn').classList.toggle('active', showFavs);
    loadMoreWrap.style.display = 'none';
    emptyState.style.display = 'none';
    if (showFavs) {
        renderFavs();
    } else {
        fetchStations(true);
    }
}

function renderFavs() {
    grid.innerHTML = '';
    if (favData.length === 0) {
        grid.innerHTML = `<div class="empty-favs">
            <i class="fas fa-heart-broken"></i>
            <p>No favorites yet</p>
            <span>Click ♡ on any station to save it here</span>
        </div>`;
        resultsInfo.textContent = 'Your favorites';
        return;
    }
    favData.forEach(s => {
        stationsById.set(s.stationuuid, s);
        grid.appendChild(buildCard(s));
    });
    resultsInfo.textContent = `${favData.length} favorite${favData.length !== 1 ? 's' : ''}`;
}

// ── Filters ────────────────────────────────────────────────────────────────────
function onSearch() {
    const hasVal = searchInput.value.trim().length > 0;
    searchClear.style.display = hasVal ? 'flex' : 'none';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchStations(true), 500);
}

function clearSearch() {
    searchInput.value = '';
    searchClear.style.display = 'none';
    fetchStations(true);
}

function applyFilters() {
    fetchStations(true);
}

function clearAllFilters() {
    searchInput.value = '';
    countrySelect.value = '';
    sortSelect.value = 'votes';
    activeGenres.clear();
    searchClear.style.display = 'none';
    clearAllBtn.style.display = 'none';
    document.querySelectorAll('.genre-chip.active').forEach(c => c.classList.remove('active'));
    fetchStations(true);
}

function refreshClearBtn() {
    const has = searchInput.value.trim() || countrySelect.value || activeGenres.size > 0;
    clearAllBtn.style.display = has ? 'inline-flex' : 'none';
}

function loadMore() {
    fetchStations(false);
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const t = $('toast');
    t.innerHTML = `<i class="fas fa-music"></i> ${msg}`;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
