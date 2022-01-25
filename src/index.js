import { Player } from "./player/Player.js";
import { load, init } from "./audio/load.js";
import { resetElements } from "./util/util.js";

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
    const fileSelect = document.getElementById("file-input");
    progressBar = document.getElementById("progress-bar");

    playbackButton = document.getElementById("playback-button");
    resetButton = document.getElementById("reset-button");
    loopingCheck = document.getElementById("looping-check");
    parityCheck = document.getElementById("parity-check");

    setReady(false);
    resetElements();
    await init();

    // File input change event
    fileSelect.addEventListener("change", async event => {
        if (event.target.files.length === 0) {
            return;
        }

        // Stop all playing songs
        await Player.stopAll();
        setPlaying(false);

        // Load the song and create the player
        const song = await load(event.target.files[0]);
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
