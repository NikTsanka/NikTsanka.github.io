const RADIO_NAME = 'Radio Bude';
const URL_STREAMING = 'https://stream.zeno.fm/bjclt64fhc4uv';
const url = 'https://api.zeno.fm/mounts/metadata/subscribe/bjclt64fhc4uv';
const API_KEY = "7e1295fe03484ef960e8edc5d4dc04a5";
let showHistory = true;

// Initialize audio with autoplay attributes
var audio = new Audio();
audio.src = URL_STREAMING;
audio.preload = 'auto';
audio.crossOrigin = "anonymous";

var musicHistory = [];
var isPlaying = false;
var autoplayAttempted = false;

// Page class for DOM control
class Page {
	changeTitlePage(title = RADIO_NAME) {
		document.title = title;
	}

	refreshCurrentSong(song, artist, album = '') {
		var currentSong = document.getElementById('currentSong');
		var currentArtist = document.getElementById('currentArtist');
		var currentAlbum = document.getElementById('currentAlbum');

		if (song !== currentSong.innerHTML) {
			currentSong.className = 'current-song animated flipInY';
			currentSong.innerHTML = song;
			currentArtist.className = 'current-artist animated flipInY';
			currentArtist.innerHTML = artist;
			currentAlbum.innerHTML = album;

			document.getElementById('lyricsSong').innerHTML = song + ' - ' + artist;

			setTimeout(function () {
				currentSong.className = 'current-song';
				currentArtist.className = 'current-artist';
				checkMarquee();
			}, 2000);
		}
	}

	refreshCover(song = '', artist) {
		var coverArt = document.getElementById('currentCoverArt');
		coverArt.classList.add('loading');

		const script = document.createElement('script');
		script.src = `https://api.deezer.com/search?q=${encodeURIComponent(artist)} ${encodeURIComponent(song)}&output=jsonp&callback=handleDeezerResponse`;
		document.body.appendChild(script);
	}

	changeVolumeIndicator(volume) {
		document.getElementById('volIndicator').innerHTML = Math.round(volume);
		if (typeof (Storage) !== 'undefined') {
			// Note: localStorage is not used in Claude.ai environment
			// Volume will reset on page reload
		}
	}

	setVolume() {
		// Default volume
		var defaultVolume = 80;
		document.getElementById('volume').value = defaultVolume;
		document.getElementById('volIndicator').innerHTML = defaultVolume;
		audio.volume = defaultVolume / 100;
	}

	// refreshLyric(currentSong, currentArtist) {
	// 	var openLyric = document.getElementById('lyricsButton');
	// 	openLyric.style.opacity = "0.5";
	// 	openLyric.onclick = function () {
	// 		alert('Lyrics service temporarily unavailable');
	// 	};
	// }

	refreshLyric(currentSong, currentArtist) {
		fetchLyrics(currentSong, currentArtist);
	}
}

// Player class
class Player {
	async play() {
		try {
			await audio.play();
			isPlaying = true;
			console.log('Audio started playing successfully');
		} catch (error) {
			console.log('Autoplay failed:', error.message);
			isPlaying = false;

			// Show user-friendly message for autoplay failure
			this.showAutoplayMessage();
		}
	}

	pause() {
		audio.pause();
		isPlaying = false;
	}

	showAutoplayMessage() {
		// Create a subtle notification for autoplay failure
		const notification = document.createElement('div');
		notification.style.cssText = `
			position: fixed;
			top: 70px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(78, 205, 196, 0.9);
			color: white;
			padding: 10px 20px;
			border-radius: 20px;
			font-size: 14px;
			z-index: 1001;
			animation: slideDown 0.3s ease;
		`;
		notification.innerHTML = '🎵 Click the play button to start the radio';
		document.body.appendChild(notification);

		// Remove notification after 5 seconds
		setTimeout(() => {
			if (notification.parentNode) {
				notification.remove();
			}
		}, 5000);

		// Remove notification if user clicks play
		document.getElementById('playerButton').addEventListener('click', () => {
			if (notification.parentNode) {
				notification.remove();
			}
		}, { once: true });
	}

	// Attempt autoplay on first user interaction
	attemptAutoplayOnInteraction() {
		if (!autoplayAttempted && !isPlaying) {
			autoplayAttempted = true;
			this.play();
		}
	}
}

