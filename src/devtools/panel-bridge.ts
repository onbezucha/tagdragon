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

// ─── HEAVY DATA STORE ─────────────────────────────────────────────────────
// Map from request ID to heavy data (response body, headers).
// These are stored separately because they can be large.
// Includes automatic size tracking and eviction when over budget.

const MAX_HEAVY_DATA_SIZE = 5 * 1024 * 1024; // 5MB
let heavyDataSizeEstimate = 0;

export const heavyDataStore = new Map<number, HeavyData>();

function estimateSize(data: HeavyData): number {
  return (
    (data.responseBody?.length ?? 0) +
    Object.keys(data.requestHeaders).reduce(
      (s, k) => s + k.length + (data.requestHeaders[k]?.length ?? 0),
      0
    ) +
    Object.keys(data.responseHeaders).reduce(
      (s, k) => s + k.length + (data.responseHeaders[k]?.length ?? 0),
      0
    )
  );
}

// Wrap set to track size and auto-evict when over budget
const originalSet = heavyDataStore.set.bind(heavyDataStore);
heavyDataStore.set = function (key: number, value: HeavyData): Map<number, HeavyData> {
  const old = heavyDataStore.get(key);
  if (old) {
    heavyDataSizeEstimate -= estimateSize(old);
  }
  heavyDataSizeEstimate += estimateSize(value);

  // Evict oldest entries if over budget
  while (heavyDataSizeEstimate > MAX_HEAVY_DATA_SIZE && heavyDataStore.size > 0) {
    const firstKey = heavyDataStore.keys().next().value!;
    const removed = heavyDataStore.get(firstKey)!;
    heavyDataSizeEstimate -= estimateSize(removed);
    heavyDataStore.delete(firstKey);
  }

  return originalSet(key, value);
};

// Wrap delete to update size estimate
const originalDelete = heavyDataStore.delete.bind(heavyDataStore);
heavyDataStore.delete = function (key: number): boolean {
  const old = heavyDataStore.get(key);
  if (old) {
    heavyDataSizeEstimate -= estimateSize(old);
  }
  return originalDelete(key);
};

// Wrap clear to reset size estimate
const originalClear = heavyDataStore.clear.bind(heavyDataStore);
heavyDataStore.clear = function (): void {
  heavyDataSizeEstimate = 0;
  return originalClear();
};

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
    ids.forEach((id) => heavyDataStore.delete(id));
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
