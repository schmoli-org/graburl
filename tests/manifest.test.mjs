import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";

const manifest = JSON.parse(fs.readFileSync("web-extension/manifest.json", "utf8"));

test("copy action defaults to Command+Shift+C on macOS", () => {
  assert.equal(
    manifest.commands._execute_action.suggested_key.mac,
    "Command+Shift+C"
  );
});

test("extension only requests activeTab and opens a popup", () => {
  assert.deepEqual(manifest.permissions, ["activeTab"]);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(manifest.background, undefined);
  assert.deepEqual(Object.keys(manifest.commands), ["_execute_action"]);
});

test("extension declares toolbar and listing icons", () => {
  const expectedIcons = {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  };

  assert.deepEqual(manifest.icons, expectedIcons);
  assert.deepEqual(manifest.action.default_icon, expectedIcons);

  for (const iconPath of Object.values(expectedIcons)) {
    assert.equal(fs.existsSync(`web-extension/${iconPath}`), true);
  }
});

test("extension toolbar icons keep a transparent corner", () => {
  const readCornerAlpha = (iconPath) => {
    const script = [
      "from PIL import Image",
      "import sys",
      'image = Image.open(sys.argv[1]).convert("RGBA")',
      'print(image.getpixel((0, 0))[3])'
    ].join("; ");

    return Number(
      execFileSync("python3", ["-c", script, iconPath], { encoding: "utf8" }).trim()
    );
  };

  for (const iconPath of [
    "web-extension/icons/icon-16.png",
    "web-extension/icons/icon-32.png",
    "web-extension/icons/icon-48.png",
    "web-extension/icons/icon-128.png",
    "web-extension/icons/icon-256.png",
    "web-extension/icons/icon-512.png"
  ]) {
    assert.equal(readCornerAlpha(iconPath), 0, `${iconPath} should keep a transparent corner`);
  }
});
