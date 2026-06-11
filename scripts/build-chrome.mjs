import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function transformManifest(manifest) {
  const chrome = JSON.parse(JSON.stringify(manifest));

  chrome.description = "Copy the active tab URL to the clipboard.";
  // Cmd/Ctrl+Shift+C is Chrome's built-in DevTools inspect shortcut; Chrome
  // silently leaves a conflicting suggested_key unassigned, so suggest a
  // combination Chrome will actually bind.
  chrome.commands._execute_action.suggested_key = { default: "Alt+Shift+C" };

  return chrome;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const sourceDir = join(rootDir, "web-extension");
  const outDir = join(rootDir, "dist", "chrome");

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

  const zipPath = join(rootDir, "dist", `graburl-chrome-v${manifest.version}.zip`);
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
