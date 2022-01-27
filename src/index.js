import { load, init } from "./audio/load.js";
import { resetElements, updateVersion } from "./util/util.js";
import Database from "./db/Database.js";
import Playlist from "./playlist/Playlist.js";

// TODO:
// - Delete button on playlist entries
// - Ability to upload and manage instrument zips
// - Save playlists and instruments to the browser localStorage
// - Instrument key offsets
// - lastTick = last measure
// - Support Tempo Changer instrument

// Potential bug:
// Portal is XP orb in playlist

/**
 * URL query parameters.
 *
 * @type {URLSearchParams}
 */
const params = new URLSearchParams(window.location.search);

/**
 * URL string provided in the query.
 *
 * @type {string}
 */
const queryURL = params.get("url");

/**
 * Import string provided in the query.
 *
 * @type {string}
 */
let queryImport = params.get("import");

const database = new Database("NBSPlayer", "playlist");

/**
 * File / URL selection toggle.
 *
 * @type {HTMLAnchorElement}
 */
let selectToggle;

/**
 * The playlist export button.
 *
 * @type {HTMLAnchorElement}
 */
let exportButton;

/**
 * The playlist import button.
 *
 * @type {HTMLAnchorElement}
 */
let importButton;

/**
 * The hidden playlist import file input.
 *
 * @type {HTMLInputElement}
 */
let importSelect;

/**
 * File selection.
 *
 * @type {HTMLInputElement}
 */
let fileSelect;

/**
 * Parent of the URL selection.
 *
 * @type {HTMLDivElement}
 */
let urlSelectParent;

/**
 * URL selection.
 *
 * @type {HTMLInputElement}
 */
let urlSelect;

/**
 * URL selection load button.
 *
 * @type {HTMLButtonElement}
 */
let urlSelectLoad;

/**
 * The current playlist object.
 *
 * @type {Playlist}
 */
let playlist;

/**
 * The playlist order list.
 *
 * @type {HTMLUListElement}
 */
let playlistOrder;

/**
 * The playback button.
 *
 * @type {HTMLButtonElement}
 */
let playbackButton;

/**
 * The reset button.
 *
 * @type {HTMLButtonElement}
 */
let resetButton;

/**
 * The repeat button.
 *
 * @type {HTMLButtonElement}
 */
let repeatButton;

/**
 * The progress bar.
 *
 * @type {HTMLInputElement}
 */
let progressBar;

/**
 * The looping checkbox.
 *
 * @type {HTMLInputElement}
 */
let loopingCheck;

/**
 * The parity checkbox.
 *
 * @type {HTMLInputElement}
 */
let parityCheck;

let noSleep;

