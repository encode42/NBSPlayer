/**
 * Represents a class that can emit events.
 */
export class EventClass {
    /**
     * Listeners that are attached to the class.
     *
     * @type {Map<string, Function>}
     * @private
     */
    listeners = new Map();

    /**
     * Add an event listener to the class.
     *
     * @param {string} event Event to listen for
     * @param {Function} callback Callback to execute
     * @return {void}
     */
    addEventListener(event, callback) {
        this.listeners.set(event, callback);
    }

    /**
     * Emit an event.
     *
     * @param {string} event Event to emit
     * @param {Object} [data={}] Data to emit with
     * @return {void}
     * @protected
     */
    emit(event, data = {}) {
        for (const [key, value] of this.listeners) {
            if (key === event) {
                value(data);
            }
        }
    }
}
