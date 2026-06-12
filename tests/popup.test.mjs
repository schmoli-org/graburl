import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function loadPopupSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
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

// ── waitForDocumentFocus tests ──────────────────────────────────────────────

test("waitForDocumentFocus resolves immediately when the document already has focus", async () => {
  const { GrabURLPopup } = loadPopupSandbox();
  const focusListeners = [];

  await GrabURLPopup.waitForDocumentFocus({
    document: { hasFocus: () => true },
    window: {
      addEventListener: (event, listener) => focusListeners.push([event, listener])
    }
  });

  assert.deepEqual(focusListeners, []);
});

test("waitForDocumentFocus resolves when the window gains focus", async () => {
  const { GrabURLPopup } = loadPopupSandbox();
  const focusListeners = [];

  const pending = GrabURLPopup.waitForDocumentFocus({
    document: { hasFocus: () => false },
    window: {
      addEventListener: (event, listener) => {
        if (event === "focus") focusListeners.push(listener);
      }
    }
  });

  assert.equal(focusListeners.length, 1);
  focusListeners[0]();
  await pending;
});

test("waitForDocumentFocus gives up after timeoutMs when focus never arrives", async () => {
  const { GrabURLPopup } = loadPopupSandbox();

  await GrabURLPopup.waitForDocumentFocus({
    document: { hasFocus: () => false },
    window: { addEventListener: () => {} },
    timeoutMs: 10
  });
});

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

test('friendlyError maps an error whose name is "NotAllowedError" → "Clipboard access denied"', () => {
  const { GrabURLPopup } = loadPopupSandbox();
  // Safari rejects clipboard writes with a DOMException whose .name is
  // "NotAllowedError" but whose .message is prose that never contains it.
  const error = new Error("The request is not allowed by the user agent.");
  error.name = "NotAllowedError";
  assert.equal(GrabURLPopup.friendlyError(error), "Clipboard access denied");
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

// ── focus-wait path (Windows Chrome bug fix) ─────────────────────────────────

test("copy is deferred until the popup document gains focus", async () => {
  const { GrabURLPopup, CopyUrlExtension } = loadPopupSandbox();
  const statusElement = makeStatusElement();
  const writes = [];
  const focusListeners = [];
  let focused = false;

  const pending = GrabURLPopup.copyCurrentTabUrl({
    CopyUrlExtension,
    tabsApi: makeTabsApi("https://example.com/"),
    clipboard: {
      writeText: async (text) => {
        if (!focused) {
          const error = new Error(
            "Failed to execute 'writeText' on 'Clipboard': Document is not focused."
          );
          error.name = "NotAllowedError";
          throw error;
        }
        writes.push(text);
      }
    },
    document: { hasFocus: () => focused },
    window: {
      addEventListener: (event, listener) => {
        if (event === "focus") focusListeners.push(listener);
      }
    },
    statusElement,
    close: () => {}
  });

  assert.equal(focusListeners.length, 1);
  focused = true;
  focusListeners[0]();
  await pending;

  assert.deepEqual(writes, ["https://example.com/"]);
  assert.equal(statusElement.textContent, "Copied URL");
  assert.equal(statusElement.dataset.state, "success");
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
