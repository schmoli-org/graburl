# Chrome Web Store submission checklist

The store package is produced by `pnpm build:chrome` → `dist/graburl-chrome-v<version>.zip`. It is derived from `web-extension/` with a Chrome-patched manifest (generic description, `Alt+Shift+C` shortcut). Safari is unaffected.

## Assets

- [x] 128×128 listing icon — reuse `web-extension/icons/icon-128.png` (uploaded separately in the dashboard)
- [x] Screenshot, 1280×800, 24-bit RGB — `docs/store-assets/chrome-screenshot-1280x800.png` (popup showing "Copied URL" over the landing page)

## Privacy disclosure (dashboard form)

GrabURL collects no user data, makes no network requests, and transmits nothing. In the Privacy practices tab:

- Declare that the extension does **not** collect user data.
- Permission justifications:
  - `activeTab` — reads the URL of the current tab only when the user clicks the toolbar icon or presses the keyboard shortcut.
  - `clipboardWrite` — writes that URL to the local clipboard.
- Single purpose description: copies the active tab's URL to the clipboard.

## Listing fields

| Field | Value |
|---|---|
| Name | GrabURL |
| Short description | Copy the active tab URL to the clipboard. |
| Category | Productivity |
| Homepage URL | https://graburl.schmoli.com |

## Keyboard shortcut note

The package suggests `Alt+Shift+C` (`Option+Shift+C` on Mac). Safari's `Cmd+Shift+C` cannot be the Chrome default — Chrome reserves `Cmd/Ctrl+Shift+C` for DevTools inspect-element and silently leaves conflicting suggestions unassigned. Users who want Safari parity can rebind manually at `chrome://extensions/shortcuts` (manual assignments override the conflict check). Worth mentioning in the listing description.

## Automated submission

Releases after the first manual one are a single command: `make chrome-submit` — builds the zip, uploads it, and submits for review via the [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api) (`scripts/publish-chrome.mjs`, zero dependencies). Run `make test` first; bump the version in **both** manifests and `tests/manifest.test.mjs` before submitting — the API rejects an upload whose version isn't higher than the published one.

- Credentials in `.env` (same pattern as `DEVELOPMENT_TEAM`): `EXTENSION_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`
- Constraints (mirrors the fastlane/ASC gaps): the API cannot create the first listing or edit listing/privacy/distribution forms — those stay in the dashboard; API "publish" = submit for review, no bypass
- Extension ID (from the first manual submission, 2026-06-11): `mhnhmpcmbgdohenoknpfionidnilgijc`
  - Store listing URL once live: https://chromewebstore.google.com/detail/mhnhmpcmbgdohenoknpfionidnilgijc

### One-time OAuth setup

1. [console.cloud.google.com](https://console.cloud.google.com) → create (or reuse) a project → APIs & Services → enable **Chrome Web Store API**.
2. OAuth consent screen → External → add yourself as a test user, then **publish the app to "In production"** — refresh tokens minted while the consent screen is in "Testing" status expire after 7 days.
3. Credentials → Create credentials → OAuth client ID → **Desktop app** → copy the client ID and secret into `.env` as `CLIENT_ID` / `CLIENT_SECRET`.
4. Open in a browser (one line, substitute your client ID):

   ```
   https://accounts.google.com/o/oauth2/auth?client_id=<CLIENT_ID>&redirect_uri=http://localhost:8818&response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&access_type=offline&prompt=consent
   ```

   Approve the consent screen. The redirect to `localhost:8818` fails to load — that's expected; copy the `code=` value out of the address bar.
5. Exchange the code for a refresh token (the code expires in minutes):

   ```sh
   curl -s -X POST https://oauth2.googleapis.com/token \
     -d client_id=<CLIENT_ID> \
     -d client_secret=<CLIENT_SECRET> \
     -d code=<code from step 4> \
     -d redirect_uri=http://localhost:8818 \
     -d grant_type=authorization_code
   ```

   Paste the `refresh_token` from the response into `.env` as `REFRESH_TOKEN`.

## Submission steps

Steps 6–8 applied to the first listing only; subsequent releases replace them with `make chrome-submit`.

1. `pnpm test` — suite green, including `tests/chrome-manifest.test.mjs`
2. `pnpm build:chrome`
3. `unzip -l dist/graburl-chrome-v*.zip` — confirm `manifest.json` is at the zip **root**
4. Manual smoke test: `chrome://extensions` → enable Developer mode → Load unpacked → select `dist/chrome/` → click the toolbar icon on any page → "Copied URL" appears and the URL is on the clipboard; confirm the shortcut at `chrome://extensions/shortcuts`
5. Screenshot: `docs/store-assets/chrome-screenshot-1280x800.png`
6. *(first release only)* [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — register a developer account if needed ($5 one-time)
7. *(first release only)* New item → upload the zip → fill listing, privacy, and distribution tabs
8. *(first release only)* Submit for review (typically a few days for a first listing) — afterwards, `make chrome-submit`
