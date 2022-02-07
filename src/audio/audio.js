const audioContext = new AudioContext();
const audioDestination = audioContext.createGain();
audioDestination.connect(audioContext.destination);

/**
 * Play a note.
 *
 * @param {number} key Key to play at
 * @param {Instrument} instrument Instrument to play
 * @param {number} velocity Velocity (volume) to play at
 * @param {number} panning Panning to play at
 * @param {number} pitch Pitch to play at
 * @return {void}
 */
export function playNote(key, instrument, velocity, panning, pitch) {
    // Ensure the instrument is loaded
    if (!instrument?.audioBuffer) {
        return;
    }

    let source = audioContext.createBufferSource();
    source.buffer = instrument.audioBuffer;
    source.start(0);

    // Process pitch
    source.playbackRate.value = 2 ** ((key + (pitch / 100) - 45) / 12);

    // Process gain
    // Issue: Playback gets jank when a massive amount of notes is being played
    // Solution: Dynamically adjust volume
    // This could be a pre-determined algorithm to offset the song's volume
    const gainNode = audioContext.createGain();
    gainNode.gain.value = (velocity / 2) / 100; // Decrease volume to avoid peaking
    source.connect(gainNode);
    source = gainNode;

    // Process panning
    if (panning !== 0) {
        const panningNode = audioContext.createStereoPanner();
        panningNode.pan.value = panning / 100;
        source.connect(panningNode);
        source = panningNode;
    }

    source.connect(audioDestination);
}

/**
 * Decode an ArrayBuffer to an AudioBuffer.
 *
 * @param {ArrayBuffer} buffer Buffer to decode
 * @return {Promise<AudioBuffer>}
 */
export function decodeAudioData(buffer) {
    return audioContext.decodeAudioData(buffer);
}
