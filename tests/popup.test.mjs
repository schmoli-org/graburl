import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function loadPopupSandbox() {
  const sandbox = {
    console,
    setTimeout,
    Error
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync("web-extension/url-copy.js", "utf8"), sandbox);
  vm.runInContext(fs.readFileSync("web-extension/popup.js", "utf8"), sandbox);

  return sandbox;
}

function makeStatusElement() {
  return { textContent: "", dataset: {} };
}

function makeTabsApi(url) {
  return {
    query: async () => [{ url }]
  };
}

function makeClipboard() {
  const writes = [];
  return {
    api: {
      writeText: async (text) => {
        writes.push(text);
      }
    },
    writes
  };
}

function makeDocumentWithExecCommand() {
  const execCommands = [];
  const doc = {
    body: {
      appendChild: () => {}
    },
    createElement: (tagName) => ({
      tagName,
      value: "",
      style: {},
      setAttribute() {},
      focus() {},
      select() {},
      remove() {}
    }),
    execCommand: (command) => {
      execCommands.push(command);
      return true;
    }
  };
  return { doc, execCommands };
}

// ── friendlyError tests ─────────────────────────────────────────────────────

test('friendlyError maps "No active tab URL" → "No page URL to copy"', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  assert.equal(
    GrabURLPopup.friendlyError(new Error("No active tab URL")),
    "No page URL to copy"
  );
});

test('friendlyError maps "Clipboard API unavailable" → "Clipboard not accessible"', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  assert.equal(
    GrabURLPopup.friendlyError(new Error("Clipboard API unavailable")),
    "Clipboard not accessible"
  );
});

test('friendlyError maps a message containing "NotAllowedError" → "Clipboard access denied"', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  assert.equal(
    GrabURLPopup.friendlyError(new Error("NotAllowedError: Write permission denied")),
    "Clipboard access denied"
  );
});

test('friendlyError returns "Copy failed" for an unknown Error', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  assert.equal(
    GrabURLPopup.friendlyError(new Error("Something completely unexpected")),
    "Copy failed"
  );
});

test('friendlyError returns "Copy failed" for a non-Error value', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  assert.equal(GrabURLPopup.friendlyError("oops"), "Copy failed");
  assert.equal(GrabURLPopup.friendlyError(null), "Copy failed");
  assert.equal(GrabURLPopup.friendlyError(42), "Copy failed");
});

// ── copyCurrentTabUrl happy path ─────────────────────────────────────────────

test("happy path: copies URL, sets statusElement to Copied URL with state success", async () => {
  const { GrabURLPopup, CopyUrlExtension } = loadPopupSandbox();
  const statusElement = makeStatusElement();
  const { api: clipboard } = makeClipboard();
  const closeCalls = [];

  await GrabURLPopup.copyCurrentTabUrl({
    CopyUrlExtension,
    tabsApi: makeTabsApi("https://example.com/"),
    clipboard,
    document: null,
    statusElement,
    close: () => closeCalls.push(true)
  });

  assert.equal(statusElement.textContent, "Copied URL");
  assert.equal(statusElement.dataset.state, "success");
});

// ── no-URL path ──────────────────────────────────────────────────────────────

test("no-URL path: empty tab URL → friendly error message, state error", async () => {
  const { GrabURLPopup, CopyUrlExtension } = loadPopupSandbox();
  const statusElement = makeStatusElement();

  await GrabURLPopup.copyCurrentTabUrl({
    CopyUrlExtension,
    tabsApi: makeTabsApi(""),
    clipboard: null,
    document: null,
    statusElement,
    close: () => {}
  });

  assert.equal(statusElement.textContent, "No page URL to copy");
  assert.equal(statusElement.dataset.state, "error");
});

// ── execCommand fallback path (the bug fix) ──────────────────────────────────

test("fallback path: clipboard null, execCommand used → copy succeeds, Copied URL shown", async () => {
  const { GrabURLPopup, CopyUrlExtension } = loadPopupSandbox();
  const statusElement = makeStatusElement();
  const { doc, execCommands } = makeDocumentWithExecCommand();

  await GrabURLPopup.copyCurrentTabUrl({
    CopyUrlExtension,
    tabsApi: makeTabsApi("https://example.com/"),
    clipboard: null,
    document: doc,
    statusElement,
    close: () => {}
  });

  assert.equal(statusElement.textContent, "Copied URL");
  assert.equal(statusElement.dataset.state, "success");
  assert.deepEqual(execCommands, ["copy"]);
});
