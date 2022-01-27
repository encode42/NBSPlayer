import "https://cdn.jsdelivr.net/npm/sortablejs@1.14.0/Sortable.min.js";
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
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {
            "level": 9,
            "extendedTimestamp": false
        });

        const data = {
            "repeatMode": this.repeatMode
        };

        // Iterate each entry
        for (let i = 0; i < playlistOrder.children.length; i++) {
            const entry = playlistOrder.children[i];
            const loadedPlayer = this.loadedPlayers.get(decodeHTML(entry.innerHTML));

            await zipWriter.add(`songs/${loadedPlayer.name}`, new zip.Uint8ArrayReader(new Uint8Array(loadedPlayer.arrayBuffer)));

            if (entry.classList.contains("playing")) {
                data.playing = i;
            }
        }

        await zipWriter.add("data", new zip.TextReader(JSON.stringify(data)));

        // Prepare the results for downloading
        const url = URL.createObjectURL(await zipWriter.close());

        const link = document.createElement("a");
        link.download = "playlist.zip";
        link.href = url;

        document.body.append(link);
        link.click();
        link.remove();
    }

    /**
     * Import a playlist from a JSON file.
     *
     * @param {Object} blob Blob to import.
     * @return {Promise<{repeatMode: number, songs: {name: string, buffer: ArrayBuffer}[], playing: number}>}
     */
    async import(blob) {
        const blobReader = new zip.BlobReader(blob);
        const zipReader = new zip.ZipReader(blobReader);
        const entries = await zipReader.getEntries();

        const data = {
            "files": []
        };
        for (const entry of entries) {
            if (entry.filename === "data") {
                const json = JSON.parse(await entry.getData(new zip.TextWriter()));
                Object.assign(data, json);
            } else if (entry.filename.startsWith("songs")) {
                const binary = await entry.getData(new zip.Uint8ArrayWriter());
                data.files.unshift({
                    "name": entry.filename.replace(/^songs\//, ""),
                    "buffer": binary.buffer
                });
            }
        }

        return data;
    }
}
