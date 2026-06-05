const extensionApi = globalThis.browser ?? globalThis.chrome;
const statusElement = document.getElementById("status");

async function copyCurrentTabUrl() {
  try {
    await globalThis.CopyUrlExtension.copyActiveTabUrl({
      tabsApi: extensionApi.tabs,
      clipboard: globalThis.navigator?.clipboard
    });

    statusElement.textContent = "Copied URL";
    statusElement.dataset.state = "success";

    setTimeout(() => globalThis.close?.(), 1200);
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "Copy failed";
    statusElement.dataset.state = "error";
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  copyCurrentTabUrl().catch(console.error);
});
