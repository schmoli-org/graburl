importScripts("url-copy.js");

const extensionApi = globalThis.browser ?? globalThis.chrome;

async function copyCurrentTabUrl() {
  await globalThis.CopyUrlExtension.copyActiveTabUrl({
    tabsApi: extensionApi.tabs,
    clipboard: globalThis.navigator?.clipboard,
    scriptingApi: extensionApi.scripting
  });
}

extensionApi.action.onClicked.addListener(() => {
  copyCurrentTabUrl().catch(console.error);
});

extensionApi.commands.onCommand.addListener((command) => {
  if (command === "copy-current-tab-url") {
    copyCurrentTabUrl().catch(console.error);
  }
});
