import "https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js";
import "https://cdn.jsdelivr.net/gh/beatgammit/base64-js@1.5.1/base64js.min.js";
import { decodeHTML, wait } from "../util/util.js";
import Player from "../player/Player.js";
import EventClass from "../util/EventClass.js";

/**
 * The progress bar.
 *
 * @type {HTMLInputElement}
 */
const progressBar = document.getElementById("progress-bar");

/**
 * The playlist order list.
 *
 * @type {HTMLUListElement}
 */
const playlistOrder = document.getElementById("playlist-order");
Sortable.create(playlistOrder);

/**
 * Represents a Note Block player playlist.
 */
export default class Playlist extends EventClass {
    /**
     * Players that are stored in the playlist.
     *
     * @type {Map<string, Player>}
     */
    loadedPlayers = new Map();

    /**
     * The currently playing Note Block player.
     *
     * @type {Player}
     */
    currentPlayer;

    /**
     * The playlist's repeat mode.
     *
     * @type {number}
     */
    repeatMode = 0;

    /**
     * Create a new Note Block player.
     *
     * @param {NBSjs.Song} song Song to load
     * @param {ArrayBuffer} arrayBuffer ArrayBuffer to store
     * @param {string} fallbackName Fallback name if the song isn't named
     * @return {Player}
     */
    createPlayer(song, arrayBuffer, fallbackName) {
        let format = "";

        // Create the entry format
        if (song.name) {
            // Song has an original author
            if (song.originalAuthor) {
                format += song.originalAuthor;

                // Song also has an author
                format += song.author ? " & " : " - ";
            }

            // Song has an author
            if (song.author) {
                format += song.author + " - ";
            }

            format += song.name;
        }

        const name = format || fallbackName;

        // Check if player is already loaded
        const loadedPlayer = this.loadedPlayers.get(name);
        if (loadedPlayer) {
            this.currentPlayer = loadedPlayer;
            return loadedPlayer;
        }

        // Create the player
        const player = new Player(song);
        player.name = name;
        player.arrayBuffer = arrayBuffer;

        // Add the end song event listener
        player.addEventListener("end", async () => {
            await this.nextPlayer();
        });

        // Create the playlist entry
        const li = document.createElement("li");
        li.innerHTML = name;

        // Play the clicked song
        li.addEventListener("click", async event => {
            await this.switchTo(event.target.innerHTML);
            this.emit("clickChange");
        });

        player.element = li;
        playlistOrder.prepend(li);

        this.loadedPlayers.set(name, player);
        this.currentPlayer = player;

        // Ensure a correct loop checkbox status
        player.checkLooping(this.loadedPlayers.size);

        return player;
    }

    /**
     * Advance to the next stored player.
     *
     * @return {Promise<Player> | undefined}
     * @private
     */
    async nextPlayer() {
        if (this.repeatMode === 1) {
            this.currentPlayer.reset();
        } else {
            this.currentPlayer.pause();
            const order = playlistOrder.children;

            // Iterate each object in the playlist
            let found = false;
            for (let i = 0; i < order.length; i++) {
                const entry = order[i];

                // Playing entry found
                if (entry.classList.contains("playing")) {
                    // Ensure there's another song in queue
                    if (i + 1 >= order.length) {
                        break;
                    }

                    // Get the next element
                    const element = order[i + 1];
                    element.classList.add("playing");
                    entry.classList.remove("playing");

                    // Get the next player
                    this.currentPlayer = this.loadedPlayers.get(decodeHTML(element.innerHTML));
                    found = true;
                    break;
                }
            }

            if (!found) {
                if (this.repeatMode === 2) {
                    // Go to start of queue
                    const nextPlayer = this.loadedPlayers.get(decodeHTML(order[0].innerHTML));
                    nextPlayer.element.classList.add("playing");
                    this.currentPlayer.element.classList.remove("playing");

                    this.currentPlayer = nextPlayer;
                } else {
                    // End of queue
                    this.emit("playlistEnd");
                    return;
                }
            }
        }

        // Start the next song
        await wait(1000);
        await this.currentPlayer.reset();
        this.currentPlayer.play();

        return this.currentPlayer;
    }

    /**
     * Switch to a different player.
     *
     * @param {string} name Name of the player to switch to
     * @return {Promise<void>}
     * @private
     */
    async switchTo(name) {
        await this.pauseAll();

        for (const entry of playlistOrder.children) {
            if (entry.innerHTML === name) {
                entry.classList.add("playing");
                this.currentPlayer = this.loadedPlayers.get(decodeHTML(name));
                break;
            }
        }
    }

    /**
     * Pause all currently playing players.
     *
     * @return {void}
     */
    async pauseAll() {
        await this.stopAll(async player => {
            await player.pause();
        });
    }

    /**
     * Reset all currently playing players.
     *
     * @return {void}
     */
    async resetAll() {
        await this.stopAll(async player => {
            await player.reset();
            progressBar.value = 0;
        });
    }

    /**
     * Stop all players with a callback.
     *
     * @param {Function} callback Callback to process
     * @return {Promise<void>}
     * @private
     */
    async stopAll(callback) {
        for (const player of this.loadedPlayers.values()) {
            await callback?.(player);
            player.element.classList.remove("playing");
        }
    }

    /**
     * Export the playlist to a JSON file.
     *
     * @return {Promise<void>}
     */
    async export() {
        const result = {
            "repeatMode": this.repeatMode,
            "songs": []
        };

        // Iterate each entry
        const order = playlistOrder.children;
        for (let i = 0; i < order.length; i++) {
            const loadedPlayer = this.loadedPlayers.get(decodeHTML(order[i].innerHTML));

            // Encode the song's ArrayBuffer to base64
            const data = base64js.fromByteArray(new Uint8Array(loadedPlayer.arrayBuffer));
            result.songs.push({
                "filename": loadedPlayer.name,
                data
            });

            // Add the currently playing song
            if (order[i].classList.contains("playing")) {
                result.playing = i;
            }
        }

        // Prepare the results for downloading
        const json = JSON.stringify(result);
        const blob = new Blob([json], { "type": "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.download = "playlist.json";
        link.href = url;

        document.body.append(link);
        link.click();
        link.remove();
    }

    /**
     * Import a playlist from a JSON file.
     *
     * @param {Object} json JSON to import.
     * @return {Promise<{repeatMode: number, songs: {name: string, buffer: ArrayBuffer}[], playing: number}>}
     */
    async import(json) {
        const songs = [];

        // Reverse and iterate each song
        for (const song of json.songs.reverse()) {
            // Decode the song's ArrayBuffer from base64
            const data = base64js.toByteArray(song.data);
            const buffer = await data.buffer;

            songs.push({
                "name": data.filename,
                "buffer": buffer
            });
        }

        return {
            songs,
            "playing": json.playing,
            "repeatMode": json.repeatMode
        };
    }
}
