// ─── DATA LAYER RELAY ─────────────────────────────────────────────────────────
// Helpers to relay DataLayer messages from background port to the panel window.
// Buffers pushes that arrive before the panel window is ready, like panel-bridge
// does for network requests.

import { getPanelWindow } from './panel-bridge';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';

const MAX_BUFFER = 500;
let dlBuffer: DataLayerPush[] = [];

function buildPush(msg: {
  source: DataLayerSource;
  sourceLabel?: string;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
  isReplay?: boolean;
}): DataLayerPush {
  return {
    id: Date.now() + Math.random(),
    source: msg.source,
    sourceLabel: msg.sourceLabel ?? sourceToLabel(msg.source),
    pushIndex: msg.pushIndex,
    timestamp: msg.timestamp,
    data: msg.data,
    cumulativeState: {},
    diffFromPrevious: null,
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
    try { win.receiveDataLayerPush(push); } catch { /* ignore */ }
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
  labels: Record<string, string>,
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

/**
 * Send a DataLayer snapshot to the panel window.
 */
export function sendDataLayerSnapshotToPanel(data: Record<string, unknown>): void {
  const win = getPanelWindow();
  if (!win || win.closed) return;
  try {
    if (typeof win.receiveDataLayerSnapshot === 'function') {
      win.receiveDataLayerSnapshot(data);
    }
  } catch {
    // ignore
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sourceToLabel(source: DataLayerSource): string {
  const map: Record<DataLayerSource, string> = {
    gtm: 'GTM',
    tealium: 'Tealium',
    adobe: 'Adobe',
    segment: 'Segment',
    digitalData: 'W3C',
    custom: 'Custom',
  };
  return map[source] ?? source;
}

function extractEventName(data: Record<string, unknown>): string | undefined {
  if (typeof data['event'] === 'string') return data['event'];
  if (typeof data['eventName'] === 'string') return data['eventName'];
  if (typeof data['event_name'] === 'string') return data['event_name'];
  return undefined;
}

function detectEcommerceType(
  data: Record<string, unknown>,
): 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null {
  if (!data['ecommerce']) return null;
  const event = typeof data['event'] === 'string' ? data['event'] : '';
  const ec = data['ecommerce'] as Record<string, unknown>;

  if (event === 'purchase' || ec['purchase']) return 'purchase';
  if (event === 'refund' || ec['refund']) return 'refund';
  if (event.startsWith('begin_checkout') || event.startsWith('add_shipping') || ec['checkout']) return 'checkout';
  if (event === 'view_item_list' || ec['impressions']) return 'impression';
  if (event === 'select_promotion' || ec['promoView'] || ec['promoClick']) return 'promo';
  return null;
}
