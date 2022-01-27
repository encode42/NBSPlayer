/**
 * Represents an IndexedDB connector.
 */
export default class Database {
    /**
     * Name of the database.
     *
     * @type {string}
     * @private
     */
    name;

    /**
     * Object store to use.
     *
     * @type {string}
     * @private
     */
    store;

    /**
     * Version of the database.
     *
     * @type {number}
     * @private
     */
    version;

    /**
     * Create an IndexedDB connector.
     *
     * @param {string} name Name of the database
     * @param {string} store Object store to use
     * @param {number} [version=1] Version of the database
     */
    constructor(name, store, version = 1) {
        this.name = name;
        this.store = store;
        this.version = version;
    }

    /**
     * Get a value from the database.
     *
     * @param {string} key Key to get
     * @return {Promise<any>}
     */
    get(key) {
        return new Promise((resolve, reject) => {
            // Connect to the database
            this.open((error, db) => {
                if (error) {
                    reject(error);
                    return;
                }

                // Get the key from the store
                this.getFromStore(db.store, key, (error, result) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(result);
                });
            });
        });
    }

    /**
     * Set a value in the database.
     *
     * @param {string} key Key to set
     * @param {any} value Value to set
     * @return {Promise<void>}
     */
    put(key, value) {
        return new Promise((resolve, reject) => {
            // Connect to the database
            this.open((error, db) => {
                if (error) {
                    reject(error);
                    return;
                }

                // Set the key in the store
                this.putInStore(db.store, key, value, error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            }, true);
        });
    }

    /**
     * Whether the database contains a key.
     *
     * @param key Key to search for
     * @return {Promise<{has: boolean, result: any}>}
     */
    contains(key) {
        return new Promise(resolve => {
            // Connect to the database
            this.open((error, db) => {
                if (error) {
                    // Database does not have store
                    resolve({
                        "has": false
                    });
                    return;
                }

                // Get the key from the store
                this.getFromStore(db.store, key, (error, result) => {
                    if (error) {
                        // Database does not have key
                        resolve({
                            "has": false
                        });
                        return;
                    }

                    resolve({
                        "has": true,
                        "result": result
                    });
                });
            });
        });
    }

    /**
     * Open a connection to the database.
     *
     * @param {Function} callback Callback to execute once opened
     * @param {boolean} [writing=false] Whether to open the database with write privileges
     * @return {void}
     * @private
     */
    open(callback, writing = false) {
        const request = indexedDB.open(this.name);

        // Error occurred
        request.addEventListener("error", () => {
            throw new Error(request.error.toString());
        });

        // Database object required
        request.addEventListener("upgradeneeded", () => {
            const database = request.result;
            database.createObjectStore(this.store);
        });

        // Connected
        request.addEventListener("success", () => {
            // Get the database, transaction, and store
            const database = request.result;

            let transaction;
            try {
                transaction = database.transaction(this.store, writing ? "readwrite" : "readonly");
            } catch (e) {
                callback(e);
                return;
            }

            const store = transaction.objectStore(this.store);

            callback(undefined, {
                database,
                transaction,
                store
            });
        });
    }

    /**
     * Get a key from a store.
     *
     * @param {IDBObjectStore} store Store to get from
     * @param {string} key Key to get
     * @param {Function} callback Callback to execute once retrieved
     * @return {void}
     * @private
     */
    getFromStore(store, key, callback) {
        const object = store.get(key);

        // Error occurred
        object.addEventListener("error", () => {
            callback(object.error);
        });

        // Key retrieved
        object.addEventListener("success", () => {
            if (object.result === undefined) {
                callback(new Error("Key not found in database."));
            }

            callback(undefined, object.result);
        });
    }

    /**
     * Set a key in a store.
     *
     * @param {IDBObjectStore} store Store to set in
     * @param {string} key Key to set
     * @param {any} value Value to set
     * @param {Function} callback Callback to execute once set
     * @return {void}
     * @private
     */
    putInStore(store, key, value, callback) {
        const object = (value === undefined || value === null) ? store.delete(key) : store.put(value, key);

        // Error occurred
        object.addEventListener("error", () => {
            callback(new Error(object.error.toString()));
        });

        // Value put
        object.addEventListener("success", () => {
            callback();
        });
    }
}
