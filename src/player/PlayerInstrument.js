//import { Instrument } from "../NBS.js"; // Uncomment for testing
import { Instrument } from "https://cdn.jsdelivr.net/npm/@encode42/nbs.js@2.0.1/dist/esm.min.js";
import { decodeAudioData } from "../audio/audio.js";

/**
 * Represents an instrument of a Note.
 */
export default class PlayerInstrument extends Instrument {
    /**
     * The resulting audio buffer that will contain the sound
     * Set by loadAudio() or load()
     *
     * @type {AudioBuffer}
     * @private
     */
    audioBuffer;

    /**
     * The built-in instruments.
     *
     * Includes harp, double bass, bass drum, snare drum, click, guitar, flute, bell, chime, xylophone, iron xylophone, cow bell, didgeridoo, bit, banjo, and pling.
     * @type {[PlayerInstrument]}
     */
    static builtIn = [
        // Vue will set the correct sources and sometimes inline images using require()
        new PlayerInstrument(
            "Harp",
            0,
            {
                "audioSrc": "assets/sounds/harp.mp3",
                "builtIn": true,
                "pressKey": true
            }
        ),
        new PlayerInstrument(
            "Double Bass",
            1,
            {
                "audioSrc": "assets/sounds/dbass.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Bass Drum",
            2,
            {
                "audioSrc": "assets/sounds/bdrum.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Snare Drum",
            3,
            {
                "audioSrc": "assets/sounds/sdrum.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Click",
            4,
            {
                "audioSrc": "assets/sounds/click.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Guitar",
            5,
            {
                "audioSrc": "assets/sounds/guitar.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Flute",
            6,
            {
                "audioSrc": "assets/sounds/flute.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Bell",
            7,
            {
                "audioSrc": "assets/sounds/bell.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Chime",
            8,
            {
                "audioSrc": "assets/sounds/icechime.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Xylophone",
            9,
            {
                "audioSrc": "assets/sounds/xylobone.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Iron Xylophone",
            10,
            {
                "audioSrc": "assets/sounds/iron_xylophone.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Cow Bell",
            11,
            {
                "audioSrc": "assets/sounds/cow_bell.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Didgeridoo",
            12,
            {
                "audioSrc": "assets/sounds/didgeridoo.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Bit",
            13,
            {
                "audioSrc": "assets/sounds/bit.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Banjo",
            14,
            {
                "audioSrc": "assets/sounds/banjo.mp3",
                "builtIn": true
            }
        ),
        new PlayerInstrument(
            "Pling",
            15,
            {
                "audioSrc": "assets/sounds/pling.mp3",
                "builtIn": true
            }
        )
    ];

    /**
     * The built-in custom instruments.
     *
     * Includes portal trigger, sand break, xp orb, and firework.
     * @type {[PlayerInstrument]}
     */
    static customInstruments = [
        new PlayerInstrument(
            "block.portal.trigger",
            undefined,
            {
                "audioSrc": "assets/sounds/Custom/block.portal.trigger.mp3",
                "custom": true
            }
        ),
        new PlayerInstrument(
            "block.sand.break",
            undefined,
            {
                "audioSrc": "assets/sounds/Custom/block.sand.break.mp3",
                "custom": true
            }
        ),
        new PlayerInstrument(
            "entity.experience_orb.pickup",
            undefined,
            {
                "audioSrc": "assets/sounds/Custom/entity.experience_orb.pickup.mp3",
                "custom": true
            }
        ),
        new PlayerInstrument(
            "entity.firework.blast_far",
            undefined,
            {
                "audioSrc": "assets/sounds/Custom/entity.firework.blast_far.mp3",
                "custom": true
            }
        )
    ];

    /**
     * Whether the instrument is a built-in custom instrument.
     *
     * @type {boolean}
     */
    custom;

    /**
     * Construct an instrument.
     *
     * @param {string} name Name of the instrument
     * @param {number} id ID of the instrument in the song's instrument array
     * @param {Object} options Options for the instrument
     */
    constructor(name, id, options) {
        super(name, id, options);

        if (options !== undefined) {
            this.audioSrc = options?.audioSrc || "";
            this.custom = options?.custom || false;
        }
    }

    /**
     * Load the instrument's audioSrc to the audioBuffer.
     *
     * @return {Promise<AudioBuffer>}
     */
    loadAudio() {
        return fetch(this.audioSrc)
            .then(data => data.arrayBuffer())
            .then(data => decodeAudioData(data))
            .then(buffer => this.audioBuffer = buffer);
    }

    /**
     * Load every built-in PlayerInstrument.
     *
     * @return {Promise<void>}
     */
    static async loadAll() {
        // Load all custom instruments
        for (const instrument of [...PlayerInstrument.builtIn, ...PlayerInstrument.customInstruments]) {
            await instrument.loadAudio();
        }
    }

    /**
     * Get a built-in custom instrument from a song's custom instrument audioSrc.
     *
     * @param {string} audioSrc Song instrument audioSrc to search for
     * @return {PlayerInstrument}
     */
    static getCustom(audioSrc) {
        const correctSrc = `assets/sounds/${audioSrc.replace(/\.ogg$/, ".mp3")}`;
        for (const instrument of PlayerInstrument.customInstruments) {
            if (instrument.audioSrc === correctSrc) {
                return instrument;
            }
        }
    }
}
