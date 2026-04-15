// ─── DEVTOOLS ENTRY POINT ────────────────────────────────────────────────────
// Creates the DevTools panel and initializes network capture.

import { setPanelWindow, getPanelWindow, type PanelWindow } from './panel-bridge';
import { initNetworkCapture } from './network-capture';
import {
  sendDataLayerPushToPanel,
  sendDataLayerSourcesToPanel,
  flushDataLayerBuffer,
} from './data-layer-relay';

// ─── DEVTOOLS STATUS TRACKING ────────────────────────────────────────────────
// Connect a named port to background so it can track whether DevTools are open.
// The port disconnects automatically when DevTools is closed, which triggers
// cleanup in the background — more reliable than window.unload + async storage.

const tabId = chrome.devtools.inspectedWindow.tabId;

// ─── PORT WITH AUTO-RECONNECT (EXPONENTIAL BACKOFF) ───────────────────────
// The background service worker can be killed when idle, which drops the port
// and empties its devToolsPorts Map. Reconnect automatically so background
// always has a valid port entry for this DevTools session.
// Uses exponential backoff to prevent rapid reconnection attempts.

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_BACKOFF_MS = 1000;
let _reconnectAttempts = 0;

type PortMsg = {
  type: string;
  sources?: unknown[];
  labels?: Record<string, string>;
  data?: Record<string, unknown>;
  source?: string;
  pushIndex?: number;
  timestamp?: string;
  isReplay?: boolean;
  [key: string]: unknown;
};

function attachPortListener(port: chrome.runtime.Port): void {
  port.onMessage.addListener((msg: PortMsg) => {
    if (msg.type === 'DATALAYER_PUSH') {
      sendDataLayerPushToPanel({
        source: msg.source as import('@/types/datalayer').DataLayerSource,
        pushIndex: msg.pushIndex as number,
        timestamp: msg.timestamp as string,
        data: msg.data as Record<string, unknown>,
        isReplay: msg.isReplay as boolean | undefined,
      });
    }
    if (msg.type === 'DATALAYER_SOURCES') {
      sendDataLayerSourcesToPanel(
        msg.sources as import('@/types/datalayer').DataLayerSource[],
        msg.labels as Record<string, string>
      );
    }
    // Forward pause/resume from popup → panel window
    if (msg.type === 'RECORDING_PAUSED' || msg.type === 'RECORDING_RESUMED') {
      const panelWin = getPanelWindow();
      if (panelWin && !panelWin.closed) {
        panelWin._setPaused(msg.type === 'RECORDING_PAUSED');
      }
    }
  });

  port.onDisconnect.addListener(() => {
    // SW restarted — reconnect with exponential backoff
    if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[TagDragon] Max port reconnect attempts reached');
      return;
    }
    const delay = BASE_BACKOFF_MS * Math.pow(2, _reconnectAttempts);
    _reconnectAttempts++;
    setTimeout(() => {
      try {
        const newPort = chrome.runtime.connect({ name: `devtools_${tabId}` });
        _reconnectAttempts = 0; // Reset on successful connect so future disconnects get full retry budget
        attachPortListener(newPort);
      } catch {
        // Extension context invalidated (reload/update/disable) — stop reconnecting
      }
    }, delay);
  });
}

const devToolsPort = chrome.runtime.connect({ name: `devtools_${tabId}` });
attachPortListener(devToolsPort);

// ─── PANEL CREATION ──────────────────────────────────────────────────────────

chrome.devtools.panels.create('TagDragon', '', 'public/panel.html', (panel) => {
  // When panel becomes visible, establish the bridge and flush buffered requests
  panel.onShown.addListener((win: Window) => {
    const panelWin = win as PanelWindow;
    setPanelWindow(panelWin);
    // Wire pause sync: popup → background → network-capture → panel UI
    panelWin._setPaused = (paused: boolean) => {
      // Call setPanelPaused on panel if it exists (defined by panel/index.ts)
      if (typeof panelWin.setPanelPaused === 'function') {
        panelWin.setPanelPaused(paused);
      }
    };
    // Expose re-inject helper so panel.js can trigger injection on demand
    panelWin.triggerReinject = () => {
      chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId }).catch(() => {});
    };
    // Flush any DataLayer pushes that arrived before the panel was visible
    flushDataLayerBuffer();
    // Flush panel-side pending requests that didn't render while panel was hidden
    if (typeof panelWin.flushPendingRequests === 'function') {
      panelWin.flushPendingRequests();
    }
    if (typeof panelWin.flushPendingDlPushes === 'function') {
      panelWin.flushPendingDlPushes();
    }
    // Inject DataLayer content scripts into inspected tab (idempotent).
    // Bridge is injected and awaited BEFORE main, so bridge's message listener
    // is ready when main runs and sends TAGDRAGON_DL_PUSH via postMessage.
    // The TAGDRAGON_BRIDGE_READY mechanism inside the scripts handles replay
    // of existing data — no separate DATALAYER_SNAPSHOT_REQUEST needed.
    chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId }).catch(() => {
      /* ignore */
    });
  });

  // Re-inject on navigation — panel.onShown does not fire on page navigation,
  // so without this listener the MAIN world script would never run on the new page.
  chrome.devtools.network.onNavigated.addListener(() => {
    const win = getPanelWindow();
    if (win && !win.closed && typeof win.clearDataLayer === 'function') {
      win.clearDataLayer();
    }
    chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId }).catch(() => {});
  });

  // When panel is hidden, we keep the panel window reference for buffering
});

// Start listening for network requests
initNetworkCapture();
