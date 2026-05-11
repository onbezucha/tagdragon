// ─── DATALAYER PANEL STATE ────────────────────────────────────────────────────
// Parallel to src/panel/state.ts — manages DataLayer push state independently.

import type {
  DataLayerPush,
  DataLayerState,
  DataLayerSource,
  DlTimelineEntry,
  ValidationResult,
  ValidationRule,
} from '@/types/datalayer';
import { isDlNavMarker, isDlPush } from '@/types/datalayer';
import { getConfig, updateConfigImmediate } from '@/panel/state';

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

/** Cached event name counts — incrementally updated on push add/prune/clear. */
const MAX_EVENT_NAME_CACHE = 1000;
let _eventNameCountMap: Map<string, number> = new Map();

/** Cached navigation push counts — incrementally updated on push add/prune/clear. */
const _navPushCounts = new Map<number, number>();

/** Incremental push count — updated on add/prune/clear for O(1) getDlTotalCount(). */
let _dlPushCount = 0;

// ─── FILTER STATE ────────────────────────────────────────────────────────────

interface DlFilterState {
  text: string;
  source: DataLayerSource | '';
  eventName: string; // Filtered via DL filter popover → Event Name submenu
  hasKey: string; // Filtered via DL filter popover → Has Key submenu
  ecommerceOnly: boolean;
  hideGtmSystem: boolean; // true = filter out pushes with event names starting with "gtm."
}

const dlFilterState: DlFilterState = {
  text: '',
  source: '',
  eventName: '',
  hasKey: '',
  ecommerceOnly: false,
  hideGtmSystem: false,
};

let watchedPaths: string[] = [];

// ─── CUMULATIVE STATE CACHE ───────────────────────────────────────────────────
// Index → cumulative state snapshot. Avoids O(n) recomputation per push.
// Invalidated on any structural change (prune, clear).

const _cumulativeCache = new Map<number, Record<string, unknown>>();
const MAX_CUMULATIVE_CACHE = 200;
const CUMULATIVE_EVICT_COUNT = 100;

// Track the lowest cached index to optimize backward scans after cache clear
let _lowestCachedIndex = Infinity;

// ─── PUSH OPERATIONS ─────────────────────────────────────────────────────────

export function addDlPush(push: DlTimelineEntry): boolean {
  dlState.all.push(push);
  dlState.map.set(push.id, push);

  // Skip source/event counts for navigation markers
  if (!isDlNavMarker(push)) {
    // Increment incrementally-maintained counters
    _dlPushCount++;

    // Increment source count
    const sourceCountMap = dlState._sourceCountMap ?? new Map();
    sourceCountMap.set(push.source, (sourceCountMap.get(push.source) ?? 0) + 1);
    dlState._sourceCountMap = sourceCountMap;

    // Incrementally update event name cache
    const eventName = push.data?.event;
    if (typeof eventName === 'string' && eventName) {
      _eventNameCountMap.set(eventName, (_eventNameCountMap.get(eventName) ?? 0) + 1);
      // LRU eviction: delete the oldest (first-inserted) entry when cache exceeds max size
      if (_eventNameCountMap.size > MAX_EVENT_NAME_CACHE) {
        const oldestKey = _eventNameCountMap.keys().next().value;
        if (oldestKey !== undefined) _eventNameCountMap.delete(oldestKey);
      }
    }
  }

  // Auto-prune if limit exceeded (mirrors network request pruning)
  const maxPushes = getConfig().maxDlPushes;
  if (maxPushes > 0 && dlState.all.length > maxPushes) {
    const pruneTo = Math.floor(maxPushes * (getConfig().pruneRatio ?? 0.75));
    const removeCount = dlState.all.length - pruneTo;

    // Before splicing, decrement source counts for removed pushes
    for (let i = 0; i < removeCount; i++) {
      const entry = dlState.all[i];
      if (isDlNavMarker(entry)) continue;
      const source = entry.source;
      if (source) {
        if (!dlState._sourceCountMap) dlState._sourceCountMap = new Map();
        const current = dlState._sourceCountMap.get(source) ?? 0;
        if (current <= 1) {
          dlState._sourceCountMap.delete(source);
        } else {
          dlState._sourceCountMap.set(source, current - 1);
        }
      }
    }

    // Decrement event name counts for removed pushes
    for (let i = 0; i < removeCount; i++) {
      const entry = dlState.all[i];
      if (isDlNavMarker(entry)) continue;
      const removedEvent = entry.data?.event;
      if (typeof removedEvent === 'string' && removedEvent) {
        const current = _eventNameCountMap.get(removedEvent) ?? 0;
        if (current <= 1) {
          _eventNameCountMap.delete(removedEvent);
        } else {
          _eventNameCountMap.set(removedEvent, current - 1);
        }
      }
    }

    // Decrement nav push counts for removed pushes
    for (let i = 0; i < removeCount; i++) {
      const entry = dlState.all[i];
      if (isDlNavMarker(entry)) continue;
      const markerId = (entry as { _dlNavMarkerId?: number })._dlNavMarkerId;
      if (markerId !== undefined) {
        decrementNavPushCount(markerId);
      }
    }

    const removed = dlState.all.splice(0, removeCount);
    removed.forEach((p) => dlState.map.delete(p.id));

    // Decrement push count for removed pushes
    const removedPushCount = removed.filter((e) => !isDlNavMarker(e)).length;
    _dlPushCount -= removedPushCount;

    // Remove orphaned markers (no pushes remaining after prune)
    const orphanedIds: number[] = [];
    for (const entry of dlState.all) {
      if (isDlNavMarker(entry) && !_navPushCounts.has(entry.id)) {
        orphanedIds.push(entry.id);
      }
    }
    if (orphanedIds.length > 0) {
      const orphanedSet = new Set(orphanedIds);
      dlState.all = dlState.all.filter((e) => !orphanedSet.has(e.id));
      orphanedIds.forEach((id) => dlState.map.delete(id));
    }

    // Invalidate cache — all indices have shifted
    _cumulativeCache.clear();
    _lowestCachedIndex = Infinity;
    // Invalidate push-only cache after prune
    invalidatePushCache();
    // Clean validation errors for pruned pushes only
    for (const p of removed) {
      validationErrors.delete(p.id);
    }
    return true; // signal prune
  }
  // Invalidate push-only cache after adding a new push
  invalidatePushCache();
  return false; // signal prune
}

