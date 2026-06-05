(function (global) {
  async function getActiveTabUrl(tabsApi) {
    const [tab] = await tabsApi.query({ active: true, currentWindow: true });
    const url = tab?.url;

    if (!url) {
      throw new Error("No active tab URL");
    }

    return url;
  }

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
