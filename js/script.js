const RADIO_NAME = 'Can3X WebRadio';
const URL_STREAMING = 'https://stream.zeno.fm/bjclt64fhc4uv';
const url = 'https://api.zeno.fm/mounts/metadata/subscribe/bjclt64fhc4uv';
const API_KEY = "7e1295fe03484ef960e8edc5d4dc04a5";
let showHistory = true;

// Initialize audio
var audio = new Audio(URL_STREAMING);
var musicHistory = [];
var isPlaying = false;

// Page class for DOM control
class Page {
	changeTitlePage(title = RADIO_NAME) {
		document.title = title;
	}

	refreshCurrentSong(song, artist, album = 'Timeless') {
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
	}

	refreshLyric(currentSong, currentArtist) {
		var openLyric = document.getElementById('lyricsButton');
		openLyric.style.opacity = "0.5";
		openLyric.onclick = function () {
			alert('Lyrics service temporarily unavailable');
		};
	}
}

// Player class
class Player {
	play() {
		audio.crossOrigin = "anonymous";
		audio.play().then(() => {
			isPlaying = true;
			var defaultVolume = document.getElementById('volume').value;
			audio.volume = intToDecimal(defaultVolume);
			document.getElementById('volIndicator').innerHTML = defaultVolume;
		}).catch(e => {
			console.log('Playback failed:', e);
		});
	}

	pause() {
		audio.pause();
		isPlaying = false;
	}
}

// Global function to handle Deezer response
function handleDeezerResponse(data) {
	var coverArt = document.getElementById('currentCoverArt');
	var backgroundCover = document.getElementById('backgroundCover');
	coverArt.classList.remove('loading');

	const defaultCoverUrl = 'cover.png';

	if (data.data && data.data.length > 0) {
		var artworkUrl = data.data[0].album.cover_big;
		coverArt.style.backgroundImage = 'url(' + artworkUrl + ')';
		coverArt.className = 'current-cover animated bounceInLeft';

		// Update background with album art
		backgroundCover.style.backgroundImage = 'url(' + artworkUrl + ')';

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
	isPlaying = true;
}

audio.onpause = function () {
	var button = document.getElementById('playerButton');
	button.className = 'fa fa-play';
	document.getElementById('currentCoverArt').classList.remove('playing');
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

// Control functions
function togglePlay() {
	if (!audio.paused) {
		audio.pause();
	} else {
		audio.load();
		audio.play();
	}
}

function updateVolume(value) {
	audio.volume = intToDecimal(value);
	var page = new Page();
	page.changeVolumeIndicator(value);
}

function mute() {
	if (!audio.muted) {
		document.getElementById('volIndicator').innerHTML = 0;
		document.getElementById('volume').value = 0;
		audio.volume = 0;
		audio.muted = true;
	} else {
		var defaultVolume = 80;
		document.getElementById('volIndicator').innerHTML = defaultVolume;
		document.getElementById('volume').value = defaultVolume;
		audio.volume = intToDecimal(defaultVolume);
		audio.muted = false;
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
	// This function will be called when actual streaming data is received
	var jsonData = JSON.parse(data);
	var page = new Page();

	let song = jsonData.currentSong.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');
	let artist = jsonData.currentArtist.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');

	document.title = song + ' - ' + artist + ' | ' + RADIO_NAME;
	page.refreshCover(song, artist);
	page.refreshCurrentSong(song, artist);
	page.refreshLyric(song, artist);

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
                    <div class="song-cover" style="background-image: url('data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><rect width=\\"100\\" height=\\"100\\" fill=\\"%23333\\"/><text x=\\"50\\" y=\\"55\\" font-family=\\"Arial\\" font-size=\\"30\\" text-anchor=\\"middle\\" fill=\\"%23fff\\"></text></svg></div>
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
	}, 2000);
}

function refreshCoverForHistory(song, artist, index) {
	const script = document.createElement('script');
	script.src = `https://api.deezer.com/search?q=${encodeURIComponent(artist)} ${encodeURIComponent(song)}&output=jsonp&callback=handleDeezerResponseForHistory_${index}`;
	document.body.appendChild(script);

	window['handleDeezerResponseForHistory_' + index] = function (data) {
		const defaultCoverUrl = 'cover.png';

		if (data.data && data.data.length > 0) {
			var artworkUrl = data.data[0].album.cover_big;
			var coverElements = document.querySelectorAll('#songHistory .song-cover');
			if (coverElements[index]) {
				coverElements[index].style.backgroundImage = 'url(' + artworkUrl + ')';
			}
		} else {
			// Use default cover.png when no album art is found
			var coverElements = document.querySelectorAll('#songHistory .song-cover');
			if (coverElements[index]) {
				coverElements[index].style.backgroundImage = 'url(' + defaultCoverUrl + ')';
			}
		}
	};
}

// Modal functions
function openModal() {
	document.getElementById('modalLyrics').style.display = 'block';
}

function closeModal() {
	document.getElementById('modalLyrics').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
	var modal = document.getElementById('modalLyrics');
	if (event.target == modal) {
		modal.style.display = 'none';
	}
}

// Keyboard shortcuts
document.addEventListener('keydown', function (event) {
	var key = event.key;
	var slideVolume = document.getElementById('volume');
	var page = new Page();

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

// Initialize the application
window.onload = function () {
	var page = new Page();
	page.changeTitlePage();
	page.setVolume();

	var player = new Player();

	// Connect to real-time streaming data
	connectToEventSource(url);

	// Load initial song data
	getStreamingData(JSON.stringify({
		currentSong: "All I Need",
		currentArtist: "Radiohead"
	}));

	// Set up lyrics button click handler
	document.getElementById('lyricsButton').onclick = function (e) {
		e.preventDefault();
		if (this.style.opacity !== "0.5") {
			openModal();
		}
	};
};