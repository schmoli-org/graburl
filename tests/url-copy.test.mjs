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

function installClipboardDom(sandbox) {
  const appended = [];
  const removed = [];
  const selections = [];
  const execCommands = [];
  const created = [];

  sandbox.document = {
    body: {
      appendChild: (element) => {
        appended.push(element);
      }
    },
    createElement: (tagName) => {
      const element = {
        tagName,
        value: "",
        style: {},
        setAttribute() {},
        focus() {},
        select() {
          selections.push(this.value);
        },
        remove() {
          removed.push(this.value);
        }
      };

      created.push(element);
      return element;
    },
    execCommand: (command) => {
      execCommands.push(command);
      return true;
    }
  };

  return { appended, removed, selections, execCommands, created };
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

test("copyTextToClipboard uses the DOM clipboard flow when available", async () => {
  const { copyTextToClipboard } = loadExtensionModule();
  const sandbox = loadExtensionSandbox();
  const { appended, removed, selections, execCommands, created } = installClipboardDom(sandbox);

  await copyTextToClipboard("https://example.com/", { document: sandbox.document });

  assert.equal(created.length, 1);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].tagName, "textarea");
  assert.equal(appended[0].value, "https://example.com/");
  assert.deepEqual(selections, ["https://example.com/"]);
  assert.deepEqual(execCommands, ["copy"]);
  assert.deepEqual(removed, ["https://example.com/"]);
});

test("copyTextToClipboard falls back to the clipboard API when DOM copy is unavailable", async () => {
  const { copyTextToClipboard } = loadExtensionModule();
  const writes = [];

  await copyTextToClipboard("https://fallback.example/", {
    clipboard: {
      writeText: async (text) => writes.push(text)
    }
  });

  assert.deepEqual(writes, ["https://fallback.example/"]);
});

test("copyActiveTabUrl copies the active tab URL exactly", async () => {
  const { copyActiveTabUrl } = loadExtensionModule();
  const sandbox = loadExtensionSandbox();
  const { appended, removed, selections, execCommands } = installClipboardDom(sandbox);

  const result = await copyActiveTabUrl({
    tabsApi: {
      query: async () => [
        {
          url: "https://example.com/search?q=safari%20extension"
        }
      ]
    },
    document: sandbox.document
  });

  assert.equal(result, "https://example.com/search?q=safari%20extension");
  assert.deepEqual(appended.map((element) => element.value), [
    "https://example.com/search?q=safari%20extension"
  ]);
  assert.deepEqual(selections, ["https://example.com/search?q=safari%20extension"]);
  assert.deepEqual(execCommands, ["copy"]);
  assert.deepEqual(removed, ["https://example.com/search?q=safari%20extension"]);
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
