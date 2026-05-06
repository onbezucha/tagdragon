// ─── DATA LAYER RELAY ─────────────────────────────────────────────────────────
// Helpers to relay DataLayer messages from background port to the panel window.
// Buffers pushes that arrive before the panel window is ready, like panel-bridge
// does for network requests.

import { getPanelWindow } from './panel-bridge';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';
import { detectEcommerceType } from '@/shared/ecommerce';
import { generateId } from '@/shared/id-gen';

import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';
import { MAX_BUFFER } from '@/shared/constants';
let dlBuffer: DataLayerPush[] = [];

export function buildPush(msg: {
  source: DataLayerSource;
  sourceLabel?: string;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
  isReplay?: boolean;
}): DataLayerPush {
  return {
    id: generateId(),
    source: msg.source,
    sourceLabel: msg.sourceLabel ?? SOURCE_DESCRIPTIONS[msg.source] ?? msg.source,
    pushIndex: msg.pushIndex,
    timestamp: msg.timestamp,
    data: msg.data,
    cumulativeState: {},
    isReplay: msg.isReplay ?? false,
    _eventName: extractEventName(msg.data),
    _ecommerceType: detectEcommerceType(msg.data),
  };
}

/**
 * Flush buffered pushes to the panel window.
 * Called by devtools/index.ts when panel.onShown fires.
 */
export function flushDataLayerBuffer(): void {
  if (!dlBuffer.length) return;
  const win = getPanelWindow();
  if (!win || win.closed) return;
  if (typeof win.receiveDataLayerPush !== 'function') return;
  const toFlush = dlBuffer;
  dlBuffer = [];
  for (const push of toFlush) {
    try {
      win.receiveDataLayerPush(push);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Send a DataLayer push to the panel window.
 * Buffers if the panel window is not yet available.
 */
export function sendDataLayerPushToPanel(msg: {
  source: DataLayerSource;
  sourceLabel?: string;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
  isReplay?: boolean;
}): void {
  const push = buildPush(msg);
  const win = getPanelWindow();
  if (!win || win.closed || typeof win.receiveDataLayerPush !== 'function') {
    // Panel not ready — buffer for later
    dlBuffer.push(push);
    if (dlBuffer.length > MAX_BUFFER) dlBuffer = dlBuffer.slice(-MAX_BUFFER);
    return;
  }
  try {
    win.receiveDataLayerPush(push);
  } catch {
    // Panel window threw — buffer it
    dlBuffer.push(push);
  }
}

/**
 * Send detected DataLayer sources to the panel window.
 */
export function sendDataLayerSourcesToPanel(
  sources: DataLayerSource[],
  labels: Record<string, string>
): void {
  const win = getPanelWindow();
  if (!win || win.closed) return;
  try {
    if (typeof win.receiveDataLayerSources === 'function') {
      win.receiveDataLayerSources(sources, labels as Record<DataLayerSource, string>);
    }
  } catch {
    // ignore
  }
}

export function extractEventName(data: Record<string, unknown>): string | undefined {
  if (typeof data['event'] === 'string') return data['event'];
  if (typeof data['eventName'] === 'string') return data['eventName'];
  if (typeof data['event_name'] === 'string') return data['event_name'];
  return undefined;
}
