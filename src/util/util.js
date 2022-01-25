/**
 * Reset all DOM elements to their default state.
 *
 * @return {void}
 */
export function resetElements() {
    for (const element of document.getElementsByTagName("*")) {
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

            // Ranges
            if (type === "range") {
                element.value = element.getAttribute("value");
            }

            // Checkboxes
            if (type === "checkbox" && element.getAttribute("checked") === "") {
                element.checked = true;
            }
        }
    }
}
