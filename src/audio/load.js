//import { setInstrumentClass, fromArrayBuffer } from "../esm.js"; // Uncomment for testing
import { setInstrumentClass, fromArrayBuffer } from "https://cdn.jsdelivr.net/npm/@encode42/nbs.js@2.0.2/dist/esm.min.js";
import PlayerInstrument from "../player/PlayerInstrument.js";
setInstrumentClass(PlayerInstrument);

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
    const song = fromArrayBuffer(arraybuffer);

    // Correct built-in custom instruments
    /* TODO - Better way to deal with CIs
    for (const instrument of song.instruments.loaded) {
        if (!instrument.builtIn) {
            // Get the custom instrument from the built-in array
            instrument.audioBuffer = PlayerInstrument.getCustom(instrument.audioSrc)?.audioBuffer;
        }
    }
     */

    return song;
}
