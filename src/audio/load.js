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
 * @param {File} file File to load from
 * @return {Promise<NBSjs.Song>}
 */
export async function load(file) {
    // Check if the song is already loaded
    const loadedSong = songCache.get(file.name);
    if (loadedSong) {
        return loadedSong;
    }

    // Load the song
    const song = NBSjs.Song.fromArrayBuffer(await file.arrayBuffer());

    // Correct built-in custom instruments
    for (const instrument of song.instruments) {
        if (!instrument.builtIn) {
            // Get the custom instrument from the built-in array
            instrument.audioBuffer = PlayerInstrument.getCustom(instrument.audioSrc)?.audioBuffer;
        }
    }

    songCache.set(file.name, song);
    return song;
}
