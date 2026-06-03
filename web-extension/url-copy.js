(function (global) {
  async function getActiveTabUrl(tabsApi) {
    const [tab] = await tabsApi.query({ active: true, currentWindow: true });
    const url = tab?.url;

    if (!url) {
      throw new Error("No active tab URL");
    }

    return url;
  }

  async function copyActiveTabUrl({ tabsApi, clipboard, scriptingApi }) {
    const [tab] = await tabsApi.query({ active: true, currentWindow: true });
    const url = tab?.url;

    if (!url) {
      throw new Error("No active tab URL");
    }

    if (scriptingApi?.executeScript && tab.id != null) {
      await scriptingApi.executeScript({
        target: { tabId: tab.id },
        func: copyUrlAndShowToast,
        args: [url]
      });
    } else if (clipboard?.writeText) {
      await clipboard.writeText(url);
    } else {
      throw new Error("Clipboard API unavailable");
    }

    return url;
  }

  async function copyUrlAndShowToast(url) {
    await navigator.clipboard.writeText(url);

    const existingToast = document.getElementById("copy-url-extension-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "copy-url-extension-toast";
    toast.textContent = "URL copied";

    Object.assign(toast.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "12px",
      left: "50%",
      opacity: "0",
      transform: "translate(-50%, -12px) scale(0.96)",
      transformOrigin: "50% 0",
      transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease-out",
      padding: "10px 12px",
      borderRadius: "8px",
      background: "rgba(24, 24, 27, 0.94)",
      color: "#ffffff",
      font: "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
      pointerEvents: "none"
    });

    document.documentElement.appendChild(toast);

    const showToast = () => {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%, 0) scale(1)";
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(showToast);
    } else {
      setTimeout(showToast, 0);
    }

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, -12px) scale(0.98)";
    }, 1320);
    setTimeout(() => toast.remove(), 1600);
  }

  global.CopyUrlExtension = {
    copyActiveTabUrl,
    getActiveTabUrl
  };
})(globalThis);
