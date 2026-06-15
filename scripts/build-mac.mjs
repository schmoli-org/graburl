import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadEnv } from "./env.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const fileEnv = loadEnv(rootDir);
const developmentTeam = process.env.DEVELOPMENT_TEAM ?? fileEnv.DEVELOPMENT_TEAM;

if (!developmentTeam) {
  console.error("Set DEVELOPMENT_TEAM in .env or in the environment before running pnpm build:mac.");
  process.exit(1);
}

const result = spawnSync(
  "xcodebuild",
  [
    "-project",
    "GrabURL/GrabURL.xcodeproj",
    "-scheme",
    "GrabURL",
    "-configuration",
    "Debug",
    "-derivedDataPath",
    "build/SignedDerivedData",
    `DEVELOPMENT_TEAM=${developmentTeam}`,
    "CODE_SIGN_STYLE=Automatic",
    "build"
  ],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      DEVELOPMENT_TEAM: developmentTeam
    },
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
