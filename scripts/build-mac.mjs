import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(rootDir, ".env");

function parseEnvFile(contents) {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const fileEnv = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, "utf8")) : {};
const developmentTeam = process.env.DEVELOPMENT_TEAM ?? fileEnv.DEVELOPMENT_TEAM;

if (!developmentTeam) {
  console.error("Set DEVELOPMENT_TEAM in .env or in the environment before running pnpm build:mac.");
  process.exit(1);
}

const result = spawnSync(
  "xcodebuild",
  [
    "-project",
    "Safari Copy URL/Safari Copy URL.xcodeproj",
    "-scheme",
    "Safari Copy URL",
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
