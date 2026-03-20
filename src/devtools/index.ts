// ─── DEVTOOLS ENTRY POINT ────────────────────────────────────────────────────
// Creates the DevTools panel and initializes network capture.

import { setPanelWindow } from './panel-bridge';
import { initNetworkCapture } from './network-capture';

// ─── DEVTOOLS STATUS TRACKING ────────────────────────────────────────────────
// Connect a named port to background so it can track whether DevTools are open.
// The port disconnects automatically when DevTools is closed, which triggers
// cleanup in the background — more reliable than window.unload + async storage.

const tabId = chrome.devtools.inspectedWindow.tabId;
const _devToolsPort = chrome.runtime.connect({ name: `devtools_${tabId}` });
// Port is intentionally kept alive for the lifetime of the DevTools session.
void _devToolsPort;

// ─── PANEL CREATION ──────────────────────────────────────────────────────────

chrome.devtools.panels.create(
  'TagDragon',
  '',
  'public/panel.html',
  (panel) => {
    // When panel becomes visible, establish the bridge and flush buffered requests
    panel.onShown.addListener((win: Window) => {
      setPanelWindow(win);
    });

    // When panel is hidden, we keep the panel window reference for buffering
    panel.onHidden.addListener(() => {
      // Keep panel window reference for buffering during hidden state
    });
  }
);

// Start listening for network requests
initNetworkCapture();
