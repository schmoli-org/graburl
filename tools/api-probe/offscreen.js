// Chrome offscreen document: does the actual execCommand copy on behalf of the
// service-worker background, then reports back via the message channel.
const api = globalThis.browser ?? globalThis.chrome;

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind !== "offscreen-copy") return;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = msg.text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    sendResponse({ ok });
  } catch (e) {
    sendResponse({ ok: false, error: String(e) });
  }
  return true; // keep the channel open for the async response
});
