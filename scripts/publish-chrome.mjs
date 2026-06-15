import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./env.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_VARS = ["EXTENSION_ID", "CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN"];

export function missingCredentials(env) {
  return REQUIRED_VARS.filter((key) => !env[key]);
}

export function zipPathFor(rootDir, version) {
  return join(rootDir, "dist", `graburl-chrome-v${version}.zip`);
}

export function listingUrl(extensionId) {
  return `https://chromewebstore.google.com/detail/${extensionId}`;
}

async function fetchAccessToken({ CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    console.error("OAuth token refresh failed:");
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  return body.access_token;
}

async function uploadZip(extensionId, accessToken, zipPath) {
  const response = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-api-version": "2"
      },
      body: readFileSync(zipPath)
    }
  );

  const body = await response.json();
  if (!response.ok || body.uploadState !== "SUCCESS") {
    console.error("Upload failed:");
    console.error(JSON.stringify(body.itemError ?? body, null, 2));
    process.exit(1);
  }
}

async function submitForReview(extensionId, accessToken) {
  const response = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-api-version": "2"
      }
    }
  );

  const body = await response.json();
  const status = body.status ?? [];
  // "publish" via the API means submit for review; OK and ITEM_PENDING_REVIEW
  // both indicate the new version is queued.
  if (!response.ok || !status.some((s) => s === "OK" || s === "ITEM_PENDING_REVIEW")) {
    console.error("Submit for review failed:");
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  if (body.statusDetail?.length) {
    console.log(body.statusDetail.join("\n"));
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const fileEnv = loadEnv(rootDir);
  const env = Object.fromEntries(
    REQUIRED_VARS.map((key) => [key, process.env[key] ?? fileEnv[key]])
  );

  const missing = missingCredentials(env);
  if (missing.length > 0) {
    console.error(`Missing in .env or the environment: ${missing.join(", ")}`);
    console.error("See docs/chrome-store-submission.md for the one-time OAuth setup.");
    process.exit(1);
  }

  const manifest = JSON.parse(
    readFileSync(join(rootDir, "web-extension", "manifest.json"), "utf8")
  );
  const zipPath = zipPathFor(rootDir, manifest.version);
  if (!existsSync(zipPath)) {
    console.error(`Missing ${zipPath} — run \`make chrome\` first.`);
    process.exit(1);
  }

  const accessToken = await fetchAccessToken(env);

  console.log(`Uploading ${zipPath}…`);
  await uploadZip(env.EXTENSION_ID, accessToken, zipPath);

  console.log("Submitting for review…");
  await submitForReview(env.EXTENSION_ID, accessToken);

  console.log(`Submitted v${manifest.version} for review.`);
  console.log(`Listing: ${listingUrl(env.EXTENSION_ID)}`);
}
