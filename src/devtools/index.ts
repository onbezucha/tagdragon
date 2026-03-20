// ─── DEVTOOLS ENTRY POINT ────────────────────────────────────────────────────
// Creates the DevTools panel and initializes network capture.

import { setPanelWindow } from './panel-bridge';
import { initNetworkCapture } from './network-capture';

// Create the DevTools panel
chrome.devtools.panels.create(
  'Request Tracker',
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
