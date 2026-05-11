// ─── DATALAYER TYPES ─────────────────────────────────────────────────────────
// Types for the DataLayer tab feature.
// Keep separate from src/types/request.ts (that file is scoped to network requests).

export type DataLayerSource = 'gtm' | 'digitalData' | 'tealium' | 'adobe' | 'segment' | 'custom';

export interface DataLayerPush {
  readonly id: number; // Unique ID (timestamp * 1000 + counter via generateId())
  readonly source: DataLayerSource; // Which data layer source
  readonly sourceLabel: string; // Display name: "GTM", "Tealium", etc.
  readonly pushIndex: number; // Index in the dataLayer array
  readonly timestamp: string; // ISO timestamp of the push
  readonly data: Record<string, unknown>; // The pushed data object
  readonly cumulativeState: Record<string, unknown> | null; // Full state AFTER this push; null = lazy (computed on demand via computeCumulativeState)
  readonly isReplay?: boolean; // Whether this is a replay of existing dataLayer items

  // E-commerce detection (computed)
  readonly _ecommerceType?: 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null;
  readonly _eventName?: string; // Extracted event name
  readonly _dlNavMarkerId?: number; // ID of the DlNavMarker this push belongs to

  // Correlation count (computed)
  _correlatedCount?: number; // Number of correlated network requests (cached)

  // Diff count (computed)
  _diffCount?: number; // Number of changed paths from previous state (cached)

  // Search indexing
  _searchIndex?: string;
  _ts?: number;
}

// ─── NAVIGATION MARKER ─────────────────────────────────────────────────────
// Special entry in dlState.all marking page navigation boundaries.

export interface DlNavMarker {
  readonly id: number; // Unique ID via generateId()
  readonly _type: 'nav-marker'; // Discriminator — always 'nav-marker'
  readonly timestamp: string; // ISO timestamp of navigation
  readonly url: string; // New page URL after navigation (empty string if unavailable)
  readonly source: 'navigation'; // Constant — enables source-based iteration without guard
  readonly sourceLabel: 'Navigation';
  readonly pushIndex: -1; // Sentinel value — markers are not pushes
  readonly data: Record<string, unknown>; // Empty object — satisfies DataLayerPush shape
  cumulativeState: null;
  readonly isReplay: false;
  readonly _ecommerceType: null;
  readonly _eventName: undefined;
  _ts?: number;
  _searchIndex?: string;
}

/** Union type for any entry in the DataLayer timeline */
export type DlTimelineEntry = DataLayerPush | DlNavMarker;

/** Type guard: returns true for navigation markers */
export function isDlNavMarker(entry: DlTimelineEntry): entry is DlNavMarker {
  return (entry as DlNavMarker)._type === 'nav-marker';
}

/** Type guard: returns true for regular pushes */
export function isDlPush(entry: DlTimelineEntry): entry is DataLayerPush {
  return (entry as DlNavMarker)._type !== 'nav-marker';
}

export interface DiffEntry {
  readonly key: string;
  readonly path: string; // Dot-notation path: "ecommerce.purchase.products"
  readonly type: 'added' | 'removed' | 'changed';
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

export interface DataLayerState {
  all: DlTimelineEntry[];
  map: Map<number, DlTimelineEntry>; // keyed by id (number)
  filteredIds: Set<number>;
  selectedId: number | null;
  isPaused: boolean;
  sources: Set<DataLayerSource>; // Detected sources on this page
  sourceLabels: Map<DataLayerSource, string>; // GTM-GTMXXXXX, etc.
  _sourceCountMap?: Map<DataLayerSource, number>; // Cached source counts for O(1) lookups
}

// ─── VALIDATION TYPES ──────────────────────────────────────────────────────

export type ValidationCheckType = 'required_key' | 'key_type' | 'forbidden_key' | 'custom';

export interface ValidationCheck {
  type: ValidationCheckType;
  key?: string; // Key path to check (dot-notation)
  valueType?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  message: string;
}

export interface ValidationRuleScope {
  eventName?: string | string[];
  source?: DataLayerSource;
  ecommerceType?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  enabled: boolean;
  scope: ValidationRuleScope;
  checks: ValidationCheck[];
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  checkMessage: string;
  failedKey?: string;
}