export function clearDlPushes(): void {
  dlState.all = [];
  dlState.map.clear();
  dlState.filteredIds.clear();
  dlState.sources.clear();
  dlState.sourceLabels.clear();
  dlState.selectedId = null;
  dlState._sourceCountMap = new Map();
  _eventNameCountMap = new Map();
  clearNavPushCounts();
  _dlPushCount = 0;
  _cumulativeCache.clear();
  _lowestCachedIndex = Infinity;
  // Invalidate push-only cache after clear
  invalidatePushCache();
}

let _pushOnlyCache: DataLayerPush[] | null = null;

export function getAllDlPushes(): DataLayerPush[] {
  if (_pushOnlyCache !== null) return _pushOnlyCache;
  _pushOnlyCache = dlState.all.filter(isDlPush) as DataLayerPush[];
  return _pushOnlyCache;
}

/** Invalidate push-only cache. Call on add/prune/clear. */
function invalidatePushCache(): void {
  _pushOnlyCache = null;
}

/** Get all timeline entries (pushes + markers). */
export function getAllDlEntries(): DlTimelineEntry[] {
  return dlState.all;
}

/** Count of navigation markers currently in the timeline */
export function getDlNavMarkerCount(): number {
  return dlState.all.filter((p) => isDlNavMarker(p)).length;
}

/** Get all navigation markers in timeline order */
export function getDlNavMarkers(): import('@/types/datalayer').DlNavMarker[] {
  return dlState.all.filter(isDlNavMarker) as import('@/types/datalayer').DlNavMarker[];
}

export function getNavPushCounts(): Map<number, number> {
  return _navPushCounts;
}

export function incrementNavPushCount(markerId: number): void {
  _navPushCounts.set(markerId, (_navPushCounts.get(markerId) ?? 0) + 1);
}

export function decrementNavPushCount(markerId: number): void {
  const current = _navPushCounts.get(markerId) ?? 0;
  if (current <= 1) _navPushCounts.delete(markerId);
  else _navPushCounts.set(markerId, current - 1);
}

export function clearNavPushCounts(): void {
  _navPushCounts.clear();
}

/** Get any timeline entry by ID (push or marker) */
export function getDlEntryById(id: number): DlTimelineEntry | undefined {
  return dlState.map.get(id);
}

