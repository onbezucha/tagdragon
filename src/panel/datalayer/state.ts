// ─── DATALAYER PANEL STATE ────────────────────────────────────────────────────
// Parallel to src/panel/state.ts — manages DataLayer push state independently.

import type {
  DataLayerPush,
  DataLayerState,
  DataLayerSource,
  ValidationResult,
  ValidationRule,
} from '@/types/datalayer';
import { getAppConfig, updateConfigImmediate } from '@/panel/state';

// ─── STATE CONTAINERS ────────────────────────────────────────────────────────

const dlState: DataLayerState = {
  all: [],
  map: new Map(),
  filteredIds: new Set(),
  selectedId: null,
  isPaused: false,
  sources: new Set(),
  sourceLabels: new Map(),
  // Cached source counts for O(1) getDlSourceCount lookups
  _sourceCountMap: new Map(),
};

// ─── FILTER STATE ────────────────────────────────────────────────────────────

interface DlFilterState {
  text: string;
  source: DataLayerSource | '';
  eventName: string; // Filtered via DL filter popover → Event Name submenu
  hasKey: string; // Filtered via DL filter popover → Has Key submenu
  ecommerceOnly: boolean;
}

const dlFilterState: DlFilterState = {
  text: '',
  source: '',
  eventName: '',
  hasKey: '',
  ecommerceOnly: false,
};

let watchedPaths: string[] = [];

// ─── PUSH OPERATIONS ─────────────────────────────────────────────────────────

export function addDlPush(push: DataLayerPush): boolean {
  dlState.all.push(push);
  dlState.map.set(push.id, push);

  // Increment source count
  const sourceCountMap = dlState._sourceCountMap ?? new Map();
  sourceCountMap.set(push.source, (sourceCountMap.get(push.source) ?? 0) + 1);
  dlState._sourceCountMap = sourceCountMap;

  // Auto-prune if limit exceeded (mirrors network request pruning)
  const maxPushes = getAppConfig().maxDlPushes || 1000;
  if (dlState.all.length > maxPushes) {
    const pruneTo = Math.floor(maxPushes * 0.75);
    const removed = dlState.all.splice(0, dlState.all.length - pruneTo);
    removed.forEach((p) => dlState.map.delete(p.id));
    // Rebuild source count map after prune
    _rebuildSourceCountMap();
    return true; // signal prune
  }
  return false;
}

function _rebuildSourceCountMap(): void {
  const counts = new Map<DataLayerSource, number>();
  for (const push of dlState.all) {
    counts.set(push.source, (counts.get(push.source) ?? 0) + 1);
  }
  dlState._sourceCountMap = counts;
}

export function clearDlPushes(): void {
  dlState.all = [];
  dlState.map.clear();
  dlState.filteredIds.clear();
  dlState.sources.clear();
  dlState.sourceLabels.clear();
  dlState.selectedId = null;
  dlState._sourceCountMap = new Map();
}

export function getAllDlPushes(): DataLayerPush[] {
  return dlState.all;
}

export function getDlPushById(id: number): DataLayerPush | undefined {
  return dlState.map.get(id);
}

// ─── FILTERED IDS ────────────────────────────────────────────────────────────

export function getDlFilteredIds(): Set<number> {
  return dlState.filteredIds;
}

export function clearDlFilteredIds(): void {
  dlState.filteredIds.clear();
}

export function addDlFilteredId(id: number): void {
  dlState.filteredIds.add(id);
}

// ─── SELECTED ID ─────────────────────────────────────────────────────────────

export function getDlSelectedId(): number | null {
  return dlState.selectedId;
}

export function setDlSelectedId(id: number | null): void {
  dlState.selectedId = id;
}

// ─── PAUSE STATE ─────────────────────────────────────────────────────────────

export function getDlIsPaused(): boolean {
  return dlState.isPaused;
}

export function setDlIsPaused(paused: boolean): void {
  dlState.isPaused = paused;
}

// ─── SOURCES ─────────────────────────────────────────────────────────────────

export function addDlSource(source: DataLayerSource): void {
  dlState.sources.add(source);
}

