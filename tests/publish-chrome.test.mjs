import assert from "node:assert/strict";
import { test } from "node:test";

import {
  listingUrl,
  missingCredentials,
  zipPathFor
} from "../scripts/publish-chrome.mjs";

test("missingCredentials names every absent or empty variable", () => {
  assert.deepEqual(missingCredentials({}), [
    "EXTENSION_ID",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REFRESH_TOKEN"
  ]);
  assert.deepEqual(
    missingCredentials({
      EXTENSION_ID: "abc",
      CLIENT_ID: "",
      CLIENT_SECRET: "shh",
      REFRESH_TOKEN: "tok"
    }),
    ["CLIENT_ID"]
  );
});

test("missingCredentials is empty when everything is set", () => {
  assert.deepEqual(
    missingCredentials({
      EXTENSION_ID: "abc",
      CLIENT_ID: "id",
      CLIENT_SECRET: "shh",
      REFRESH_TOKEN: "tok"
    }),
    []
  );
});

test("zipPathFor matches the build-chrome output path", () => {
  assert.equal(zipPathFor("/repo", "1.0.1"), "/repo/dist/graburl-chrome-v1.0.1.zip");
});

test("listingUrl points at the Chrome Web Store detail page", () => {
  assert.equal(
    listingUrl("mhnhmpcmbgdohenoknpfionidnilgijc"),
    "https://chromewebstore.google.com/detail/mhnhmpcmbgdohenoknpfionidnilgijc"
  );
});
