# GrabURL

Local Safari Web Extension prototype that copies the active tab URL exactly to the clipboard.

## Behavior

- Click the extension toolbar icon to copy the active tab URL.
- Press `Command+Shift+C` to copy the active tab URL.
- Shows a popup with "Copied URL" confirmation that closes automatically.

For example, if the active tab is `https://google.com`, the clipboard receives exactly:

```text
https://google.com
```

## Run Locally

Install the pinned local tools with mise:

```bash
mise install
```

Build the signed generated macOS wrapper:

```bash
pnpm dev:mac
```

`pnpm dev:mac` builds the signed app using `DEVELOPMENT_TEAM` from `.env` or the shell environment and opens it. Start by copying the example file:

```bash
cp .env.example .env
```

Then put your team ID into `.env` and run:

```bash
pnpm dev:mac
```

To open the app again without rebuilding:

```bash
pnpm open:mac
```

Then enable it in Safari:

1. Open Safari.
2. Go to Settings > Extensions.
3. Enable Copy URL.
4. Pin or show the extension button in the toolbar if Safari hides it.

## Tests

```bash
pnpm test
```

## Architecture

The extension is a standard [Manifest V3](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/manifest_version) web extension:

- **`popup.html` / `popup.css` / `popup.js`** — the action popup shown when the toolbar icon is clicked. Runs `url-copy.js` to read the active tab URL and write it to the clipboard, displays "Copied URL", then closes after 1.2 seconds.
- **`url-copy.js`** — pure utility module (`window.CopyUrlExtension`). Tries the Clipboard API first; falls back to `document.execCommand('copy')` if unavailable. No extension-specific dependencies; covered by unit tests.
- **`manifest.json`** — declares `activeTab` and `clipboardWrite` permissions. No background service worker. Keyboard shortcut: `Command+Shift+C` (macOS) / `Ctrl+Shift+C`.

The `GrabURL/` Xcode project wraps the `web-extension/` files for Safari distribution. `GrabURL/GrabURL Extension/Resources/` holds identical copies that must stay in sync with `web-extension/`.

## Source Layout

- `web-extension/`: source WebExtension files (popup, manifest, icons).
- `tests/`: Node tests for active-tab URL resolution and exact clipboard behavior.
- `GrabURL/`: generated Safari macOS wrapper project (Xcode build).
- `web/`: Astro landing page (deployed separately).
- `scripts/`: build automation (macOS signing, icon rendering, web deploy).
- `docs/`: design specs and project documentation.

## Contributing

1. Edit extension source in `web-extension/` — mirror changes identically to `GrabURL/GrabURL Extension/Resources/`.
2. Run `pnpm test` before submitting changes.

## License

[MIT](./LICENSE)