/** Get a push entry by ID (excludes markers) */
export function getDlPushById(id: number): DataLayerPush | undefined {
  const entry = dlState.map.get(id);
  if (entry && isDlPush(entry)) return entry;
  return undefined;
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
  // Build sorted array from incrementally-maintained count map
  // Sort by count descending (most frequent first)
  return Array.from(_eventNameCountMap.entries()).sort((a, b) => b[1] - a[1]);
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

export function getDlHideGtmSystem(): boolean {
  return dlFilterState.hideGtmSystem;
}

export function setDlHideGtmSystem(hide: boolean): void {
  dlFilterState.hideGtmSystem = hide;
}

// ─── STATS ───────────────────────────────────────────────────────────────────

export function getDlVisibleCount(): number {
  return dlState.filteredIds.size;
}

export function getDlTotalCount(): number {
  return _dlPushCount;
}

// ─── CUMULATIVE STATE TRACKING ───────────────────────────────────────────────
// Maintains a rolling cumulative state snapshot for each push

export function computeCumulativeState(upToIndex: number): Record<string, unknown> {
  const all = dlState.all;
  if (upToIndex < 0 || upToIndex >= all.length) return {};

  // Cache hit — returns the stored snapshot without recomputation
  const cached = _cumulativeCache.get(upToIndex);
  if (cached !== undefined) return { ...cached };

  const push = all[upToIndex];

  // Prefer pre-computed cumulative state from legacy pushes (before this optimization)
  if (push.cumulativeState && Object.keys(push.cumulativeState).length > 0) {
    const cloned = { ...push.cumulativeState };
    _cumulativeCache.set(upToIndex, cloned);
    return cloned;
  }

  // Incremental build: use cached previous state if available, otherwise find nearest cache entry
  let result: Record<string, unknown>;
  let startIndex: number;

  // Try to build incrementally from the previous index
  const prevCached = _cumulativeCache.get(upToIndex - 1);
  if (prevCached !== undefined) {
    // O(1): Copy previous state and merge only the current push
    result = { ...prevCached };
    startIndex = upToIndex;
  } else {
    // Find nearest cached entry below upToIndex for partial incremental build
    let nearestIndex = -1;
    // Use _lowestCachedIndex as lower bound — skip scan entirely if cache is empty
    for (let i = upToIndex - 1; i >= _lowestCachedIndex; i--) {
      if (_cumulativeCache.has(i)) {
        nearestIndex = i;
        break;
      }
    }
    if (nearestIndex >= 0) {
      result = { ..._cumulativeCache.get(nearestIndex)! };
      startIndex = nearestIndex + 1;
    } else {
      result = {};
      startIndex = 0;
    }
  }

  // Merge remaining pushes using shallow spread (fast) — each push's keys
  // overwrite previous values. Deep clone only at cache boundary to prevent
  // mutation corruption from affecting cached results.
  for (let i = startIndex; i <= upToIndex; i++) {
    const entry = all[i];
    if (isDlNavMarker(entry)) continue; // markers have no data to merge
    const pushData = entry.data;
    // Shallow spread is sufficient here: new keys overwrite old, and we clone
    // before storing in cache to protect against mutation of original data
    result = { ...result, ...pushData };
  }

  // Evict oldest cache entries in batch when at capacity
  if (_cumulativeCache.size >= MAX_CUMULATIVE_CACHE) {
    // Collect keys first to avoid mutating Map during iteration
    const keysToDelete = Array.from(_cumulativeCache.keys()).slice(0, CUMULATIVE_EVICT_COUNT);
    for (const key of keysToDelete) {
      _cumulativeCache.delete(key);
    }
    // Update lowest cached index incrementally — after evicting the first
    // CUMULATIVE_EVICT_COUNT keys, the new lowest is the next key in the Map
    // (keys are sequential indices, inserted in ascending order)
    if (keysToDelete.includes(_lowestCachedIndex)) {
      const nextKey = _cumulativeCache.keys().next().value;
      _lowestCachedIndex = nextKey !== undefined ? nextKey : Infinity;
    }
  }

  // Deep clone result before caching to prevent mutation corruption
  _cumulativeCache.set(upToIndex, structuredClone(result));
  // Track lowest cached index incrementally
  if (upToIndex < _lowestCachedIndex) _lowestCachedIndex = upToIndex;
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
  return getConfig().correlationWindowMs ?? 2000;
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
  const cfg = getConfig();
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
