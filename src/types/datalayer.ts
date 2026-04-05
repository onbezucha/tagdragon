// ─── DATALAYER TYPES ─────────────────────────────────────────────────────────
// Types for the DataLayer tab feature.
// Keep separate from src/types/request.ts (that file is scoped to network requests).

export type DataLayerSource =
  | 'gtm'
  | 'digitalData'
  | 'tealium'
  | 'adobe'
  | 'segment'
  | 'custom';

export interface DataLayerPush {
  readonly id: number;                       // Unique ID (timestamp * 1000 + counter via generateId())
  readonly source: DataLayerSource;          // Which data layer source
  readonly sourceLabel: string;              // Display name: "GTM", "Tealium", etc.
  readonly pushIndex: number;                // Index in the dataLayer array
  readonly timestamp: string;               // ISO timestamp of the push
  readonly data: Record<string, unknown>;   // The pushed data object
  readonly cumulativeState: Record<string, unknown>; // Full state AFTER this push
  readonly isReplay?: boolean;               // Whether this is a replay of existing dataLayer items

  // E-commerce detection (computed)
  readonly _ecommerceType?: 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null;
  readonly _eventName?: string;              // Extracted event name

  // Search indexing
  _searchIndex?: string;
}

export interface DiffEntry {
  readonly key: string;
  readonly path: string;                     // Dot-notation path: "ecommerce.purchase.products"
  readonly type: 'added' | 'removed' | 'changed';
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

export interface DataLayerState {
  all: DataLayerPush[];
  map: Map<number, DataLayerPush>;           // keyed by id (number)
  filteredIds: Set<number>;
  selectedId: number | null;
  isPaused: boolean;
  sources: Set<DataLayerSource>;             // Detected sources on this page
  sourceLabels: Map<DataLayerSource, string>; // GTM-GTMXXXXX, etc.
}

// ─── MESSAGE TYPES ────────────────────────────────────────────────────────────

// Content → Background (tabId omitted — background reads from sender.tab.id)
export interface DataLayerPushMessage {
  type: 'DATALAYER_PUSH';
  source: DataLayerSource;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
}

// Content → Background (source detection)
export interface DataLayerSourcesMessage {
  type: 'DATALAYER_SOURCES';
  sources: DataLayerSource[];
  labels: Record<string, string>;
}

// DevTools → Background (request current state snapshot)
export interface DataLayerSnapshotRequest {
  type: 'DATALAYER_SNAPSHOT_REQUEST';
  tabId: number;
}

// Content → Background (snapshot response)
export interface DataLayerSnapshotResponse {
  type: 'DATALAYER_SNAPSHOT_RESPONSE';
  data: Record<string, unknown>;
}

export type DlTabName = 'push-data' | 'diff' | 'current-state' | 'correlation';
