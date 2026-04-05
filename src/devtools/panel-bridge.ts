// ─── PANEL BRIDGE ────────────────────────────────────────────────────────────
// Handles buffering and communication with the DevTools panel window.

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';

interface HeavyData {
  responseBody: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

interface PanelWindow extends Window {
  receiveRequest: (data: ParsedRequest) => void;
  receiveDataLayerPush: (data: DataLayerPush) => void;
  receiveDataLayerSources: (
    sources: DataLayerSource[],
    labels: Record<DataLayerSource, string>
  ) => void;
  triggerReinject?: () => void;
  _getHeavyData?: (requestId: number) => HeavyData | null;
  _clearHeavyData?: () => void;
  _deleteHeavyData?: (ids: number[]) => void;
  _setPaused?: (paused: boolean) => void;
}

let panelWindow: PanelWindow | null = null;
let buffer: ParsedRequest[] = [];

/**
 * Map from request ID to heavy data (response body, headers).
 * These are stored separately because they can be large.
 */
export const heavyDataStore = new Map<number, HeavyData>();

/**
 * Send data to the panel window. Buffers if panel is not yet open.
 */
const MAX_BUFFER = 500;

export function sendToPanel(data: ParsedRequest): void {
  if (panelWindow && !panelWindow.closed && panelWindow.receiveRequest) {
    try {
      panelWindow.receiveRequest(data);
      return;
    } catch {
      // Error calling receiveRequest, fall through to buffer
    }
  }
  buffer.push(data);
  if (buffer.length > MAX_BUFFER) {
    buffer = buffer.slice(-MAX_BUFFER);
  }
}

/**
 * Retrieve heavy data (response body, headers) for a request.
 * Called by panel when user opens a tab that needs this data.
 */
export function getHeavyData(requestId: number): HeavyData | null {
  return heavyDataStore.get(requestId) ?? null;
}

/**
 * Clear all stored heavy data.
 */
export function clearHeavyData(): void {
  heavyDataStore.clear();
}

/**
 * Set the panel window reference and flush buffered requests.
 * Called when the DevTools panel becomes visible.
 */
export function setPanelWindow(win: PanelWindow): void {
  panelWindow = win;

  // Attach heavy data retrieval functions to panel window
  win._getHeavyData = getHeavyData;
  win._clearHeavyData = clearHeavyData;
  win._deleteHeavyData = (ids: number[]) => {
    ids.forEach(id => heavyDataStore.delete(id));
  };

  // Flush all buffered requests
  buffer.forEach((data) => {
    try {
      if (win.receiveRequest) {
        win.receiveRequest(data);
      }
    } catch {
      // Ignore errors during flush
    }
  });
  buffer = [];
}

/**
 * Get current panel window reference.
 */
export function getPanelWindow(): PanelWindow | null {
  return panelWindow;
}
