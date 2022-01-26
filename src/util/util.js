/**
 * Version span to update.
 *
 * @type {HTMLSpanElement}
 */
const version = document.getElementById("version");

/**
 * Reset all DOM elements to their default state.
 *
 * @return {void}
 */
export function resetElements() {
    for (const element of document.getElementsByTagName("*")) {
        if (element.dataset.ignore === "true") {
            continue;
        }

        // Disabled
        if (element.getAttribute("disabled") === "") {
            element.disabled = true;
        }

        // Inputs
        if (element.nodeName === "INPUT") {
            const type = element.getAttribute("type");

            // Files
            if (type === "file") {
                element.value = null;
            }

            // Ranges, text inputs
            if (type === "range" || type === "text" || type === "url") {
                element.value = element.getAttribute("value");
            }

            // Checkboxes
            if (type === "checkbox" && element.getAttribute("checked") === "") {
                element.checked = true;
            }
        }
    }
}

/**
 * Update the NBS.js footer version
 *
 * @return {Promise<void>}
 */
export async function updateVersion() {
    const response = await fetch("https://unpkg.com/@encode42/nbs.js/package.json");
    const data = await response.json();
    version.innerHTML = data.version;
}

/**
 * Decode HTML encoding.
 *
 * @author https://stackoverflow.com/a/42182294
 * @param html HTML encoded string to decode.
 * @return {string}
 */
export function decodeHTML(html) {
    const text = document.createElement("textarea");
    text.innerHTML = html;
    return text.value;
}

/**
 * Create a promise to wait for.
 *
 * @param ms Milliseconds to wait for.
 * @return {Promise}
 */
export async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
