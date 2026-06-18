import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import {
  GECKO_ID,
  STRICT_MIN_VERSION,
  transformManifest
} from "../scripts/build-firefox.mjs";

const source = JSON.parse(fs.readFileSync("web-extension/manifest.json", "utf8"));
const firefox = transformManifest(source);

test("firefox description drops the Safari wording", () => {
  assert.equal(firefox.description, "Copy the active tab URL to the clipboard.");
  assert.equal(firefox.description.includes("Safari"), false);
});

test("firefox shortcut is Alt+Shift+C on every platform", () => {
  assert.deepEqual(firefox.commands._execute_action.suggested_key, {
    default: "Alt+Shift+C"
  });
});

test("firefox declares a gecko id and a Manifest V3 floor", () => {
  assert.equal(firefox.browser_specific_settings.gecko.id, GECKO_ID);
  assert.equal(
    firefox.browser_specific_settings.gecko.strict_min_version,
    STRICT_MIN_VERSION
  );
});

test("firefox declares that it collects no data", () => {
  assert.deepEqual(
    firefox.browser_specific_settings.gecko.data_collection_permissions,
    { required: ["none"] }
  );
});

test("everything else passes through from the canonical manifest", () => {
  assert.equal(firefox.manifest_version, source.manifest_version);
  assert.equal(firefox.name, source.name);
  assert.equal(firefox.version, source.version);
  assert.deepEqual(firefox.permissions, ["activeTab", "clipboardWrite"]);
  assert.deepEqual(firefox.icons, source.icons);
  assert.deepEqual(firefox.action, source.action);
  assert.equal(firefox.background, undefined);
  assert.equal(
    firefox.commands._execute_action.description,
    source.commands._execute_action.description
  );
});

test("transformManifest does not mutate its input", () => {
  const input = JSON.parse(fs.readFileSync("web-extension/manifest.json", "utf8"));
  transformManifest(input);
  assert.equal(input.description.includes("Safari"), true);
  assert.equal(input.commands._execute_action.suggested_key.mac, "Command+Shift+C");
  assert.equal(input.browser_specific_settings, undefined);
});