// Global function to handle Deezer response
function handleDeezerResponse(data) {
	var coverArt = document.getElementById('currentCoverArt');
	var backgroundCover = document.getElementById('backgroundCover');
	coverArt.classList.remove('loading');

	// Default cover image path
	const defaultCoverUrl = 'cover.png';

	if (data.data && data.data.length > 0) {
		var artworkUrl = data.data[0].album.cover_big;
		currentCoverUrl = artworkUrl;
		coverArt.style.backgroundImage = 'url(' + artworkUrl + ')';
		coverArt.className = 'current-cover animated bounceInLeft';
		backgroundCover.style.backgroundImage = 'url(' + artworkUrl + ')';
		extractAmbientColor(artworkUrl);

		if (isPlaying) {
			coverArt.classList.add('playing');
		}
	} else {
		// Use default cover.png when no album art is found
		coverArt.style.backgroundImage = 'url(' + defaultCoverUrl + ')';
		backgroundCover.style.backgroundImage = 'url(' + defaultCoverUrl + ')';
	}

	setTimeout(function () {
		coverArt.className = 'current-cover';
		if (isPlaying) {
			coverArt.classList.add('playing');
		}
	}, 2000);
}

// Audio event handlers
audio.onplay = function () {
	var button = document.getElementById('playerButton');
	button.className = 'fa fa-pause';
	document.getElementById('currentCoverArt').classList.add('playing');
	document.getElementById('equalizer').classList.add('active');
	setStreamStatus('connected');
	isPlaying = true;
}

audio.onpause = function () {
	var button = document.getElementById('playerButton');
	button.className = 'fa fa-play';
	document.getElementById('currentCoverArt').classList.remove('playing');
	document.getElementById('equalizer').classList.remove('active');
	setStreamStatus('');
	isPlaying = false;
}

audio.onvolumechange = function () {
	if (audio.volume > 0) {
		audio.muted = false;
	}
}

audio.onerror = function () {
	var confirmation = confirm('Stream Down / Network Error. \nClick OK to try again.');
	if (confirmation) {
		window.location.reload();
	}
}

// Enhanced audio loading events
audio.oncanplaythrough = function () {
	console.log('Audio can play through - ready for autoplay attempt');
}

audio.onloadeddata = function () {
	console.log('Audio data loaded');
}

// Control functions
function togglePlay() {
	if (!audio.paused) {
		audio.pause();
	} else {
		audio.load();
		audio.play().catch(e => console.log('Play failed:', e));
	}
}

function updateVolume(value) {
	audio.volume = intToDecimal(value);
	var page = new Page();
	page.changeVolumeIndicator(value);
	var slider = document.getElementById('volume');
	slider.style.background = `linear-gradient(to right, #c9a96e ${value}%, rgba(255,255,255,0.2) ${value}%)`;
}

function mute() {
	var icon = document.getElementById('muteIcon');
	if (!audio.muted) {
		document.getElementById('volIndicator').innerHTML = 0;
		document.getElementById('volume').value = 0;
		audio.volume = 0;
		audio.muted = true;
		icon.className = 'fa fa-volume-off';
	} else {
		var defaultVolume = 80;
		document.getElementById('volIndicator').innerHTML = defaultVolume;
		document.getElementById('volume').value = defaultVolume;
		audio.volume = intToDecimal(defaultVolume);
		audio.muted = false;
		icon.className = 'fa fa-volume-up';
	}
}

function intToDecimal(vol) {
	return vol / 100;
}

function decimalToInt(vol) {
	return vol * 100;
}

// Mock streaming data function (since we can't connect to external APIs in this environment)
function getStreamingData(data) {
	var jsonData = JSON.parse(data);
	var page = new Page();

	let song = jsonData.currentSong.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');
	let artist = jsonData.currentArtist.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');

	document.title = song + ' - ' + artist + ' | ' + RADIO_NAME;
	page.refreshCover(song, artist);
	page.refreshCurrentSong(song, artist);
	page.refreshLyric(song, artist);
	showToast('Now Playing: <strong>' + song + '</strong>');
	sendNowPlayingNotification(song, artist);

	if (showHistory) {
		if (musicHistory.length === 0 || (musicHistory[0].song !== song)) {
			updateMusicHistory(artist, song);
		}
		updateHistoryUI();
	}
}

// Function to connect to event source for real-time updates
function connectToEventSource(url) {
	const eventSource = new EventSource(url);

	eventSource.addEventListener('message', function (event) {
		processData(event.data, url);
	});

	eventSource.addEventListener('error', function (event) {
		console.error('Event source connection error:', event);
		setStreamStatus('reconnecting');
		setTimeout(function () {
			connectToEventSource(url);
		}, 5000);
	});
}

