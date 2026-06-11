import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { transformManifest } from "../scripts/build-chrome.mjs";

const source = JSON.parse(fs.readFileSync("web-extension/manifest.json", "utf8"));
const chrome = transformManifest(source);

test("chrome description drops the Safari wording", () => {
  assert.equal(chrome.description, "Copy the active tab URL to the clipboard.");
  assert.equal(chrome.description.includes("Safari"), false);
});

test("chrome shortcut is Alt+Shift+C on every platform", () => {
  assert.deepEqual(chrome.commands._execute_action.suggested_key, {
    default: "Alt+Shift+C"
  });
});

test("everything else passes through from the canonical manifest", () => {
  assert.equal(chrome.manifest_version, source.manifest_version);
  assert.equal(chrome.name, source.name);
  assert.equal(chrome.version, source.version);
  assert.deepEqual(chrome.permissions, ["activeTab", "clipboardWrite"]);
  assert.deepEqual(chrome.icons, source.icons);
  assert.deepEqual(chrome.action, source.action);
  assert.equal(chrome.background, undefined);
  assert.equal(
    chrome.commands._execute_action.description,
    source.commands._execute_action.description
  );
});

test("transformManifest does not mutate its input", () => {
  const input = JSON.parse(fs.readFileSync("web-extension/manifest.json", "utf8"));
  transformManifest(input);
  assert.equal(input.description.includes("Safari"), true);
  assert.equal(input.commands._execute_action.suggested_key.mac, "Command+Shift+C");
});
