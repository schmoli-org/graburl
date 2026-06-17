# GrabURL API Probe

A throwaway extension that exercises the WebExtension APIs the "no-window copy"
redesign depends on, so we can confirm what actually works on **real Safari** and
**real Chrome** instead of trusting docs. Nothing here ships — it lives under
`tools/` and is never built into the product.

## What it answers

1. **The big one:** can the *background* (no popup window) put text on the
   clipboard? It tries, in order: `navigator.clipboard.writeText`,
   `execCommand` in the background page (Safari), and an offscreen document
   (Chrome) — and reports which path won, plus a paste box to confirm the bytes
   actually reached the OS clipboard.
2. Does clicking the toolbar icon with **no `default_popup`** run in the
   background (`action.onClicked`)?
3. Does a **named** keyboard command fire `commands.onCommand`?
4. Which **feedback** APIs exist at runtime: `action.setBadgeText`,
   `setBadgeBackgroundColor`, `action.getUserSettings().isOnToolbar` (pin
   detection), `notifications`.

## Run in Chrome

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select `tools/api-probe/`.
3. A `probe.html` tab opens. Follow the on-page steps:
   - Click the probe's toolbar icon (or press `Ctrl/Cmd+Shift+Y`).
   - Return to the tab, read the result, paste into the box to confirm.

## Run in Safari

Safari extensions must be wrapped in an app, so convert the probe to a
throwaway Xcode project:

```sh
xcrun safari-web-extension-converter tools/api-probe \
  --project-location /tmp/grab-probe --macos-only --no-open
```

Then:

1. Open `/tmp/grab-probe/GrabURL API Probe/GrabURL API Probe.xcodeproj`, build & run.
2. Safari → Settings → Extensions → enable **GrabURL API Probe**
   (and "Always Allow on Every Website" so `activeTab` is satisfied).
   - You may need Safari → Settings → Advanced → **Show features for web developers**,
     then Develop → **Allow Unsigned Extensions**.
3. Open the probe page: Safari → Settings → Extensions → select it →
   the options page, or visit the `safari-web-extension://…/probe.html` URL it
   opens on install.
4. Run the same steps: trigger via toolbar click or `Cmd+Shift+Y`, then paste to confirm.

> The `offscreen` permission is Chrome-only; Safari ignores it with a warning.
> That's expected and harmless for the probe.

## Reading the result

- **Winning copy method = `background-page execCommand`** on Safari → the
  no-window path is viable there.
- **Winning copy method = NONE** on Safari → the background cannot reach the
  clipboard without a window, and the redesign must keep a popup (or other
  user-gesture surface) on Safari.
- `getUserSettings`/`notifications` showing **MISSING** confirms the pin-detection
  and notification fallbacks are Chrome-only (matches MDN browser-compat-data).