function processData(data) {
	const parsedData = JSON.parse(data);

	if (parsedData.streamTitle) {
		let artist, song;
		const streamTitle = parsedData.streamTitle;

		if (streamTitle.includes(' - ')) {
			[artist, song] = streamTitle.split(' - ');
		} else {
			artist = '';
			song = streamTitle;
		}

		const formattedData = {
			currentSong: song.trim(),
			currentArtist: artist.trim()
		};

		getStreamingData(JSON.stringify(formattedData));
	}
}

// History functions
function updateMusicHistory(artist, song) {
	musicHistory.unshift({ artist: artist, song: song });
	if (musicHistory.length > 10) {
		musicHistory.pop();
	}
}

function updateHistoryUI() {
	var historyContainer = document.getElementById('songHistory');
	historyContainer.innerHTML = '';

	// Skip the first item (current song) and show the rest
	for (var i = 1; i < musicHistory.length && i < 11; i++) {
		var songItem = document.createElement('div');
		songItem.className = 'song-item animated slideInRight';

		songItem.innerHTML = `
                    <div class="song-cover skeleton"></div>
                    <div class="song-info">
                        <div class="song-name">${musicHistory[i].song}</div>
                        <div class="song-artist">${musicHistory[i].artist}</div>
                    </div>
                `;

		historyContainer.appendChild(songItem);

		// Fetch cover for history item
		refreshCoverForHistory(musicHistory[i].song, musicHistory[i].artist, i - 1);
	}

	setTimeout(function () {
		var items = document.querySelectorAll('.song-item');
		items.forEach(item => {
			item.classList.remove('animated', 'slideInRight');
		});
		updateScrollIndicator();
	}, 2000);
}

function refreshCoverForHistory(song, artist, index) {
	const script = document.createElement('script');
	script.src = `https://api.deezer.com/search?q=${encodeURIComponent(artist)} ${encodeURIComponent(song)}&output=jsonp&callback=handleDeezerResponseForHistory_${index}`;
	document.body.appendChild(script);

	window['handleDeezerResponseForHistory_' + index] = function (data) {
		const defaultCoverUrl = 'cover.png';
		var coverElements = document.querySelectorAll('#songHistory .song-cover');
		var el = coverElements[index];
		if (!el) return;
		el.classList.remove('skeleton');
		if (data.data && data.data.length > 0) {
			el.style.backgroundImage = 'url(' + data.data[0].album.cover_big + ')';
		} else {
			el.style.backgroundImage = 'url(' + defaultCoverUrl + ')';
		}
	};
}

// Sleep timer
var sleepTimerOptions = [0, 15, 30, 60];
var sleepTimerIndex = 0;
var sleepTimerTimeout = null;
var sleepTimerInterval = null;

function cycleSleepTimer() {
	sleepTimerIndex = (sleepTimerIndex + 1) % sleepTimerOptions.length;
	var minutes = sleepTimerOptions[sleepTimerIndex];
	var btn = document.getElementById('sleepTimerBtn');

	clearTimeout(sleepTimerTimeout);
	clearInterval(sleepTimerInterval);

	if (minutes === 0) {
		btn.innerHTML = '<i class="fas fa-moon"></i>';
		btn.title = 'Sleep timer: Off';
		btn.classList.remove('active');
		return;
	}

	btn.classList.add('active');
	btn.title = 'Sleep timer: ' + minutes + ' min';
	var remaining = minutes * 60;
	updateSleepTimerDisplay(remaining);

	sleepTimerInterval = setInterval(function () {
		remaining--;
		updateSleepTimerDisplay(remaining);
	}, 1000);

	sleepTimerTimeout = setTimeout(function () {
		clearInterval(sleepTimerInterval);
		audio.pause();
		sleepTimerIndex = 0;
		btn.innerHTML = '<i class="fas fa-moon"></i>';
		btn.classList.remove('active');
		showToast('Sleep timer: Radio paused', true);
	}, minutes * 60 * 1000);
}

function updateSleepTimerDisplay(seconds) {
	var mins = Math.floor(seconds / 60);
	var secs = seconds % 60;
	document.getElementById('sleepTimerBtn').innerHTML =
		'<i class="fas fa-moon"></i><span class="timer-countdown">' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</span>';
}

// Browser notifications
var currentCoverUrl = '/img/cover.png';

function requestNotificationPermission() {
	if ('Notification' in window && Notification.permission === 'default') {
		Notification.requestPermission();
	}
}

