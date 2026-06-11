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

## Planned: automated upload (fastlane-style)

After the first manual submission mints an extension ID, add `chrome-webstore-upload-cli` so releases become `pnpm build:chrome && pnpm publish:chrome` (upload + submit for review via the [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)).

- Credentials in `.env` (same pattern as `DEVELOPMENT_TEAM`): `EXTENSION_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`
- One-time OAuth setup: Google Cloud project → enable Chrome Web Store API → Desktop OAuth client → one-time consent flow for a refresh token
- Constraints (mirrors the fastlane/ASC gaps): the API cannot create the first listing or edit listing/privacy/distribution forms — those stay in the dashboard; API "publish" = submit for review, no bypass
- Record the extension ID here once it exists: `EXTENSION_ID: <pending first submission>`

## Submission steps

1. `pnpm test` — suite green, including `tests/chrome-manifest.test.mjs`
2. `pnpm build:chrome`
3. `unzip -l dist/graburl-chrome-v*.zip` — confirm `manifest.json` is at the zip **root**
4. Manual smoke test: `chrome://extensions` → enable Developer mode → Load unpacked → select `dist/chrome/` → click the toolbar icon on any page → "Copied URL" appears and the URL is on the clipboard; confirm the shortcut at `chrome://extensions/shortcuts`
5. Screenshot: `docs/store-assets/chrome-screenshot-1280x800.png`
6. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — register a developer account if needed ($5 one-time)
7. New item → upload the zip → fill listing, privacy, and distribution tabs
8. Submit for review (typically a few days for a first listing)
