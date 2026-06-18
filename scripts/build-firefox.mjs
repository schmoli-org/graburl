import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Firefox requires an explicit add-on ID to sign a Manifest V3 extension; AMO
// will not assign one. The email-style form is arbitrary but must be stable.
export const GECKO_ID = "graburl@schmoli.com";
// data_collection_permissions is honoured by Firefox 140+, so pin the floor
// there. MV3, the clipboard API, and _execute_action are all supported well
// below this, so nothing else constrains the minimum.
export const STRICT_MIN_VERSION = "140.0";

export function transformManifest(manifest) {
  const firefox = JSON.parse(JSON.stringify(manifest));

  firefox.description = "Copy the active tab URL to the clipboard.";
  // Firefox binds Cmd/Ctrl+Shift+C to the DevTools Inspector, exactly like
  // Chrome, and silently drops a conflicting suggested_key. Alt+Shift+C is
  // unreserved, and matches the Chrome build for a consistent shortcut.
  firefox.commands._execute_action.suggested_key = { default: "Alt+Shift+C" };
  // gecko.id is mandatory for signing MV3; new AMO listings must also declare
  // what data they collect. GrabURL collects nothing, so "none".
  firefox.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: STRICT_MIN_VERSION,
      data_collection_permissions: { required: ["none"] }
    }
  };

  return firefox;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const sourceDir = join(rootDir, "web-extension");
  const outDir = join(rootDir, "dist", "firefox");

  const manifest = transformManifest(
    JSON.parse(readFileSync(join(sourceDir, "manifest.json"), "utf8"))
  );

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(sourceDir, outDir, {
    recursive: true,
    filter: (src) => !basename(src).startsWith(".")
  });
  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  const zipPath = join(rootDir, "dist", `graburl-firefox-v${manifest.version}.zip`);
  rmSync(zipPath, { force: true });

  const result = spawnSync("zip", ["-r", "-X", zipPath, "."], {
    cwd: outDir,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    console.error("zip failed");
    process.exit(result.status ?? 1);
  }

  console.log(`Built: ${zipPath}`);
}
