# GrabURL

Safari Web Extension that copies the active tab URL to the clipboard. Single-button UX: click the toolbar icon (or press `Command+Shift+C`) → URL is copied → popup shows "Copied URL" and closes automatically.

## Repo structure

| Path | Purpose |
|---|---|
| `web-extension/` | **Canonical** extension source — edit here |
| `GrabURL/GrabURL Extension/Resources/` | Xcode copy of web-extension files — must stay in sync |
| `GrabURL/GrabURL/Resources/` | macOS companion app UI (enable/disable extension) |
| `web/` | Astro landing page, independent of the extension |
| `tests/` | Node.js test suite |
| `scripts/` | Build automation |
| `docs/superpowers/specs/` | Design specs for planned changes |

## Critical conventions

1. **Always update both `web-extension/` AND `GrabURL/GrabURL Extension/Resources/`** when changing any extension file. The Xcode build uses the `GrabURL Extension` copy. They are plain file copies, not symlinks.
2. `url-copy.js` is a plain IIFE — no ES modules, no import/export. It exports via `globalThis.CopyUrlExtension`.

## Common commands

```bash
# Run tests
pnpm test

# Build and open the macOS Safari wrapper (requires DEVELOPMENT_TEAM in .env)
cp .env.example .env   # first time only
pnpm dev:mac

# Open without rebuilding
pnpm open:mac

# Develop the landing page
cd web && pnpm dev
```

## Key files

| File | Role |
|---|---|
| `web-extension/url-copy.js` | Core clipboard utility — fully unit tested |
| `web-extension/popup.js` | Popup entry point — orchestrates copy and closes window |
| `web-extension/popup.css` | Popup styles |
| `web-extension/manifest.json` | MV3 manifest, permissions, keyboard shortcut |
| `web/src/layouts/Layout.astro` | Global CSS variables and font for the landing page |
| `web/src/pages/index.astro` | Landing page content and component styles |