window.addEventListener("load", async () => {
    selectToggle = document.getElementById("select-toggle");
    exportButton = document.getElementById("export");
    importButton = document.getElementById("import");
    importSelect = document.getElementById("import-select");
    fileSelect = document.getElementById("file-select");
    urlSelectParent = document.getElementById("url-select-parent");
    urlSelect = document.getElementById("url-select");
    urlSelectLoad = document.getElementById("url-select-load");
    progressBar = document.getElementById("progress-bar");
    playlistOrder = document.getElementById("playlist-order");
    playbackButton = document.getElementById("playback-button");
    resetButton = document.getElementById("reset-button");
    repeatButton = document.getElementById("repeat-button");
    loopingCheck = document.getElementById("looping-check");
    parityCheck = document.getElementById("parity-check");
    playlist = new Playlist();

    setReady(false);

    // Check if a URL is provided
    if (queryURL || queryImport) {
        setUseURL(true);

        urlSelect.dataset.ignore = "true";
        urlSelect.value = queryURL;

        if (queryImport) {
            // Load playlist
            fetchImport(queryImport);
        } else {
            // Load song
            loadURL(queryURL);
        }
    } else {
        const playing = await database.contains("playing");
        const repeatMode = await database.contains("repeatMode");

        loadStoredPlaylist(playing.result, repeatMode.result);
    }

    resetElements();
    updateVersion();
    delete urlSelect.dataset.ignore;

    noSleep = new NoSleep();

    // File / URL selection toggle is clicked
    selectToggle.addEventListener("click", () => {
        setUseURL(selectToggle.dataset.toggled !== "true");
    });

    // Playlist export button is clicked
    exportButton.addEventListener("click", () => {
        playlist.export();
    });

    // Playlist import button is clicked
    importButton.addEventListener("click", async () => {
        if (!importButton.dataset.url) {
            importSelect.click();
        } else {
            const url = window.prompt("Insert url");

            queryImport = url;
            params.delete("url");
            params.set("import", url);
            updateHistory();

            fetchImport(url);
        }
    });

    // Hidden playlist import file input
    importSelect.addEventListener("change", async () => {
        if (importSelect.files.length === 0) {
            return;
        }

        // Load the uploaded JSON file
        loadImport(importSelect.files[0]);
    });

    // Playlist entry is clicked.
    playlist.addEventListener("clickChange", () => {
        setPlaying(true);
    });

    // Playlist is finished
    playlist.addEventListener("playlistEnd", () => {
        playlist.currentPlayer.pause();
        setPlaying(false);
    });

    playlist.addEventListener("change", async () => {
        await database.put("playing", playlist.getIndex(playlist.currentPlayer.element.innerHTML));
    });

    // URL load button is clicked
    urlSelectLoad.addEventListener("click", async () => {
        const url = urlSelect.value;

        // Set the URL parameter
        if (!queryImport) {
            params.set("url", url);
            updateHistory();
        }

        loadURL(url);
    });

    // File input change event
    fileSelect.addEventListener("change", async () => {
        if (fileSelect.files.length === 0) {
            return;
        }

        const songs = [];
        for (const file of fileSelect.files) {
            songs.push({
                "name": file.name,
                "buffer": await file.arrayBuffer()
            });
        }

        loadSongs(songs);
    });

    // Play / pause button is clicked
    playbackButton.addEventListener("click", () => {
        setPlaying(playbackButton.dataset.toggled !== "true");
    });

    // Reset button is clicked
    resetButton.addEventListener("click", () => {
        playlist.currentPlayer?.reset();
        setPlaying(false);
    });

    // Repeat button is pressed
    repeatButton.addEventListener("click", () => {
        switch (repeatButton.dataset.status) {
            case undefined:
                // From off to song
                setRepeat(1);
                break;
            case "one":
                // From song to playlist
                setRepeat(2);
                break;
            case "playlist":
                // From playlist to song
                setRepeat(0);
                break;
        }
    });

    // User starts moving progress bar
    progressBar.addEventListener("mousedown", () => {
        playlist.currentPlayer.updateProgress = false;
    });

    // User stops moving progress bar
    progressBar.addEventListener("mouseup", () => {
        playlist.currentPlayer.currentTick = Math.round((progressBar.value / 100) * playlist.currentPlayer.lastTick);
        playlist.currentPlayer.updateProgress = true;
    });

    // Looping checkbox is changed
    loopingCheck.addEventListener("change", () => playlist.currentPlayer.loop = loopingCheck.checked);

    // Parity checkbox is changed
    parityCheck.addEventListener("change", () => playlist.currentPlayer.useParity = parityCheck.checked);

    init();
});

/**
 * Fetch a song from a URL.
 *
 * @param {string} link Link to fetch from
 * @return {Promise<void>}
 */
async function fetchURL(link) {
    let url;
    let result;

    try {
        url = new URL(link);

        const response = await fetch(url);
        if (response.ok) {
            result = response;
        }
    } catch {}

    return result;
}

/**
 * Load a song from a URL.
 *
 * @param {string} link URL to load from
 * @return {Promise<void>}
 */
async function loadURL(link) {
    const result = await fetchURL(link);

    if (result) {
        loadSongs([{
            "name": link,
            "buffer": await result.arrayBuffer()
        }]);
    }
}

/**
 * Fetch a playlist file from a URL.
 *
 * @param {URL} link URL to load from
 * @return {Promise<void>}
 */
async function fetchImport(link) {
    const result = await fetchURL(link);
    const blob = await result.blob();

    loadImport(blob);
}

/**
 * Load an imported playlist file.
 *
 * @param {string} blob Blob to load
 * @param {boolean} [updateStored] Whether to update the stored playlist.
 * @return {Promise<void>}
 */
