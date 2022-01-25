import { PlayerInstrument } from "../player/PlayerInstrument.js";
NBSjs.setInstrumentClass(PlayerInstrument);

let initialized = false;
const songCache = new Map();

/**
 * Initialize all built-in instruments.
 *
 * @return {Promise<void>}
 */
export async function init() {
    if (initialized) {
        return;
    }

    await PlayerInstrument.loadAll();
    initialized = true;
}

/**
 * Load a song from a File.
 * This method uses a cache to store loaded songs and instruments.
 *
 * @param {string} filename Name of the file
 * @param {ArrayBuffer} arraybuffer ArrayBuffer to load from
 * @return {Promise<NBSjs.Song>}
 */
export async function load(filename, arraybuffer) {
    // Check if the song is already loaded
    const loadedSong = songCache.get(filename);
    if (loadedSong) {
        return loadedSong;
    }

    // Load the song
    const song = NBSjs.Song.fromArrayBuffer(arraybuffer);

    // Correct built-in custom instruments
    for (const instrument of song.instruments) {
        if (!instrument.builtIn) {
            // Get the custom instrument from the built-in array
            instrument.audioBuffer = PlayerInstrument.getCustom(instrument.audioSrc)?.audioBuffer;
        }
    }

    songCache.set(filename, song);
    return song;
}
