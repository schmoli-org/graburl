// GrabURL API Probe — page UI. Renders static feature detection and the latest
// background run recorded in chrome.storage.local.
const api = globalThis.browser ?? globalThis.chrome;

function row(tbody, label, value, cls) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.textContent = label;
  const td = document.createElement("td");
  if (cls) {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = value;
    td.appendChild(span);
  } else {
    td.textContent = value;
  }
  tr.append(th, td);
  tbody.appendChild(tr);
}

function present(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

// ── 1. Static feature detection ────────────────────────────────────────────
(function detect() {
  const tbody = document.querySelector("#detect tbody");
  document.getElementById("ua-pill").textContent = navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome")
    ? "Safari" : (navigator.userAgent.includes("Chrome") ? "Chromium" : "other");

  const checks = [
    ["chrome.action", () => !!present(api, "action")],
    ["action.getUserSettings (pin detection)", () => typeof present(api, "action.getUserSettings") === "function"],
    ["action.setBadgeText", () => typeof present(api, "action.setBadgeText") === "function"],
    ["action.setBadgeBackgroundColor", () => typeof present(api, "action.setBadgeBackgroundColor") === "function"],
    ["action.setIcon", () => typeof present(api, "action.setIcon") === "function"],
    ["commands.onCommand", () => !!present(api, "commands.onCommand")],
    ["offscreen API", () => !!present(api, "offscreen")],
    ["notifications API", () => !!present(api, "notifications")],
    ["navigator.clipboard (in this page)", () => !!present(navigator, "clipboard.writeText")]
  ];
  for (const [label, fn] of checks) {
    let ok = false;
    try { ok = fn(); } catch { ok = false; }
    row(tbody, label, ok ? "present" : "MISSING", ok ? "ok" : "no");
  }
})();

// ── 2 & 3. Latest background run ───────────────────────────────────────────
function renderLast(record) {
  const copyBody = document.querySelector("#copy-result tbody");
  const fbBody = document.querySelector("#feedback tbody");
  copyBody.innerHTML = "";
  fbBody.innerHTML = "";

  if (!record) {
    row(copyBody, "Status", "No background run yet — do step 2.", "meh");
    return;
  }

  row(copyBody, "Triggered by", record.trigger);
  row(copyBody, "Background context", record.backgroundContext);
  row(
    copyBody,
    "Winning copy method",
    record.copyWinner || "NONE — no path worked",
    record.copyWinner ? "ok" : "no"
  );
  for (const a of record.copyAttempts) {
    row(copyBody, "  ↳ " + a.method, a.ok ? "ok" : "failed: " + (a.error || ""), a.ok ? "ok" : "no");
  }
  row(copyBody, "Sentinel (paste should match)", record.sentinel);

  // remember the sentinel so the paste box can verify it
  window.__expectedSentinel = record.sentinel;

  for (const [k, v] of Object.entries(record.feedback || {})) {
    const good = /ok|isOnToolbar = true|isOnToolbar = false/.test(v) && !/threw|undefined/.test(v);
    const missing = /undefined|threw/.test(v);
    row(fbBody, k, v, good ? "ok" : (missing ? "no" : "meh"));
  }
}

async function refresh() {
  const { lastProbe } = await api.storage.local.get("lastProbe");
  renderLast(lastProbe);
}
document.getElementById("refresh").addEventListener("click", refresh);
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lastProbe) renderLast(changes.lastProbe.newValue);
});
refresh();

// ── Paste confirmation ─────────────────────────────────────────────────────
document.getElementById("paste").addEventListener("paste", (e) => {
  const text = (e.clipboardData || window.clipboardData).getData("text");
  const verdict = document.getElementById("paste-verdict");
  if (window.__expectedSentinel && text.trim() === window.__expectedSentinel.trim()) {
    verdict.textContent = "✅ Clipboard contains the sentinel — the no-window copy genuinely worked end to end.";
    verdict.className = "ok";
  } else {
    verdict.textContent = "❌ Pasted text does NOT match the sentinel. Clipboard holds: " + JSON.stringify(text.slice(0, 120));
    verdict.className = "no";
  }
});
