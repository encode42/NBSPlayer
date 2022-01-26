import PlayerInstrument from "../player/PlayerInstrument.js";
NBSjs.setInstrumentClass(PlayerInstrument);

let initialized = false;

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
 *
 * @param {ArrayBuffer} arraybuffer ArrayBuffer to load from
 * @return {Promise<NBSjs.Song>}
 */
export async function load(arraybuffer) {
    // Load the song
    const song = NBSjs.Song.fromArrayBuffer(arraybuffer);

    // Correct built-in custom instruments
    for (const instrument of song.instruments) {
        if (!instrument.builtIn) {
            // Get the custom instrument from the built-in array
            instrument.audioBuffer = PlayerInstrument.getCustom(instrument.audioSrc)?.audioBuffer;
        }
    }

    return song;
}
