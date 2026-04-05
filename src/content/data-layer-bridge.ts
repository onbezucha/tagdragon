// ─── DATA LAYER BRIDGE (ISOLATED WORLD) ──────────────────────────────────────
// Runs in ISOLATED world (content script context). Listens for postMessage
// events from MAIN world and relays them to the background service worker.
// Also injects the MAIN world script dynamically.

import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';

(function () {
  // NOTE: data-layer-main.js is no longer injected via a <script> tag here.
  // The background injects it with chrome.scripting.executeScript({ world: 'MAIN' })
  // which bypasses page CSP. The bridge's sole job is to relay messages.

  // ─── GUARD: prevent double execution ─────────────────────────────────────
  // Bridge is injected both by content_scripts (manifest) AND by INJECT_DATALAYER
  // via chrome.scripting.executeScript. Without this guard, each panel open
  // accumulates duplicate message listeners, causing duplicate pushes.
  const winRef = window as Record<string, unknown>;
  if (winRef['__tagdragon_bridge__']) return;
  winRef['__tagdragon_bridge__'] = true;

  // ─── RELAY PUSHES AND SOURCES TO BACKGROUND ──────────────────────────────
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!event.data) return;

    if (event.data.type === 'TAGDRAGON_DL_PUSH') {
      const { source, pushIndex, timestamp, data, isReplay } = event.data;
      // Send to background — DO NOT include tabId (background reads from sender.tab.id)
      chrome.runtime.sendMessage({
        type: 'DATALAYER_PUSH',
        source,
        pushIndex,
        timestamp,
        data,
        isReplay: isReplay === true,
      }).catch(() => {
        // Background may not be listening yet; ignore
      });
      return;
    }

    if (event.data.type === 'TAGDRAGON_DL_SOURCES') {
      // MAIN world detected sources — forward to background (ISOLATED world cannot
      // see MAIN world variables like window.digitalData, so MAIN world is authoritative)
      chrome.runtime.sendMessage({
        type: 'DATALAYER_SOURCES',
        sources: event.data.sources,
        labels: event.data.labels,
      }).catch(() => {});
      return;
    }
  });

  // ─── SOURCE DETECTION & REPORTING ────────────────────────────────────────
  // Report detected sources to background after short delay to allow main world
  // script to complete its initial detection
  setTimeout(() => {
    void chrome.runtime.sendMessage({
      type: 'DATALAYER_SOURCES',
      sources: detectSources(),
      labels: buildSourceLabels(),
    }).catch(() => { /* ignore */ });
  }, 800);

  function detectSources(): string[] {
    const sources: string[] = [];
    const win = window as Record<string, unknown>;

    if (Array.isArray(win['dataLayer'])) sources.push('gtm');
    if (win['utag'] && typeof win['utag'] === 'object') sources.push('tealium');
    if (win['_satellite'] || win['adobeDataLayer']) sources.push('adobe');
    if (win['analytics'] && typeof (win['analytics'] as Record<string, unknown>)['track'] === 'function') sources.push('segment');
    if (win['digitalData'] && typeof win['digitalData'] === 'object') sources.push('digitalData');

    return sources;
  }

  function buildSourceLabels(): Record<string, string> {
    const labels: Record<string, string> = { ...SOURCE_DESCRIPTIONS };

    // Try to extract GTM container ID
    const win = window as Record<string, unknown>;
    const dl = win['dataLayer'] as unknown[] | undefined;
    if (Array.isArray(dl)) {
      for (const item of dl) {
        if (item && typeof item === 'object') {
          const gtmId = (item as Record<string, unknown>)['gtm.uniqueEventId'];
          if (!gtmId) {
            const keys = Object.keys(item as Record<string, unknown>);
            const gtmKey = keys.find(k => k.startsWith('GTM-'));
            if (gtmKey) {
              labels['gtm'] = gtmKey;
              break;
            }
          }
        }
      }
    }

    return labels;
  }

  // ─── SNAPSHOT / REPLAY REQUEST HANDLER ───────────────────────────────────
  // When DevTools panel opens after the page already loaded, background sends
  // DATALAYER_SNAPSHOT_REQUEST. We tell the MAIN world to replay existing items
  // via postMessage (so they go through the normal push pipeline).
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'DATALAYER_SNAPSHOT_REQUEST') {
      // Ask MAIN world to replay existing dataLayer items
      window.postMessage({ type: 'TAGDRAGON_DL_REPLAY_REQUEST' }, '*');
      sendResponse({ ok: true });
    }
  });

  // ─── ANNOUNCE BRIDGE READY TO MAIN WORLD ─────────────────────────────────
  // Signal the MAIN world that a fresh, non-orphaned bridge is set up.
  // MAIN world handles this by re-detecting sources and replaying all data.
  // This eliminates the race condition where DATALAYER_SNAPSHOT_REQUEST arrives
  // at the old orphaned bridge before the new bridge is ready.
  window.postMessage({ type: 'TAGDRAGON_BRIDGE_READY' }, '*');
})();
