(function (global) {
  /**
   * Returns the URL of the currently active tab in the current window.
   * @param {object} tabsApi - The browser tabs API (browser.tabs or chrome.tabs).
   * @returns {Promise<string>} The active tab's URL.
   * @throws {Error} If no active tab URL is found.
   */
  async function getActiveTabUrl(tabsApi) {
    const [tab] = await tabsApi.query({ active: true, currentWindow: true });
    const url = tab?.url;

    if (!url) {
      throw new Error("No active tab URL");
    }

    return url;
  }

  /**
   * Copies text to the clipboard using the Clipboard API if available,
   * falling back to the legacy document.execCommand('copy') approach.
   * @param {string} text - The text to copy.
   * @param {object} [options={}]
   * @param {object} [options.document] - The DOM document (required for execCommand fallback).
   * @param {object} [options.clipboard] - The Clipboard API object (navigator.clipboard).
   * @returns {Promise<void>}
   * @throws {Error} If neither clipboard method is available.
   */
  async function copyTextToClipboard(text, { document, clipboard } = {}) {
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return;
    }

    const canUseDomClipboard =
      document &&
      document.body &&
      typeof document.createElement === "function" &&
      typeof document.execCommand === "function";

    if (canUseDomClipboard) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");

      Object.assign(textarea.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "1px",
        height: "1px",
        padding: "0",
        border: "0",
        opacity: "0",
        pointerEvents: "none"
      });

      document.body.appendChild(textarea);
      textarea.focus?.();
      textarea.select?.();

      try {
        if (document.execCommand("copy")) {
          return;
        }
      } finally {
        textarea.remove?.();
      }
    }

    throw new Error("Clipboard API unavailable");
  }

  /**
   * Copies the active tab's URL to the clipboard.
   * @param {object} options
   * @param {object} options.tabsApi - The browser tabs API.
   * @param {object} [options.document] - The DOM document (for execCommand fallback).
   * @param {object} [options.clipboard] - The Clipboard API (navigator.clipboard).
   * @returns {Promise<string>} The URL that was copied.
   * @throws {Error} If no URL is found or clipboard write fails.
   */
  async function copyActiveTabUrl({ tabsApi, document, clipboard }) {
    const url = await getActiveTabUrl(tabsApi);
    await copyTextToClipboard(url, { document, clipboard });
    return url;
  }

  global.CopyUrlExtension = {
    copyActiveTabUrl,
    copyTextToClipboard,
    getActiveTabUrl
  };
})(globalThis);
