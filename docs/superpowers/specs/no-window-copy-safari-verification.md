# Safari API verification — "no-window copy" redesign

**Status:** research / pre-implementation (verification pass)
**Date:** 2026-06-17
**Question being de-risked:** Extension improvement #1 — replace the popup
round-trip with a background handler that copies the URL and confirms with a
toolbar badge instead of a window. Before designing around any API, confirm it
actually exists on Safari (not just Chrome).

---

## TL;DR

The redesign is **solid on Chrome but partly Chrome-only**. Three of the
feedback/escalation ideas from the design chat do **not** exist on Safari, and
the core "copy from the background with no window" step is the one thing docs
can't settle — it hinges on a Safari runtime behaviour we must test on-device
(use `tools/api-probe/`).

| Capability the design wanted | Chrome | Safari | Verdict |
|---|---|---|---|
| Copy from background **service worker** via `offscreen` | ✅ 109+ | ❌ no `offscreen` API | Chrome path only |
| Copy from background **page** via `execCommand` | n/a (SW) | ❓ DOM exists, but focus/gesture unknown | **must test on-device** |
| Badge **text** flash (`setBadgeText('✓')`) | ✅ | ✅ 15.4+ | works both |
| Badge **colour** (`setBadgeBackgroundColor`) | ✅ | ⚠️ "exists, but has no effect" | Safari ignores colour |
| Pin detection (`getUserSettings().isOnToolbar`) | ✅ | ❌ `version_added: false` | **Chrome only** |
| Notification fallback (`notifications`) | ✅ | ❌ `version_added: false` | **Chrome only** |
| Named keyboard command (`commands.onCommand`) | ✅ | ✅ 14+ | works both |

Net: on Safari we can do the no-window copy *if* the background-page clipboard
write works, and confirm it with a **plain badge ✓** — but we cannot detect
whether the icon is pinned, and we cannot fall back to a system notification.
That directly undercuts the "detect pin state → escalate feedback" plan from the
chat **on Safari specifically**.

---

## Findings, with sources

All Safari version numbers are from MDN's machine-readable
[browser-compat-data](https://github.com/mdn/browser-compat-data) (`main`), which
is the authoritative cross-browser source.

### 1. `offscreen` is Chrome-only
The offscreen-document API (the standard MV3 way to reach a DOM/clipboard from a
service worker) is **Chrome 109+** and not part of the cross-browser
WebExtensions surface — there is no `offscreen.json` in browser-compat-data, and
Chrome's own docs list availability as "Chrome 109+ MV3+" with no other engine.
→ On Safari we cannot use offscreen; we need a different clipboard path.

### 2. Safari's background is a *page*, not (by default) a service worker
Safari 15.4 added `background.service_worker`, but when both `scripts` and
`service_worker` are declared, **Safari uses `background.scripts`** (a
non-persistent background *page* with a DOM) unless
`preferred_environment: "service_worker"` is set. A background page *has* a DOM,
so `execCommand` (and possibly `navigator.clipboard`) are reachable there —
unlike Chrome's service worker. This is why the clipboard strategy must branch
per browser.

### 3. …but background clipboard access is the open question
Clipboard writes generally require a **focused document** and **transient user
activation**. A background page is never a focused window, and the existing
popup code already has to work around exactly this (`popup.js` →
`waitForDocumentFocus`, because `navigator.clipboard.writeText` rejects with
"Document is not focused"). `execCommand('copy')` historically did *not* enforce
the focus check and worked from MV2 background pages with the `clipboardWrite`
permission — but whether current Safari still allows it from a background page,
triggered by `onClicked`/`onCommand`, is **not documented**. The probe answers
this empirically.

### 4. Badge text works on Safari 15.4+; colour does not
`action.setBadgeText` → Safari **15.4**. `action.setBadgeBackgroundColor` →
Safari **15.4** but flagged *"API exists, but has no effect."*
`action.setBadgeTextColor` → **unsupported**. So a `✓` badge is visible on
Safari, but we cannot make it green — it renders with Safari's default badge
style. `action.setIcon` → Safari **15.4** (an icon-swap flash is available as an
alternative).

### 5. Pin detection is unsupported on Safari
`action.getUserSettings` → Safari **`version_added: false`**. The "if the icon
isn't pinned, escalate the feedback" idea relies on `isOnToolbar`, which simply
isn't there on Safari. (Chrome 91+ only.)

### 6. System notifications are unsupported on Safari
`notifications` and `notifications.create` → Safari **`version_added: false`**.
The "fall back to a system notification when the icon is hidden" idea is
Chrome-only too.

### 7. Keyboard commands work on Safari — but not `_execute_action`
`commands` and `commands.onCommand` → Safari **14+**. Important caveat
(cross-browser): `onCommand` does **not** fire for the reserved
`_execute_action` shortcut. The current `manifest.json` uses `_execute_action`,
so to run our own logic on the keyboard path we must switch to a **named
command** (e.g. `copy-url`) and handle `onCommand`. (Also: Safari can't change
shortcuts programmatically; users can rebind them in Settings from Safari 26.)

---

## What this means for the design

- **Keyboard path (both browsers):** viable. Switch `_execute_action` → a named
  command + `onCommand`. This is the path that benefits most (it deletes the
  Windows focus race entirely) and works on Safari 14+ / Chrome.
- **Click path:** on Chrome we can drop the popup and use `onClicked` +
  offscreen. On Safari, dropping the popup only works **if** the background-page
  clipboard write succeeds (probe result pending).
- **Feedback:** the realistic cross-browser confirmation is a **badge `✓` flash**
  (text only; no colour on Safari). The clever "detect pin → escalate to a
  notification/toast" scheme is **Chrome-only** and must not be the primary
  design — on Safari there is no pin detection and no notifications.
- **Likely shape:** a **hybrid** is the safe landing spot —
  - keep `default_popup` so a *click* always has a guaranteed visual (works even
    from Chrome's overflow menu and on Safari regardless of pin state);
  - add a named-command `onCommand` handler for the *keyboard* path that copies
    in the background and flashes the badge;
  - only adopt the fully window-less *click* path on a browser once the probe
    confirms its background can copy.

Decision gate: **run `tools/api-probe/` on Safari.** If "winning copy method" is
`background-page execCommand`, we can go window-less on Safari too; if it's
`NONE`, Safari keeps the popup for clicks and we accept badge-only confirmation
on the keyboard path.

---

## Sources

- MDN browser-compat-data (`webextensions/api/action.json`, `commands.json`,
  `notifications.json`) — Safari `version_added` values.
- [action.getUserSettings — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/getUserSettings)
- [chrome.offscreen — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Offscreen Documents in Manifest V3 — Chrome](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3)
- [Interact with the clipboard — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)
- [background — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background) (Safari `scripts` vs `service_worker` selection)
- [commands — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands) (`_execute_action` does not fire `onCommand`)
- [Assessing your Safari web extension's browser compatibility — Apple](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)
