/**
 * Prints the specified text to the console.
 *
 * @param {string} text - The text to be printed. Defaults to an empty string.
 */
export const printToConsole = (text = "") => {
  const consoleElement = document.querySelector("#console");
  const lineDiv = document.createElement("div");
  lineDiv.innerHTML = `> ${text}`;
  lineDiv.classList.add("console-line");

  consoleElement.appendChild(lineDiv);

  consoleElement.scrollTop = consoleElement.scrollHeight;
};

/**
 * Turns Uint8Array into a hex string
 *
 * @param {Uint8Array} array
 * @param {string} separator
 */
export const toHexString = (array, separator) => {
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(separator);
};
