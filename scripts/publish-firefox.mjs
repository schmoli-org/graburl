import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadEnv } from "./env.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_VARS = ["AMO_API_KEY", "AMO_API_SECRET"];

export function missingCredentials(env) {
  return REQUIRED_VARS.filter((key) => !env[key]);
}

export function zipPathFor(rootDir, version) {
  return join(rootDir, "dist", `graburl-firefox-v${version}.zip`);
}

// web-ext signs and submits via the AMO API; building the argv separately keeps
// it unit-testable without invoking the network. The credentials are passed as
// flags rather than env so the spawn does not depend on the caller's shell.
export function signArgs({ apiKey, apiSecret, sourceDir, artifactsDir, channel = "listed" }) {
  return [
    "dlx",
    "web-ext@8",
    "sign",
    `--channel=${channel}`,
    `--source-dir=${sourceDir}`,
    `--artifacts-dir=${artifactsDir}`,
    `--api-key=${apiKey}`,
    `--api-secret=${apiSecret}`
  ];
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const fileEnv = loadEnv(rootDir);
  const env = Object.fromEntries(
    REQUIRED_VARS.map((key) => [key, process.env[key] ?? fileEnv[key]])
  );

  const missing = missingCredentials(env);
  if (missing.length > 0) {
    console.error(`Missing in .env or the environment: ${missing.join(", ")}`);
    console.error("See docs/private/firefox-store-submission.md for the one-time AMO API setup.");
    process.exit(1);
  }

  const manifest = JSON.parse(
    readFileSync(join(rootDir, "web-extension", "manifest.json"), "utf8")
  );
  const sourceDir = join(rootDir, "dist", "firefox");
  if (!existsSync(sourceDir)) {
    console.error(`Missing ${sourceDir} — run \`make firefox\` first.`);
    process.exit(1);
  }

  const args = signArgs({
    apiKey: env.AMO_API_KEY,
    apiSecret: env.AMO_API_SECRET,
    sourceDir,
    artifactsDir: join(rootDir, "dist")
  });

  console.log(`Signing and submitting v${manifest.version} to addons.mozilla.org…`);
  const result = spawnSync("pnpm", args, { cwd: rootDir, stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    console.error("web-ext sign failed");
    process.exit(result.status ?? 1);
  }

  console.log(`Submitted v${manifest.version} to AMO.`);
  console.log("Manage the listing: https://addons.mozilla.org/developers/addons");
}
