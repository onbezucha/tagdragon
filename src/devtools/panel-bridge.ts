// ═══════════════════════════════════════════════════════════════════════════
// PANEL BRIDGE
// Handles buffering and communication with the DevTools panel window.
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest, PageNavigation } from '@/types/request';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';
import { MAX_BUFFER } from '@/shared/constants';

interface HeavyData {
  responseBody: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIZE TRACKING MAP
// A Map wrapper that tracks estimated memory usage and auto-evicts oldest
// entries when exceeding the configured max size budget.
// ═══════════════════════════════════════════════════════════════════════════

export class SizeTrackingMap<K, V> {
  private _map: Map<K, V>;
  private _estimateSize: (value: V) => number;
  private _maxSize: number;
  private _sizeEstimate: number = 0;

  /**
   * @param estimateSize Function to calculate the byte size of a value
   * @param maxSize Maximum byte size budget before auto-eviction
   */
  constructor(estimateSize: (value: V) => number, maxSize: number) {
    this._map = new Map<K, V>();
    this._estimateSize = estimateSize;
    this._maxSize = maxSize;
  }

  /**
   * Get the current estimated total size in bytes.
   */
  get sizeEstimate(): number {
    return this._sizeEstimate;
  }

  /**
   * Get the number of entries in the map.
   */
  get size(): number {
    return this._map.size;
  }

  /**
   * Get a value by key.
   */
  get(key: K): V | undefined {
    return this._map.get(key);
  }

  /**
   * Check if a key exists.
   */
  has(key: K): boolean {
    return this._map.has(key);
  }

  /**
   * Set a key-value pair. Tracks size and auto-evicts oldest entries if over budget.
   */
  set(key: K, value: V): this {
    // Subtract size of existing value if updating
    const old = this._map.get(key);
    if (old !== undefined) {
      this._sizeEstimate -= this._estimateSize(old);
    }

    // Add size of new value
    this._sizeEstimate += this._estimateSize(value);

    // Evict oldest entries if over budget
    while (this._sizeEstimate > this._maxSize && this._map.size > 0) {
      const firstKey = this._map.keys().next().value!;
      const removed = this._map.get(firstKey)!;
      this._sizeEstimate -= this._estimateSize(removed);
      this._map.delete(firstKey);
    }

    this._map.set(key, value);
    return this;
  }

  /**
   * Delete a key-value pair.
   */
  delete(key: K): boolean {
    const old = this._map.get(key);
    if (old !== undefined) {
      this._sizeEstimate -= this._estimateSize(old);
    }
    return this._map.delete(key);
  }

  /**
   * Clear all entries and reset size estimate.
   */
  clear(): void {
    this._map.clear();
    this._sizeEstimate = 0;
  }

  /**
   * Iterate over keys.
   */
  keys(): IterableIterator<K> {
    return this._map.keys();
  }

  /**
   * Iterate over values.
   */
  values(): IterableIterator<V> {
    return this._map.values();
  }

  /**
   * Iterate over entries.
   */
  entries(): IterableIterator<[K, V]> {
    return this._map.entries();
  }

  /**
   * Iterate over entries with callback.
   */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void {
    this._map.forEach((value, key) => callbackfn(value, key, this._map));
  }

  /**
   * Returns an iterable of entries.
   */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }
}

export interface PanelWindow extends Window {
  receiveRequest: (data: ParsedRequest) => void;
  receiveDataLayerPush: (data: DataLayerPush) => void;
  receiveDataLayerSources: (
    sources: DataLayerSource[],
    labels: Record<DataLayerSource, string>
  ) => void;
  triggerReinject: () => void;
  clearDataLayer: () => void;
  _getHeavyData: (requestId: number) => HeavyData | null;
  _clearHeavyData: () => void;
  _deleteHeavyData: (ids: number[]) => void;
  _setPaused: (paused: boolean) => void;
  setPanelPaused: (paused: boolean) => void;
  flushPendingRequests: () => void;
  flushPendingDlPushes: () => void;
  insertDlNavMarker: (url: string) => void;
  receivePageNavigation: (nav: PageNavigation) => void;
}

let panelWindow: PanelWindow | null = null;
let buffer: ParsedRequest[] = [];
let navBuffer: PageNavigation[] = [];

// ─── HEAVY DATA STORE ─────────────────────────────────────────────────────
// Map from request ID to heavy data (response body, headers).
// These are stored separately because they can be large.
// Includes automatic size tracking and eviction when over budget.

const MAX_HEAVY_DATA_SIZE = 5 * 1024 * 1024; // 5MB

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

export const heavyDataStore = new SizeTrackingMap<number, HeavyData>(
  estimateSize,
  MAX_HEAVY_DATA_SIZE
);

/**
 * Send data to the panel window. Buffers if panel is not yet open.
 */
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
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
}

/**
 * Send a page navigation event to the panel window.
 * Buffers if panel is not yet open.
 */
export function sendPageNavigation(nav: PageNavigation): void {
  if (panelWindow && !panelWindow.closed && panelWindow.receivePageNavigation) {
    try {
      panelWindow.receivePageNavigation(nav);
      return;
    } catch {
      // fall through to buffer
    }
  }
  navBuffer.push(nav);
  if (navBuffer.length > MAX_BUFFER) navBuffer.splice(0, navBuffer.length - MAX_BUFFER);
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

  // Flush buffered page navigations
  navBuffer.forEach((nav) => {
    try {
      if (win.receivePageNavigation) {
        win.receivePageNavigation(nav);
      }
    } catch {
      // ignore
    }
  });
  navBuffer = [];
}

/**
 * Get current panel window reference.
 */
export function getPanelWindow(): PanelWindow | null {
  return panelWindow;
}
