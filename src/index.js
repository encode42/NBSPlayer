import { Player } from "./player/Player.js";
import { load, init } from "./audio/load.js";
import { resetElements } from "./util/util.js";

/**
 * URL query parameters.
 *
 * @type {URLSearchParams}
 * @private
 */
const params = new URLSearchParams(window.location.search);

/**
 * URL string provided in the query.
 *
 * @type {string}
 * @private
 */
const queryURL = params.get("url");

/**
 * File / URL selection toggle.
 *
 * @type {HTMLAnchorElement}
 * @private
 */
let selectToggle;

/**
 * File selection.
 *
 * @type {HTMLInputElement}
 * @private
 */
let fileSelect;

/**
 * URL selection parent div.
 *
 * @type {HTMLDivElement}
 * @private
 */
let urlSelectParent;

/**
 * URL selection.
 *
 * @type {HTMLInputElement}
 * @private
 */
let urlSelect;

/**
 * URL selection load button.
 */
let urlSelectLoad;

/**
 * The playback button.
 *
 * @type {HTMLButtonElement}
 * @private
 */
let playbackButton;

/**
 * The reset button.
 *
 * @type {HTMLButtonElement}
 * @private
 */
let resetButton;

/**
 * The progress bar.
 *
 * @type {HTMLInputElement}
 * @private
 */
let progressBar;

/**
 * The looping checkbox.
 *
 * @type {HTMLInputElement}
 * @private
 */
let loopingCheck;

/**
 * The parity checkbox.
 *
 * @type {HTMLInputElement}
 * @private
 */
let parityCheck;

/**
 * The current active Note Block player.
 *
 * @type {Player}
 * @private
 */
let currentPlayer;

window.addEventListener("load", async () => {
    selectToggle = document.getElementById("select-toggle");
    fileSelect = document.getElementById("file-select");
    urlSelectParent = document.getElementById("url-select-parent");
    urlSelect = document.getElementById("url-select");
    urlSelectLoad = document.getElementById("url-select-load");
    progressBar = document.getElementById("progress-bar");
    playbackButton = document.getElementById("playback-button");
    resetButton = document.getElementById("reset-button");
    loopingCheck = document.getElementById("looping-check");
    parityCheck = document.getElementById("parity-check");

    setReady(false);

    // Check if a url is provided
    if (queryURL) {
        setUseURL(true);

        urlSelect.dataset.ignore = "true";
        urlSelect.value = queryURL;
        fetchURL(queryURL);
    }

    resetElements();
    delete urlSelect.dataset.ignore;

    await init();

    // File / URL selection toggle is clicked
    selectToggle.addEventListener("click", () => {
        setUseURL(selectToggle.dataset.toggled !== "true");

        setReady(false);
        currentPlayer?.reset();
    });

    // URL load button is clicked
    urlSelectLoad.addEventListener("click", async () => {
        const url = urlSelect.value;

        // Fetch the URL
        await fetchURL(url);

        // Set the URL parameter
        params.set("url", url);
        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    });

    // File input change event
    fileSelect.addEventListener("change", async () => {
        if (fileSelect.files.length === 0) {
            return;
        }

        loadSong(fileSelect.files[0].name, await fileSelect.files[0].arrayBuffer());
    });

    // Play / pause button is clicked
    playbackButton.addEventListener("click", () => {
        setPlaying(playbackButton.dataset.toggled !== "true");
    });

    // Reset button is clicked
    resetButton.addEventListener("click", () => {
        currentPlayer.reset();
        setPlaying(false);
    });

    // User starts moving progress bar
    progressBar.addEventListener("mousedown", () => {
        currentPlayer.updateProgress = false;
    });

    // User stops moving progress bar
    progressBar.addEventListener("mouseup", () => {
        currentPlayer.currentTick = Math.round((progressBar.value / 100) * currentPlayer.lastTick);
        currentPlayer.updateProgress = true;
    });

    // Looping checkbox is changed
    loopingCheck.addEventListener("change", () => currentPlayer.loop = loopingCheck.checked);

    // Parity checkbox is changed
    parityCheck.addEventListener("change", () => currentPlayer.useParity = parityCheck.checked);
});

/**
 * Fetch a song from a URL.
 *
 * @param {string} link Link to fetch from
 * @return {Promise<void>}
 * @private
 */
async function fetchURL(link) {
    let url;

    try {
        url = new URL(link);

        // Load the URL contents
        urlSelectLoad.dataset.loading = "true";

        const response = await fetch(url);
        if (response.ok) {
            loadSong(url, await response.arrayBuffer());
        }

        delete urlSelectLoad.dataset.loading;
    } catch {}
}

/**
 * Load a song from an ArrayBuffer.
 *
 * @param {string} filename Name of the file used in cache
 * @param {ArrayBuffer} arrayBuffer ArrayBuffer to load from
 * @return {Promise<void>}
 * @private
 */
async function loadSong(filename, arrayBuffer) {
    // Stop all playing songs
    await Player.stopAll();
    setPlaying(false);

    // Load the song and create the player
    const song = await load(filename, arrayBuffer);
    currentPlayer = new Player(song);
    currentPlayer.checkLooping();

    // Add the end song event listener
    if (!currentPlayer.hasEndListener) {
        currentPlayer.addEventListener("end", () => {
            setPlaying(false);
        });

        currentPlayer.hasEndListener = true;
    }

    setReady(true);
    // setPlaying(true); // Uncomment for testing
}

/**
 * @param {boolean} ready Whether the app is ready.
 * @return {void}
 * @private
 */
function setReady(ready) {
    if (ready) {
        playbackButton.disabled = false;
        resetButton.disabled = false;
        progressBar.disabled = false;
        parityCheck.disabled = false;
    } else {
        playbackButton.disabled = true;
        resetButton.disabled = true;
        progressBar.disabled = true;
        loopingCheck.disabled = true;
        parityCheck.disabled = true;
    }
}

/**
 * @param {boolean} useURL Whether to load from URLs.
 * @return {void}
 * @private
 */
function setUseURL(useURL) {
    if (useURL) {
        selectToggle.dataset.toggled = "true";
        fileSelect.classList.add("invisible");
        urlSelect.value = null;
        urlSelectParent.classList.add("visible");
    } else {
        delete selectToggle.dataset.toggled;
        fileSelect.classList.remove("invisible");
        urlSelectParent.classList.remove("visible");
        fileSelect.value = null;
    }
}

/**
 * @param {boolean} playing Whether a song is playing.
 * @return {void}
 * @private
 */
function setPlaying(playing) {
    if (playing) {
        currentPlayer?.play();
        playbackButton.dataset.toggled = "true";
    } else {
        currentPlayer?.pause();
        delete playbackButton.dataset.toggled;
    }
}