export function getDlSources(): Set<DataLayerSource> {
  return dlState.sources;
}

export function getDlSourceCount(source: DataLayerSource): number {
  return dlState._sourceCountMap?.get(source) ?? 0;
}

export function getDlEventNames(): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const push of dlState.all) {
    const eventName = push.data?.event;
    if (typeof eventName === 'string' && eventName) {
      counts[eventName] = (counts[eventName] || 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// ─── FILTER STATE ────────────────────────────────────────────────────────────

export function setDlFilterText(text: string): void {
  dlFilterState.text = text;
}

export function getDlFilterText(): string {
  return dlFilterState.text;
}

export function setDlFilterSource(source: DataLayerSource | ''): void {
  dlFilterState.source = source;
}

export function getDlFilterSource(): DataLayerSource | '' {
  return dlFilterState.source;
}

export function setDlFilterEventName(name: string): void {
  dlFilterState.eventName = name;
}

export function getDlFilterEventName(): string {
  return dlFilterState.eventName;
}

export function setDlFilterHasKey(key: string): void {
  dlFilterState.hasKey = key;
}

export function getDlFilterHasKey(): string {
  return dlFilterState.hasKey;
}

export function setDlEcommerceOnly(only: boolean): void {
  dlFilterState.ecommerceOnly = only;
}

export function getDlEcommerceOnly(): boolean {
  return dlFilterState.ecommerceOnly;
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export function getDlVisibleCount(): number {
  return dlState.filteredIds.size;
}

export function getDlTotalCount(): number {
  return dlState.all.length;
}

// ─── CUMULATIVE STATE TRACKING ───────────────────────────────────────────────
// Maintains a rolling cumulative state snapshot for each push

export function computeCumulativeState(upToIndex: number): Record<string, unknown> {
  const all = dlState.all;
  if (upToIndex >= 0 && upToIndex < all.length) {
    const push = all[upToIndex];
    // Use pre-computed cumulative state if available (pushed after optimization)
    if (push.cumulativeState && Object.keys(push.cumulativeState).length > 0) {
      return push.cumulativeState;
    }
  }
  // Fallback: compute from scratch for legacy pushes without cumulativeState
  const result: Record<string, unknown> = {};
  for (let i = 0; i <= upToIndex && i < all.length; i++) {
    const data = all[i].data;
    for (const key of Object.keys(data)) {
      result[key] = data[key];
    }
  }
  return result;
}

// ─── WATCH PATHS ──────────────────────────────────────────────────────────────

const MAX_WATCHED_PATHS = 10;

export function getWatchedPaths(): string[] {
  return watchedPaths;
}

export function addWatchedPath(path: string): boolean {
  if (watchedPaths.includes(path) || watchedPaths.length >= MAX_WATCHED_PATHS) return false;
  watchedPaths.push(path);
  return true;
}

export function removeWatchedPath(path: string): void {
  watchedPaths = watchedPaths.filter((p) => p !== path);
}

export function clearWatchedPaths(): void {
  watchedPaths = [];
}

// ─── VALIDATION STATE ─────────────────────────────────────────────────────

const validationErrors: Map<number, ValidationResult[]> = new Map();
let validationRules: ValidationRule[] = [];
let validationLoaded = false;

export function getValidationErrors(pushId: number): ValidationResult[] {
  return validationErrors.get(pushId) ?? [];
}

export function setValidationErrors(pushId: number, errors: ValidationResult[]): void {
  validationErrors.set(pushId, errors);
}

export function clearValidationErrors(): void {
  validationErrors.clear();
}

export function getValidationRules(): ValidationRule[] {
  return validationRules;
}

export function setValidationRules(rules: ValidationRule[]): void {
  validationRules = rules;
}

export function isValidationLoaded(): boolean {
  return validationLoaded;
}

export function setValidationLoaded(loaded: boolean): void {
  validationLoaded = loaded;
}

// ─── CORRELATION CONFIG ────────────────────────────────────────────────────

const correlationLookbackMs: number = 500;

export function getCorrelationWindow(): number {
  return getAppConfig().correlationWindowMs ?? 2000;
}

export function setCorrelationWindow(ms: number): void {
  updateConfigImmediate('correlationWindowMs', ms);
}

export function getCorrelationLookback(): number {
  return correlationLookbackMs;
}

// ─── SORT STATE ────────────────────────────────────────────────────────────

type DlSortField = 'time' | 'keycount' | 'source';
type DlSortOrder = 'asc' | 'desc';

let dlSortField: DlSortField = 'time';
let dlSortOrder: DlSortOrder = 'asc'; // Default: oldest first

/**
 * Initialize DataLayer sort state from persisted AppConfig.
 * Called after loadConfig() in the panel init sequence.
 */
export function initDlSortState(): void {
  const cfg = getAppConfig();
  dlSortField = cfg.dlSortField;
  dlSortOrder = cfg.dlSortOrder;
  dlGroupBySource = cfg.dlGroupBySource;
}

export function getDlSortField(): DlSortField {
  return dlSortField;
}
export function setDlSortField(field: DlSortField): void {
  dlSortField = field;
  updateConfigImmediate('dlSortField', field);
}
export function getDlSortOrder(): DlSortOrder {
  return dlSortOrder;
}
export function setDlSortOrder(order: DlSortOrder): void {
  dlSortOrder = order;
  updateConfigImmediate('dlSortOrder', order);
}
export function toggleDlSortOrder(): DlSortOrder {
  dlSortOrder = dlSortOrder === 'asc' ? 'desc' : 'asc';
  updateConfigImmediate('dlSortOrder', dlSortOrder);
  return dlSortOrder;
}

// ─── GROUP BY SOURCE STATE ─────────────────────────────────────────────────

let dlGroupBySource: boolean = false;

export function getDlGroupBySource(): boolean {
  return dlGroupBySource;
}
export function setDlGroupBySource(group: boolean): void {
  dlGroupBySource = group;
  updateConfigImmediate('dlGroupBySource', group);
}

// ─── DATALAYER BATCHING STATE ─────────────────────────────────────────────

interface DlPendingPush {
  push: DataLayerPush;
  isVisible: boolean;
}

let dlPendingPushes: DlPendingPush[] = [];
let dlRafId: number | null = null;

export function addDlPendingPush(item: DlPendingPush): void {
  dlPendingPushes.push(item);
}

export function getDlPendingPushes(): DlPendingPush[] {
  return dlPendingPushes;
}

export function clearDlPendingPushes(): void {
  dlPendingPushes = [];
}

export function getDlRafId(): number | null {
  return dlRafId;
}

export function setDlRafId(id: number | null): void {
  dlRafId = id;
}

// ─── SHARED CUMULATIVE STATE ─────────────────────────────────────────────
// Single mutable object that grows with each push.
// Avoids N shallow copies per session.

let sharedCumulativeState: Record<string, unknown> = {};

/**
 * Get the current shared cumulative state reference.
 * Mutating this directly is safe ONLY inside receiveDataLayerPush.
 */
export function getSharedCumulativeState(): Record<string, unknown> {
  return sharedCumulativeState;
}

/**
 * Create a lightweight snapshot of the current cumulative state.
 * Uses structuredClone for true copy (available in modern Chrome).
 */
export function snapshotCumulativeState(): Record<string, unknown> {
  try {
    return structuredClone(sharedCumulativeState);
  } catch {
    return JSON.parse(JSON.stringify(sharedCumulativeState));
  }
}

/**
 * Reset cumulative state (on clear).
 */
export function resetCumulativeState(): void {
  sharedCumulativeState = {};
}

/**
 * Trim cumulative state to only contain keys present in the remaining pushes.
 * Called after a prune to prevent unbounded memory growth.
 */
export function trimCumulativeState(): void {
  const keys = new Set<string>();
  for (const push of dlState.all) {
    for (const k of Object.keys(push.data)) {
      keys.add(k);
    }
  }
  // Remove keys not present in any remaining push
  for (const k of Object.keys(sharedCumulativeState)) {
    if (!keys.has(k)) {
      delete sharedCumulativeState[k];
    }
  }
}
