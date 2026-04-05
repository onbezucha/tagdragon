// ─── DEVTOOLS ENTRY POINT ────────────────────────────────────────────────────
// Creates the DevTools panel and initializes network capture.

import { setPanelWindow, getPanelWindow } from './panel-bridge';
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

// ─── PORT WITH AUTO-RECONNECT ─────────────────────────────────────────────────
// The background service worker can be killed when idle, which drops the port
// and empties its devToolsPorts Map. Reconnect automatically so background
// always has a valid port entry for this DevTools session.

type PortMsg = { type: string; sources?: unknown[]; labels?: Record<string, string>; data?: Record<string, unknown>; source?: string; pushIndex?: number; timestamp?: string; isReplay?: boolean; [key: string]: unknown };

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
        msg.labels as Record<string, string>,
      );
    }
  });

  port.onDisconnect.addListener(() => {
    // SW restarted — reconnect so background gets a fresh port entry
    const newPort = chrome.runtime.connect({ name: `devtools_${tabId}` });
    attachPortListener(newPort);
  });
}

const devToolsPort = chrome.runtime.connect({ name: `devtools_${tabId}` });
attachPortListener(devToolsPort);

// ─── PANEL CREATION ──────────────────────────────────────────────────────────

chrome.devtools.panels.create(
  'TagDragon',
  '',
  'public/panel.html',
  (panel) => {
    // When panel becomes visible, establish the bridge and flush buffered requests
    panel.onShown.addListener((win: Window) => {
      setPanelWindow(win);
      // Wire pause sync: popup → background → network-capture → panel UI
      (win as Record<string, unknown>)['_setPaused'] = (paused: boolean) => {
        const fn = (win as Record<string, unknown>)['setPanelPaused'];
        if (typeof fn === 'function') fn(paused);
      };
      // Expose re-inject helper so panel.js can trigger injection on demand
      (win as Record<string, unknown>)['triggerReinject'] = () => {
        chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId }).catch(() => {});
      };
      // Flush any DataLayer pushes that arrived before the panel was visible
      flushDataLayerBuffer();
      // Inject DataLayer content scripts into inspected tab (idempotent).
      // Bridge is injected and awaited BEFORE main, so bridge's message listener
      // is ready when main runs and sends TAGDRAGON_DL_PUSH via postMessage.
      // The TAGDRAGON_BRIDGE_READY mechanism inside the scripts handles replay
      // of existing data — no separate DATALAYER_SNAPSHOT_REQUEST needed.
      chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId }).catch(() => { /* ignore */ });
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
    panel.onHidden.addListener(() => {
      // Keep panel window reference for buffering during hidden state
    });
  }
);

// Start listening for network requests
initNetworkCapture();
