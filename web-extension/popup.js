(function (global) {
  /**
   * Maps a caught error to a user-friendly message string.
   * @param {unknown} error - The thrown value.
   * @returns {string} A short, human-readable error message.
   */
  function friendlyError(error) {
    if (!(error instanceof Error)) return "Copy failed";
    const message = error.message;
    if (message === "No active tab URL") return "No page URL to copy";
    if (message === "Clipboard API unavailable") return "Clipboard not accessible";
    if (error.name === "NotAllowedError" || message.includes("NotAllowedError") || message.toLowerCase().includes("permission")) {
      return "Clipboard access denied";
    }
    return "Copy failed";
  }

  /**
   * Copies the current tab URL to the clipboard and updates the status element.
   * @param {object} options
   * @param {object} options.CopyUrlExtension - The CopyUrlExtension module.
   * @param {object} options.tabsApi - The browser tabs API.
   * @param {object} [options.clipboard] - The Clipboard API (navigator.clipboard).
   * @param {object} [options.document] - The DOM document (for execCommand fallback).
   * @param {object} options.statusElement - DOM element whose textContent and dataset.state are updated.
   * @param {Function} [options.close] - Called after a short delay on success to close the popup.
   * @returns {Promise<void>}
   */
  async function copyCurrentTabUrl({ CopyUrlExtension, tabsApi, clipboard, document, statusElement, close }) {
    try {
      await CopyUrlExtension.copyActiveTabUrl({ tabsApi, clipboard, document });
      statusElement.textContent = "Copied URL";
      statusElement.dataset.state = "success";
      setTimeout(() => close?.(), 1200);
    } catch (error) {
      statusElement.textContent = friendlyError(error);
      statusElement.dataset.state = "error";
      console.error(error);
    }
  }

  global.GrabURLPopup = { copyCurrentTabUrl, friendlyError };

  if (global.document?.addEventListener) {
    global.document.addEventListener("DOMContentLoaded", () => {
      const extensionApi = global.browser ?? global.chrome;
      copyCurrentTabUrl({
        CopyUrlExtension: global.CopyUrlExtension,
        tabsApi: extensionApi?.tabs,
        clipboard: global.navigator?.clipboard,
        document: global.document,
        statusElement: global.document.getElementById("status"),
        close: () => global.close?.()
      }).catch(console.error);
    });
  }
})(globalThis);
