import assert from "node:assert/strict";
import { test } from "node:test";

import {
  missingCredentials,
  signArgs,
  zipPathFor
} from "../scripts/publish-firefox.mjs";

test("missingCredentials names every absent or empty variable", () => {
  assert.deepEqual(missingCredentials({}), ["AMO_API_KEY", "AMO_API_SECRET"]);
  assert.deepEqual(
    missingCredentials({ AMO_API_KEY: "key", AMO_API_SECRET: "" }),
    ["AMO_API_SECRET"]
  );
});

test("missingCredentials is empty when everything is set", () => {
  assert.deepEqual(
    missingCredentials({ AMO_API_KEY: "key", AMO_API_SECRET: "secret" }),
    []
  );
});

test("zipPathFor matches the build-firefox output path", () => {
  assert.equal(
    zipPathFor("/repo", "1.0.1"),
    "/repo/dist/graburl-firefox-v1.0.1.zip"
  );
});

test("signArgs submits the built source dir to the listed channel", () => {
  assert.deepEqual(
    signArgs({
      apiKey: "key",
      apiSecret: "secret",
      sourceDir: "/repo/dist/firefox",
      artifactsDir: "/repo/dist"
    }),
    [
      "dlx",
      "web-ext@8",
      "sign",
      "--channel=listed",
      "--source-dir=/repo/dist/firefox",
      "--artifacts-dir=/repo/dist",
      "--api-key=key",
      "--api-secret=secret"
    ]
  );
});