function sendNowPlayingNotification(song, artist) {
	if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
		new Notification('♪ ' + song, {
			body: artist,
			icon: currentCoverUrl,
			tag: 'now-playing',
			silent: true
		});
	}
}

// Scroll indicator
function updateScrollIndicator() {
	var panel = document.querySelector('.left-panel');
	var fade = document.getElementById('scrollFade');
	if (!panel || !fade) return;
	var atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 10;
	fade.style.opacity = atBottom ? '0' : '1';
}

// Ambient color from cover art
function extractAmbientColor(imageUrl) {
	var img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = function () {
		var canvas = document.createElement('canvas');
		canvas.width = 8;
		canvas.height = 8;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, 8, 8);
		try {
			var data = ctx.getImageData(0, 0, 8, 8).data;
			var r = 0, g = 0, b = 0, count = data.length / 4;
			for (var i = 0; i < data.length; i += 4) {
				r += data[i]; g += data[i + 1]; b += data[i + 2];
			}
			applyAmbientColor(Math.round(r / count), Math.round(g / count), Math.round(b / count));
		} catch (e) {}
	};
	img.src = imageUrl;
}

function applyAmbientColor(r, g, b) {
	document.querySelector('.right-panel').style.background =
		'radial-gradient(ellipse at center, rgba(' + r + ',' + g + ',' + b + ',0.18) 0%, transparent 70%)';
}

// Theme toggle
function toggleTheme() {
	var body = document.body;
	var icon = document.getElementById('themeIcon');
	body.classList.toggle('light-mode');
	if (body.classList.contains('light-mode')) {
		icon.className = 'fas fa-sun';
		localStorage.setItem('rb-theme', 'light');
	} else {
		icon.className = 'fas fa-moon';
		localStorage.setItem('rb-theme', 'dark');
	}
}

// Share current song
function shareCurrentSong() {
	var song = document.getElementById('currentSong').innerText;
	var artist = document.getElementById('currentArtist').innerText;
	var text = '🎵 Now listening to: ' + song + ' by ' + artist + ' on Radio Bude | radiobude.com';

	if (navigator.share) {
		navigator.share({ title: 'Radio Bude', text: text, url: window.location.href }).catch(function(){});
	} else if (navigator.clipboard) {
		navigator.clipboard.writeText(text).then(function () {
			showToast('Copied to clipboard!', true);
		});
	} else {
		var el = document.createElement('textarea');
		el.value = text;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		showToast('Copied to clipboard!', true);
	}
}

// Stream quality indicator
function setStreamStatus(status) {
	var dot = document.getElementById('streamIndicator');
	if (!dot) return;
	dot.className = 'stream-indicator ' + status;
	var labels = { connected: 'Connected', reconnecting: 'Reconnecting...', error: 'Stream error', '': 'Disconnected' };
	dot.title = labels[status] || 'Disconnected';
}

// Shortcuts popup
function toggleShortcuts() {
	document.getElementById('shortcutsPopup').classList.toggle('open');
}

document.addEventListener('click', function (e) {
	var btn = document.getElementById('shortcutsBtn');
	var popup = document.getElementById('shortcutsPopup');
	if (popup && btn && !popup.contains(e.target) && !btn.contains(e.target)) {
		popup.classList.remove('open');
	}
});

// Lyrics panel
function toggleLyricsPanel() {
	var panel = document.getElementById('lyricsPanel');
	var tab = document.getElementById('lyricsTab');
	panel.classList.toggle('open');
	if (tab) tab.classList.toggle('panel-open');
}

function openModal() { toggleLyricsPanel(); }
function closeModal() {
	document.getElementById('lyricsPanel').classList.remove('open');
	var tab = document.getElementById('lyricsTab');
	if (tab) tab.classList.remove('panel-open');
}

// Hamburger menu
function toggleMenu() {
	document.getElementById('navDropdown').classList.toggle('open');
}

document.addEventListener('click', function (e) {
	var btn = document.getElementById('hamburgerBtn');
	var dropdown = document.getElementById('navDropdown');
	if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
		dropdown.classList.remove('open');
	}
});

// Toast notification
var toastEnabled = false;
var toastTimer = null;

function showToast(message, force) {
	if (!toastEnabled && !force) return;
	var toast = document.getElementById('toast');
	toast.innerHTML = '<i class="fas fa-music"></i> ' + message;
	toast.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 3500);
}

