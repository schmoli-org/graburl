// GrabURL API Probe — background context.
//
// Purpose: answer the questions that documentation can't, by exercising the
// real APIs on a real browser. The crux is whether the *background* (with no
// popup window) can put text on the clipboard:
//
//   - In Chrome the background is a service worker: no DOM, so navigator.clipboard
//     and execCommand are both unavailable. The only path is an offscreen document.
//   - In Safari the background is a non-persistent *page* (background.scripts):
//     it has a DOM, so execCommand — and maybe navigator.clipboard — may work
//     directly. Whether the page counts as "focused" / user-activated is the
//     open question this probe is built to answer.
//
// Results are written to chrome.storage.local; probe.html renders them.

const api = globalThis.browser ?? globalThis.chrome;

// `document` exists only when this runs as a background PAGE (Safari), not a
// service worker (Chrome). This is how we branch the clipboard strategy.
const HAS_DOM = typeof document !== "undefined" && typeof document.createElement === "function";

/** execCommand copy using an offscreen textarea in whatever DOM we're given. */
function execCommandCopy(doc, text) {
  const textarea = doc.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0"
  });
  doc.body.appendChild(textarea);
  textarea.focus?.();
  textarea.select?.();
  try {
    return doc.execCommand("copy");
  } finally {
    textarea.remove?.();
  }
}

/** Chrome-only: spin up an offscreen document and copy from there. */
async function copyViaOffscreen(text) {
  if (!api.offscreen) throw new Error("chrome.offscreen unavailable");
  const has = await api.offscreen.hasDocument?.();
  if (!has) {
    await api.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Probe: write the active tab URL to the clipboard with no popup."
    });
  }
  const res = await api.runtime.sendMessage({ kind: "offscreen-copy", text });
  if (!res?.ok) throw new Error(res?.error || "offscreen copy failed");
}

/**
 * Try every no-window clipboard path in order and report which one (if any)
 * actually ran without throwing. The tester still has to PASTE to confirm the
 * bytes landed — a method returning true doesn't guarantee the OS clipboard
 * changed (some platforms silently no-op).
 */
async function attemptBackgroundCopy(text) {
  const attempts = [];

  // 1. navigator.clipboard.writeText (expected to fail in a background context
  //    that isn't "focused"; we want to capture the exact error).
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      attempts.push({ method: "navigator.clipboard.writeText", ok: true });
      return { winner: "navigator.clipboard.writeText", attempts };
    } catch (e) {
      attempts.push({ method: "navigator.clipboard.writeText", ok: false, error: String(e) });
    }
  } else {
    attempts.push({ method: "navigator.clipboard.writeText", ok: false, error: "not available in this context" });
  }

  // 2. execCommand in the background PAGE's own DOM (Safari path).
  if (HAS_DOM && typeof document.execCommand === "function") {
    try {
      const ok = execCommandCopy(document, text);
      attempts.push({ method: "background-page execCommand", ok });
      if (ok) return { winner: "background-page execCommand", attempts };
    } catch (e) {
      attempts.push({ method: "background-page execCommand", ok: false, error: String(e) });
    }
  } else {
    attempts.push({ method: "background-page execCommand", ok: false, error: "no DOM in this context (service worker)" });
  }

  // 3. Offscreen document execCommand (Chrome path).
  try {
    await copyViaOffscreen(text);
    attempts.push({ method: "offscreen execCommand", ok: true });
    return { winner: "offscreen execCommand", attempts };
  } catch (e) {
    attempts.push({ method: "offscreen execCommand", ok: false, error: String(e) });
  }

  return { winner: null, attempts };
}

/** Probe the visual-feedback APIs alongside the copy. */
async function probeFeedback() {
  const feedback = {};

  // Badge text — BCD says Safari 15.4+ supports text but ignores color.
  try {
    await api.action.setBadgeText({ text: "✓" }); // ✓
    feedback.setBadgeText = "called ok (look at the toolbar icon)";
    setTimeout(() => api.action.setBadgeText({ text: "" }), 1500);
  } catch (e) {
    feedback.setBadgeText = "threw: " + String(e);
  }
  try {
    await api.action.setBadgeBackgroundColor?.({ color: "#34c749" });
    feedback.setBadgeBackgroundColor = "called ok (Safari is expected to ignore the color)";
  } catch (e) {
    feedback.setBadgeBackgroundColor = "threw: " + String(e);
  }

  // Pin detection — BCD says Safari does NOT support this.
  try {
    if (api.action.getUserSettings) {
      const s = await api.action.getUserSettings();
      feedback.getUserSettings = "isOnToolbar = " + JSON.stringify(s?.isOnToolbar);
    } else {
      feedback.getUserSettings = "api.action.getUserSettings is undefined (unsupported)";
    }
  } catch (e) {
    feedback.getUserSettings = "threw: " + String(e);
  }

  return feedback;
}

async function runProbe(trigger) {
  const sentinel = `GRABURL-PROBE ${trigger} ${new Date().toISOString()}`;
  const copy = await attemptBackgroundCopy(sentinel);
  const feedback = await probeFeedback();
  const record = {
    at: new Date().toISOString(),
    trigger,
    backgroundContext: HAS_DOM ? "background page (has DOM — Safari-like)" : "service worker (no DOM — Chrome-like)",
    sentinel,
    copyWinner: copy.winner,
    copyAttempts: copy.attempts,
    feedback
  };
  await api.storage.local.set({ lastProbe: record });
  console.log("[GrabURL probe]", record);
}

// Trigger 1: clicking the toolbar icon. No default_popup is set, so this fires
// onClicked instead of opening a window — exactly the no-window click path.
api.action.onClicked.addListener(() => runProbe("toolbar-click"));

// Trigger 2: the keyboard shortcut, via a NAMED command (not _execute_action,
// which would not fire onCommand).
api.commands?.onCommand.addListener((name) => {
  if (name === "probe-copy") runProbe("keyboard-command");
});

// Surface a one-time hint page so the tester knows what to do.
api.runtime.onInstalled.addListener(() => {
  api.tabs?.create({ url: api.runtime.getURL("probe.html") });
});
