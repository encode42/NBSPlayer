import { playNote } from "../audio/audio.js";
import { EventClass } from "../util/EventClass.js";

// TODO:
// - Instrument key offsets
// - lastTick = last measure

/**
 * The progress bar.
 *
 * @type {HTMLInputElement}
 * @private
 */
const progressBar = document.getElementById("progress-bar");

/**
 * The looping checkbox.
 *
 * @type {HTMLInputElement}
 * @private
 */
const loopingCheck = document.getElementById("looping-check");

/**
 * The last progressBar value.
 *
 * @type {number}
 * @private
 */
let lastProgress = 0;

/**
 * The currently loaded Note Block players.
 *
 * @type {Map<string, Player>}
 */
const loadedPlayers = new Map();

/**
 * Represents a Note Block player.
 */
export class Player extends EventClass {
    /**
     * Amount of milliseconds between each tick.
     *
     * @type {number}
     * @private
     */
    timePerTick;

    /**
     * Whether the song has at least one solo layer.
     *
     * @type {boolean}
     * @private
     */
    hasSolo;

    /**
     * Audible layers of the song.
     *
     * @type {{number: Object}}
     * @private
     */
    layers = {};

    /**
     * Amount of audible layers of the song.
     *
     * @type {number}
     * @private
     */
    audibleLayers = 0;

    /**
     * Whether the song should be stopped.
     *
     * @type {boolean}
     * @private
     */
    stop = false;

    /**
     * The currently running job.
     *
     * @type {Promise<void>}
     * @private
     */
    currentJob;

    /**
     * Current tick the song is on.
     *
     * @type {number}
     */
    currentTick = -1;

    /**
     * The last tick the song should play.
     *
     * @type {number}
     */
    lastTick;

    /**
     * Whether to update the progress bar.
     *
     * @type {boolean}
     */
    updateProgress = true;

    /**
     * Whether the player already has an attacked end event listener.
     *
     * @type {boolean}
     */
    hasEndListener = false;

    /**
     * Whether the song should loop if available.
     *
     * @type {boolean}
     */
    loop;

    /**
     * Maximum amount of times a song should loop.
     *
     * @type {number}
     * @private
     */
    maxLoopCount;

    /**
     * Current loop the player is on.
     *
     * @type {number}
     * @private
     */
    currentLoopCount = 0;

    /**
     * Tick to start on after looping.
     *
     * @type {number}
     * @private
     */
    loopStartTick;

    /**
     * Whether the player should use parity changes.
     *
     * @type {boolean}
     */
    useParity = true;

    /**
     * Create a Note Block player.
     *
     * @param {NBSjs.Song} song Song to play
     */
    constructor(song) {
        super();

        // Check if the player is already loaded
        const loadedPlayer = loadedPlayers.get(song.name || song.size);
        if (loadedPlayer) {
            loadedPlayer.checkProgressBar();
            return loadedPlayer;
        }

        // Load the player
        this.hasSolo = song.hasSolo;
        this.timePerTick = song.timePerTick;
        this.lastTick = song.size;

        // Process song loop status
        this.loop = song.loopEnabled;
        this.maxLoopCount = song.maxLoopCount;
        this.loopStartTick = song.loopStartTick;
        this.checkLooping();

        // Process all layers that will be played back
        // This creates an object containing all solo or non-locked layers
        const totalLayers = song.layers.length;
        for (let currentLayer = 0; currentLayer < totalLayers; currentLayer++) {
            const layer = song.layers[currentLayer];

            // Skip non-solo layers
            if (this.hasSolo && !layer.solo) {
                continue;
            }

            // Skip locked layers
            if (layer.locked) {
                continue;
            }

            this.layers[this.audibleLayers] = layer;
            this.audibleLayers++;
        }

        loadedPlayers.set(song.name || song.size, this);
    }

    /**
     * Check the looping checkbox if required.
     *
     * @return {void}
     * @private
     */
    checkLooping() {
        loopingCheck.checked = this.loop;
        loopingCheck.disabled = !this.loop;
    }

    checkProgressBar() {
        if (this.updateProgress) {
            const progress = Math.round(((this.currentTick / this.lastTick) * 100) * 10) / 10;
            if (progress !== lastProgress) {
                lastProgress = progress;
                progressBar.value = progress;
            }
        }
    }

    /**
     * Play the song.
     *
     * @return {Promise<void>}
     */
    async play() {
        this.stop = false;

        // eslint-disable-next-line no-unmodified-loop-condition
        while (!this.stop) {
            // Run the next job
            this.currentJob = this.runJob();
            await this.currentJob;
        }
    }

    /**
     * Run the task to play the next tick of notes.
     *
     * @return {Promise<void>}
     */
    async runJob() {
        // Iterate each layer
        for (let currentLayer = 0; currentLayer < this.audibleLayers; currentLayer++) {
            const layer = this.layers[currentLayer];
            const note = layer.notes[this.currentTick];

            // Ensure a note is on the tick then play
            if (note) {
                // Parity changes:
                // - Alternate panning algorithm
                // - Detune note pitch
                let panning = (note.panning + layer.panning) / 2;
                let pitch = note.pitch;
                if (this.useParity) {
                    panning = layer.panning === 0 ? note.panning : panning;
                    pitch = note.pitch - 2;
                }

                playNote(
                    note.key,
                    note.instrument,
                    (note.velocity * layer.velocity) / 100,
                    panning,
                    pitch
                );
            }
        }

        // Wait until next tick
        await new Promise(resolve => setTimeout(resolve, this.timePerTick));
        this.currentTick++;

        this.checkProgressBar();

        // Check if the song is over
        if (this.currentTick > this.lastTick) {
            if (this.loop && (this.maxLoopCount === 0 || this.maxLoopCount > this.currentLoopCount)) {
                this.currentLoopCount++;
                this.currentTick = this.loopStartTick;
                this.emit("loop");
            } else {
                this.reset();
                this.emit("end");
            }
        }
    }

    /**
     * Pause the song.
     *
     * @return {void}
     */
    async pause() {
        this.stop = true;
        await this.currentJob;
    }

    /**
     * Reset the song.
     *
     * @return {void}
     */
    async reset() {
        await this.pause();
        this.currentTick = -1;
        this.currentLoopCount = 0;
        progressBar.value = 0;
    }

    /**
     * Stop all currently loaded players.
     *
     * @return {void}
     */
    static async stopAll() {
        for (const player of loadedPlayers.values()) {
            await player.pause();
        }

        progressBar.value = 0;
    }
}