// Marquee for long song titles
function checkMarquee() {
	var el = document.getElementById('currentSong');
	var wrapper = el.parentElement;
	var overflow = el.scrollWidth - wrapper.offsetWidth;
	if (overflow > 10) {
		el.classList.add('marquee');
		el.style.setProperty('--marquee-offset', `-${overflow}px`);
	} else {
		el.classList.remove('marquee');
		el.style.removeProperty('--marquee-offset');
	}
}

// Fetch lyrics automatically on song change
async function fetchLyrics(song, artist) {
	var lyricContainer = document.getElementById('lyric');
	var lyricTitle = document.getElementById('lyricsSong');

	lyricTitle.innerHTML = `${artist} - ${song}`;
	lyricContainer.innerHTML = '<p class="loading-lyrics">Loading lyrics...</p>';

	try {
		const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`);
		const data = await response.json();
		if (data.lyrics) {
			lyricContainer.innerHTML = `<pre>${data.lyrics}</pre>`;
		} else {
			lyricContainer.innerHTML = '<p>Lyrics not found for this song.</p>';
		}
	} catch (error) {
		lyricContainer.innerHTML = '<p>Error loading lyrics.</p>';
	}
}

// Enhanced keyboard shortcuts with autoplay trigger
document.addEventListener('keydown', function (event) {
	var key = event.key;
	var slideVolume = document.getElementById('volume');
	var page = new Page();
	var player = new Player();

	// Trigger autoplay on any key interaction if not attempted yet
	player.attemptAutoplayOnInteraction();

	switch (key) {
		case 'ArrowUp':
			event.preventDefault();
			var currentVol = Math.min(100, parseInt(slideVolume.value) + 5);
			slideVolume.value = currentVol;
			updateVolume(currentVol);
			break;
		case 'ArrowDown':
			event.preventDefault();
			var currentVol = Math.max(0, parseInt(slideVolume.value) - 5);
			slideVolume.value = currentVol;
			updateVolume(currentVol);
			break;
		case ' ':
		case 'Spacebar':
			event.preventDefault();
			togglePlay();
			break;
		case 'p':
		case 'P':
			event.preventDefault();
			togglePlay();
			break;
		case 'm':
		case 'M':
			event.preventDefault();
			mute();
			break;
		case 'l':
		case 'L':
			event.preventDefault();
			toggleLyricsPanel();
			break;
		case '0':
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9':
			event.preventDefault();
			var volumeValue = parseInt(key) * 10;
			audio.volume = volumeValue / 100;
			slideVolume.value = volumeValue;
			page.changeVolumeIndicator(volumeValue);
			break;
	}
});

// Add click event listeners for autoplay trigger
function addAutoplayTriggers() {
	var player = new Player();

	// Add event listeners to common interactive elements
	document.body.addEventListener('click', function () {
		player.attemptAutoplayOnInteraction();
	}, { once: true });

	// Specific listeners for volume and play controls
	document.getElementById('volume').addEventListener('input', function () {
		player.attemptAutoplayOnInteraction();
	});

	document.querySelector('.volume-icon').addEventListener('click', function () {
		player.attemptAutoplayOnInteraction();
	});
}

// Initialize the application with autoplay
window.onload = function () {
	var page = new Page();
	var player = new Player();

	page.changeTitlePage();
	page.setVolume();

	// Load saved theme
	if (localStorage.getItem('rb-theme') === 'light') {
		document.body.classList.add('light-mode');
		document.getElementById('themeIcon').className = 'fas fa-sun';
	}

	// Add autoplay interaction triggers
	addAutoplayTriggers();

	// Notification permission
	requestNotificationPermission();

	// Scroll indicator
	var leftPanel = document.querySelector('.left-panel');
	if (leftPanel) {
		leftPanel.addEventListener('scroll', updateScrollIndicator);
		updateScrollIndicator();
	}

	// Connect to real-time streaming data
	connectToEventSource(url);

	// Load initial song data
	getStreamingData(JSON.stringify({
		currentSong: "Music Title",
		currentArtist: "Artist"
	}));

	// Set up lyrics button click handler
	// document.getElementById('lyricsButton').onclick = function (e) {
	// 	e.preventDefault();
	// 	if (this.style.opacity !== "0.5") {
	// 		openModal();
	// 	}
	// };

	// Attempt autoplay after a short delay to ensure page is fully loaded
	setTimeout(function () {
		console.log('Attempting autoplay...');
		player.play();
	}, 1000);

	setTimeout(function () { toastEnabled = true; }, 3000);
};