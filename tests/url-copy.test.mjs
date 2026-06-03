import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function loadExtensionSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync("web-extension/url-copy.js", "utf8"), sandbox);

  return sandbox;
}

function loadExtensionModule() {
  return loadExtensionSandbox().CopyUrlExtension;
}

async function getInjectedToastScript() {
  const sandbox = loadExtensionSandbox();
  const { copyActiveTabUrl } = sandbox.CopyUrlExtension;
  const scripts = [];

  await copyActiveTabUrl({
    tabsApi: {
      query: async () => [
        {
          id: 42,
          url: "https://example.com/"
        }
      ]
    },
    scriptingApi: {
      executeScript: async (details) => scripts.push(details)
    }
  });

  return { sandbox, script: scripts[0] };
}

function installInjectedDom(sandbox) {
  const appended = [];
  const frames = [];
  const timers = [];
  const writes = [];

  sandbox.navigator = {
    clipboard: {
      writeText: async (text) => writes.push(text)
    }
  };
  sandbox.document = {
    documentElement: {
      appendChild: (element) => appended.push(element)
    },
    getElementById: () => null,
    createElement: (tagName) => ({
      tagName,
      id: "",
      textContent: "",
      style: {},
      removeCalls: 0,
      remove() {
        this.removeCalls += 1;
      }
    })
  };
  sandbox.requestAnimationFrame = (callback) => frames.push(callback);
  sandbox.setTimeout = (callback, delay) => timers.push({ callback, delay });

  return { appended, frames, timers, writes };
}

test("getActiveTabUrl returns the active tab URL exactly", async () => {
  const { getActiveTabUrl } = loadExtensionModule();
  const tabsApi = {
    query: async (query) => {
      assert.equal(query.active, true);
      assert.equal(query.currentWindow, true);
      return [{ url: "https://google.com" }];
    }
  };

  assert.equal(await getActiveTabUrl(tabsApi), "https://google.com");
});

test("copyActiveTabUrl injects a script that writes the active tab URL exactly and shows a toast", async () => {
  const { copyActiveTabUrl } = loadExtensionModule();
  const scripts = [];

  const result = await copyActiveTabUrl({
    tabsApi: {
      query: async () => [
        {
          id: 42,
          url: "https://example.com/search?q=safari%20extension"
        }
      ]
    },
    scriptingApi: {
      executeScript: async (details) => scripts.push(details)
    }
  });

  assert.equal(result, "https://example.com/search?q=safari%20extension");
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].target.tabId, 42);
  assert.equal(scripts[0].args.length, 1);
  assert.equal(scripts[0].args[0], "https://example.com/search?q=safari%20extension");
  assert.equal(typeof scripts[0].func, "function");
});

test("copyActiveTabUrl injected toast appears top-center below Safari chrome", async () => {
  const { sandbox, script } = await getInjectedToastScript();
  const { appended } = installInjectedDom(sandbox);

  await script.func(script.args[0]);

  assert.equal(appended.length, 1);
  assert.equal(appended[0].style.position, "fixed");
  assert.equal(appended[0].style.top, "12px");
  assert.equal(appended[0].style.left, "50%");
  assert.match(appended[0].style.transform, /translate\(-50%,/);
  assert.equal(appended[0].style.right, undefined);
  assert.equal(appended[0].style.bottom, undefined);
});

test("copyActiveTabUrl injected toast slides down, stays steady, then slides up", async () => {
  const { sandbox, script } = await getInjectedToastScript();
  const { appended, frames, timers } = installInjectedDom(sandbox);

  await script.func(script.args[0]);

  assert.equal(appended.length, 1);
  const toast = appended[0];
  assert.equal(toast.style.opacity, "0");
  assert.equal(toast.style.transform, "translate(-50%, -12px) scale(0.96)");
  assert.match(toast.style.transition, /transform 260ms/);

  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(toast.style.opacity, "1");
  assert.equal(toast.style.transform, "translate(-50%, 0) scale(1)");

  timers.find((timer) => timer.delay === 1320).callback();
  assert.equal(toast.style.opacity, "0");
  assert.equal(toast.style.transform, "translate(-50%, -12px) scale(0.98)");

  timers.find((timer) => timer.delay === 1600).callback();
  assert.equal(toast.removeCalls, 1);
});

test("copyActiveTabUrl falls back to the background clipboard when page injection is unavailable", async () => {
  const { copyActiveTabUrl } = loadExtensionModule();
  const writes = [];

  const result = await copyActiveTabUrl({
    tabsApi: {
      query: async () => [{ url: "https://fallback.example/" }]
    },
    clipboard: {
      writeText: async (text) => writes.push(text)
    }
  });

  assert.equal(result, "https://fallback.example/");
  assert.deepEqual(writes, ["https://fallback.example/"]);
});

test("copyActiveTabUrl rejects when the active tab has no copyable URL", async () => {
  const { copyActiveTabUrl } = loadExtensionModule();

  await assert.rejects(
    copyActiveTabUrl({
      tabsApi: {
        query: async () => [{ url: "" }]
      }
    }),
    /No active tab URL/
  );
});
