// ─── DATA LAYER BRIDGE (ISOLATED WORLD) ──────────────────────────────────────
// Runs in ISOLATED world (content script context). Listens for postMessage
// events from MAIN world and relays them to the background service worker.
// Also injects the MAIN world script dynamically.

(function () {
  // NOTE: data-layer-main.js is no longer injected via a <script> tag here.
  // The background injects it with chrome.scripting.executeScript({ world: 'MAIN' })
  // which bypasses page CSP. The bridge's sole job is to relay messages.

  // ─── GUARD: prevent double execution ─────────────────────────────────────
  // Bridge is injected both by content_scripts (manifest) AND by INJECT_DATALAYER
  // via chrome.scripting.executeScript. Without this guard, each panel open
  // accumulates duplicate message listeners, causing duplicate pushes.
  const winRef = window as unknown as Record<string, unknown>;
  if (winRef['__tagdragon_bridge__']) return;
  winRef['__tagdragon_bridge__'] = true;

  // ─── RELAY PUSHES AND SOURCES TO BACKGROUND ──────────────────────────────
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === 'TAGDRAGON_DL_PUSH') {
      const { source, pushIndex, timestamp, data, isReplay } = event.data;
      chrome.runtime
        .sendMessage({
          type: 'DATALAYER_PUSH',
          source,
          pushIndex,
          timestamp,
          data,
          isReplay: isReplay === true,
        })
        .catch(() => {});
      return;
    }

    if (event.data.type === 'TAGDRAGON_DL_SOURCES') {
      chrome.runtime
        .sendMessage({
          type: 'DATALAYER_SOURCES',
          sources: event.data.sources,
          labels: event.data.labels,
        })
        .catch(() => {});
      return;
    }
  });

  // ─── SNAPSHOT / REPLAY REQUEST HANDLER ───────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'DATALAYER_SNAPSHOT_REQUEST') {
      window.postMessage({ type: 'TAGDRAGON_DL_REPLAY_REQUEST' }, window.location.origin);
      sendResponse({ ok: true });
    }
  });

  // ─── ANNOUNCE BRIDGE READY TO MAIN WORLD ─────────────────────────────────
  window.postMessage({ type: 'TAGDRAGON_BRIDGE_READY' }, window.location.origin);
})();