async function loadImport(blob, updateStored = true, playingIndex, repeatMode) {
    // Load the playlist and songs
    const result = await playlist.import(blob);

    setRepeat(repeatMode !== undefined ? repeatMode : result.repeatMode);

    await loadSongs(result.files, false, updateStored, true);

    const currentElement = playlistOrder.children[playingIndex || result.playing];
    playlist.switchTo(currentElement ? currentElement.innerHTML : playlistOrder.children[0].innerHTML, true);

    if (playingIndex === undefined) {
        database.put("playing", result.playing);
    }
}

/**
 * Load an array of songs.
 *
 * @param {{name: string, buffer: ArrayBuffer}[]} songs Songs to load
 * @param {boolean} [addPlaying=true] Whether to set latest song to playing
 * @param {boolean} [updateStored=true] Whether to update the stored songs
 * @return {Promise<void>}
 */
async function loadSongs(songs, addPlaying = true, updateStored = true) {
    await playlist.resetAll();
    setPlaying(false);

    // Load each song
    for (const data of songs) {
        await loadSong(data.name, data.buffer);
    }

    if (addPlaying) {
        playlist.currentPlayer.element.classList.add("playing");
    }

    setReady(true);

    if (updateStored) {
        updateStoredSongs();
    }
}

async function loadStoredPlaylist(playingIndex, repeatMode) {
    const storedPlaylist = await database.contains("songs");

    if (storedPlaylist.has) {
        loadImport(storedPlaylist.result, false, playingIndex, repeatMode);
    }
}

async function updateStoredSongs() {
    const zip = await playlist.save();
    database.put("songs", zip);
}

/**
 * Load a song from an ArrayBuffer.
 *
 * @param {string} fallbackName Fallback name if the song isn't named
 * @param {ArrayBuffer} arrayBuffer ArrayBuffer to load from
 * @return {Promise<void>}
 */
async function loadSong(fallbackName, arrayBuffer) {
    // Load the song and create the player
    const song = await load(arrayBuffer);
    playlist.createPlayer(song, arrayBuffer, fallbackName);
}

/**
 * @param {boolean} ready Whether the app is ready.
 * @return {void}
 */
function setReady(ready) {
    if (ready) {
        playbackButton.disabled = false;
        resetButton.disabled = false;
        repeatButton.disabled = false;
        progressBar.disabled = false;
        parityCheck.disabled = false;
    } else {
        playbackButton.disabled = true;
        resetButton.disabled = true;
        repeatButton.disabled = true;
        progressBar.disabled = true;
        loopingCheck.disabled = true;
        parityCheck.disabled = true;
    }
}

/**
 * @param {boolean} useURL Whether to load from URLs.
 * @return {void}
 */
function setUseURL(useURL) {
    if (useURL) {
        // Show the URL selection
        selectToggle.dataset.toggled = "true";
        importButton.dataset.url = "true";
        fileSelect.classList.add("invisible");
        urlSelect.value = null;
        urlSelectParent.classList.add("visible");
    } else {
        // Show the file selection
        delete selectToggle.dataset.toggled;
        delete importButton.dataset.url;
        fileSelect.classList.remove("invisible");
        urlSelectParent.classList.remove("visible");
        fileSelect.value = null;

        // Remove the URL parameter
        params.delete("url");
        params.delete("import");
        updateHistory();
    }
}

/**
 * @param {boolean} playing Whether a song is playing.
 * @return {void}
 */
function setPlaying(playing) {
    if (playing) {
        playlist.currentPlayer?.play();
        playbackButton.dataset.toggled = "true";
        noSleep.enable();
    } else {
        playlist.currentPlayer?.pause();
        delete playbackButton.dataset.toggled;
        noSleep.disable();
    }
}

/**
 * @param {number} repeat The playlist's repeat status.
 * @return {void}
 */
function setRepeat(repeat) {
    playlist.repeatMode = repeat;

    switch (repeat) {
        case 0:
            // Repeat is off
            delete repeatButton.dataset.status;
            break;
        case 1:
            // Repeat is song
            repeatButton.dataset.status = "one";
            break;
        case 2:
            // Repeat is playlist
            repeatButton.dataset.status = "playlist";
            break;
    }

    database.put("repeatMode", repeat);
}

/**
 * Update the browser's history.
 *
 * @return {void}
 */
function updateHistory() {
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}
