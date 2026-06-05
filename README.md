# GrabURL

Local Safari Web Extension prototype that copies the active tab URL exactly to the clipboard.

## Behavior

- Click the extension toolbar icon to copy the active tab URL.
- Press `Command+Shift+C` to copy the active tab URL.
- Shows a small page toast that says `URL copied`.

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

## Source Layout

- `web-extension/`: source WebExtension files.
- `tests/`: Node tests for active-tab URL resolution and exact clipboard behavior.
- `GrabURL/`: generated Safari macOS wrapper project.
