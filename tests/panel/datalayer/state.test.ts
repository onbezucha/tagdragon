import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { DataLayerPush, DlNavMarker, ValidationResult, ValidationRule } from '@/types/datalayer';

// ─── MOCK @/panel/state ────────────────────────────────────────────────────

const mockGetConfig = vi.fn(() => ({
  maxDlPushes: 1000,
  correlationWindowMs: 2000,
  dlSortField: 'time' as const,
  dlSortOrder: 'asc' as const,
  dlGroupBySource: false,
}));

const mockUpdateConfigImmediate = vi.fn();

vi.mock('@/panel/state', () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  updateConfigImmediate: (...args: unknown[]) => mockUpdateConfigImmediate(...args),
}));

// ─── IMPORTS AFTER MOCK ────────────────────────────────────────────────────

import {
  // Push operations
  addDlPush,
  clearDlPushes,
  getAllDlPushes,
  getAllDlEntries,
  getDlEntryById,
  getDlPushById,
  // Filtered IDs
  getDlFilteredIds,
  clearDlFilteredIds,
  addDlFilteredId,
  // Selected ID
  getDlSelectedId,
  setDlSelectedId,
  // Pause state
  getDlIsPaused,
  setDlIsPaused,
  // Sources
  addDlSource,
  getDlSources,
  getDlSourceCount,
  getDlEventNames,
  // Filter state
  setDlFilterText,
  getDlFilterText,
  setDlFilterSource,
  getDlFilterSource,
  setDlFilterEventName,
  getDlFilterEventName,
  setDlFilterHasKey,
  getDlFilterHasKey,
  setDlEcommerceOnly,
  getDlEcommerceOnly,
  // Stats
  getDlVisibleCount,
  getDlTotalCount,
  // Cumulative state
  computeCumulativeState,
  // Watch paths
  getWatchedPaths,
  addWatchedPath,
  removeWatchedPath,
  clearWatchedPaths,
  // Validation
  getValidationErrors,
  setValidationErrors,
  clearValidationErrors,
  getValidationRules,
  setValidationRules,
  // Sort state
  getDlSortField,
  setDlSortField,
  getDlSortOrder,
  setDlSortOrder,
  toggleDlSortOrder,
  // Group by source
  getDlGroupBySource,
  setDlGroupBySource,
  // Batching
  addDlPendingPush,
  getDlPendingPushes,
  clearDlPendingPushes,
  getDlRafId,
  setDlRafId,
  // Extra exports used internally
  initDlSortState,
  getDlNavMarkerCount,
  getDlNavMarkers,
  getCorrelationWindow,
  getCorrelationLookback,
  setCorrelationWindow,
  isValidationLoaded,
  setValidationLoaded,
} from '@/panel/datalayer/state';
import { isDlNavMarker } from '@/types/datalayer';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function mockPush(id: number, data: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): DataLayerPush {
  return {
    id,
    source: 'gtm',
    sourceLabel: 'GTM',
    pushIndex: id,
    timestamp: '2024-01-01T00:00:00.000Z',
    data,
    cumulativeState: null,
    ...overrides,
  } as unknown as DataLayerPush;
}

function mockNavMarker(id: number, url = 'https://example.com'): DlNavMarker {
  return {
    id,
    _type: 'nav-marker',
    timestamp: '2024-01-01T00:00:00.000Z',
    url,
    source: 'navigation' as const,
    sourceLabel: 'Navigation',
    pushIndex: -1,
    data: {},
    cumulativeState: null,
    isReplay: false,
    _ecommerceType: null,
    _eventName: undefined,
  };
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

describe('datalayer/state', () => {
  beforeEach(() => {
    // Reset all module-level mutable state between tests
    clearDlPushes();
    clearDlFilteredIds();
    setDlSelectedId(null);
    setDlIsPaused(false);
    setDlFilterText('');
    setDlFilterSource('');
    setDlFilterEventName('');
    setDlFilterHasKey('');
    setDlEcommerceOnly(false);
    clearWatchedPaths();
    clearValidationErrors();
    clearDlPendingPushes();
    setDlRafId(null);
    setValidationLoaded(false);
    mockUpdateConfigImmediate.mockClear();
    mockGetConfig.mockClear();
    // Re-configure mock with defaults
    mockGetConfig.mockReturnValue({
      maxDlPushes: 1000,
      correlationWindowMs: 2000,
      dlSortField: 'time',
      dlSortOrder: 'asc',
      dlGroupBySource: false,
    });
    // Reset module-level sort/group state that initDlSortState manages
    setDlSortField('time');
    setDlSortOrder('asc');
    setDlGroupBySource(false);
    mockUpdateConfigImmediate.mockClear();
  });

  // ══════════════════════════════════════════════════════════════════════
  // PUSH OPERATIONS
  // ══════════════════════════════════════════════════════════════════════

  describe('addDlPush', () => {
    it('stores push in all and map', () => {
      const push = mockPush(1, { event: 'test' });
      addDlPush(push);
      expect(getAllDlEntries()).toHaveLength(1);
      expect(getDlEntryById(1)).toBe(push);
    });

    it('returns false when under limit (no prune)', () => {
      const push = mockPush(1);
      const pruned = addDlPush(push);
      expect(pruned).toBe(false);
      expect(getAllDlEntries()).toHaveLength(1);
    });

    it('returns true when over limit (prune triggered)', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), maxDlPushes: 5 });
      for (let i = 1; i <= 5; i++) {
        addDlPush(mockPush(i, { event: `event${i}` }));
      }
      // After 6th push: all.length=6, pruneTo=floor(5*0.75)=3, removeCount=3, 3 kept
      const pruned = addDlPush(mockPush(6, { event: 'event6' }));
      expect(pruned).toBe(true);
      expect(getAllDlEntries()).toHaveLength(3);
    });

    it('increments source count on addDlPush', () => {
      addDlPush(mockPush(1, {}, { source: 'gtm' }));
      expect(getDlSourceCount('gtm')).toBe(1);
      addDlPush(mockPush(2, {}, { source: 'gtm' }));
      expect(getDlSourceCount('gtm')).toBe(2);
      addDlPush(mockPush(3, {}, { source: 'segment' }));
      expect(getDlSourceCount('segment')).toBe(1);
      expect(getDlSourceCount('gtm')).toBe(2);
    });

    it('increments event name count on addDlPush', () => {
      addDlPush(mockPush(1, { event: 'page_view' }));
      addDlPush(mockPush(2, { event: 'page_view' }));
      addDlPush(mockPush(3, { event: 'add_to_cart' }));
      const names = getDlEventNames();
      const pageView = names.find(([n]) => n === 'page_view');
      const cart = names.find(([n]) => n === 'add_to_cart');
      expect(pageView?.[1]).toBe(2);
      expect(cart?.[1]).toBe(1);
    });

    it('auto-prune decrements source counts', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), maxDlPushes: 5 });
      for (let i = 1; i <= 10; i++) {
        addDlPush(mockPush(i, { event: `e${i}` }, { source: 'gtm' }));
      }
      // Prune triggers at 6th push (length > 5) and 9th push (length > 5 again)
      // Final entries: after 2 prunes, pushes 7-10 remain = 4 entries
      expect(getAllDlEntries()).toHaveLength(4);
      expect(getDlSourceCount('gtm')).toBe(4);
    });

    it('auto-prune decrements event name counts', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), maxDlPushes: 5 });
      for (let i = 1; i <= 10; i++) {
        addDlPush(mockPush(i, { event: i <= 6 ? 'remove' : 'keep' }));
      }
      // 6 'remove' pushes are pruned away (they fall in pruned ranges), 4 'keep' remain
      const names = getDlEventNames();
      const keep = names.find(([n]) => n === 'keep');
      const removed = names.find(([n]) => n === 'remove');
      expect(keep?.[1]).toBe(4);
      expect(removed).toBeUndefined();
    });

    it('does not update source/event counts for nav markers', () => {
      addDlPush(mockNavMarker(1));
      addDlPush(mockPush(2, {}, { source: 'gtm' }));
      expect(getDlSourceCount('gtm')).toBe(1);
      const names = getDlEventNames();
      expect(names).toHaveLength(0);
    });
  });

  describe('clearDlPushes', () => {
    it('resets all state containers', () => {
      addDlPush(mockPush(1, { event: 'test' }));
      addDlPush(mockNavMarker(2));
      addDlFilteredId(1);
      setDlSelectedId(1);
      clearDlPushes();
      expect(getAllDlEntries()).toHaveLength(0);
      expect(getAllDlPushes()).toHaveLength(0);
      expect(getDlFilteredIds()).toHaveLength(0);
      expect(getDlSelectedId()).toBeNull();
      expect(getDlSourceCount('gtm')).toBe(0);
    });
  });

  describe('getAllDlPushes', () => {
    it('returns only pushes, no nav markers', () => {
      addDlPush(mockPush(1));
      addDlPush(mockNavMarker(2));
      addDlPush(mockPush(3));
      const pushes = getAllDlPushes();
      expect(pushes).toHaveLength(2);
      expect(pushes.every((p) => !isDlNavMarker(p))).toBe(true);
    });
  });

  describe('getAllDlEntries', () => {
    it('returns all entries including nav markers', () => {
      addDlPush(mockPush(1));
      addDlPush(mockNavMarker(2));
      addDlPush(mockPush(3));
      expect(getAllDlEntries()).toHaveLength(3);
    });
  });

  describe('getDlEntryById', () => {
    it('returns entry when found', () => {
      const push = mockPush(1);
      addDlPush(push);
      expect(getDlEntryById(1)).toBe(push);
    });

    it('returns undefined when not found', () => {
      expect(getDlEntryById(999)).toBeUndefined();
    });
  });

  describe('getDlPushById', () => {
    it('returns push when found', () => {
      const push = mockPush(1);
      addDlPush(push);
      expect(getDlPushById(1)).toBe(push);
    });

    it('returns undefined for nav marker id', () => {
      addDlPush(mockNavMarker(2));
      expect(getDlPushById(2)).toBeUndefined();
    });

    it('returns undefined when not found', () => {
      expect(getDlPushById(999)).toBeUndefined();
    });
  });

  describe('getDlNavMarkerCount', () => {
    it('counts nav markers only', () => {
      addDlPush(mockPush(1));
      addDlPush(mockNavMarker(2));
      addDlPush(mockPush(3));
      addDlPush(mockNavMarker(4));
      expect(getDlNavMarkerCount()).toBe(2);
    });
  });

  describe('getDlNavMarkers', () => {
    it('returns only nav markers', () => {
      addDlPush(mockPush(1));
      addDlPush(mockNavMarker(2));
      addDlPush(mockNavMarker(3));
      const markers = getDlNavMarkers();
      expect(markers).toHaveLength(2);
      expect(markers.every(isDlNavMarker)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // FILTERED IDS
  // ══════════════════════════════════════════════════════════════════════

  describe('filtered IDs', () => {
    it('addDlFilteredId adds to set', () => {
      addDlFilteredId(1);
      addDlFilteredId(2);
      expect(getDlFilteredIds()).toContain(1);
      expect(getDlFilteredIds()).toContain(2);
    });

    it('clearDlFilteredIds clears set', () => {
      addDlFilteredId(1);
      addDlFilteredId(2);
      clearDlFilteredIds();
      expect(getDlFilteredIds()).toHaveLength(0);
    });

    it('getDlVisibleCount returns filteredIds size', () => {
      addDlFilteredId(1);
      addDlFilteredId(2);
      expect(getDlVisibleCount()).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SELECTED ID
  // ══════════════════════════════════════════════════════════════════════

  describe('selected ID', () => {
    it('getDlSelectedId returns null by default', () => {
      expect(getDlSelectedId()).toBeNull();
    });

    it('setDlSelectedId sets value', () => {
      setDlSelectedId(42);
      expect(getDlSelectedId()).toBe(42);
    });

    it('setDlSelectedId(null) clears selection', () => {
      setDlSelectedId(42);
      setDlSelectedId(null);
      expect(getDlSelectedId()).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // PAUSE STATE
  // ══════════════════════════════════════════════════════════════════════

  describe('pause state', () => {
    it('getDlIsPaused returns false by default', () => {
      expect(getDlIsPaused()).toBe(false);
    });

    it('setDlIsPaused(true) pauses', () => {
      setDlIsPaused(true);
      expect(getDlIsPaused()).toBe(true);
    });

    it('setDlIsPaused(false) unpauses', () => {
      setDlIsPaused(true);
      setDlIsPaused(false);
      expect(getDlIsPaused()).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SOURCES
  // ══════════════════════════════════════════════════════════════════════

  describe('sources', () => {
    it('addDlSource adds to sources set', () => {
      addDlSource('gtm');
      addDlSource('segment');
      expect(getDlSources()).toContain('gtm');
      expect(getDlSources()).toContain('segment');
    });

    it('getDlSources returns all added sources', () => {
      addDlSource('gtm');
      addDlSource('tealium');
      addDlSource('adobe');
      const sources = getDlSources();
      expect(sources.size).toBe(3);
    });

    it('getDlEventNames returns sorted by count desc', () => {
      addDlPush(mockPush(1, { event: 'page_view' }));
      addDlPush(mockPush(2, { event: 'page_view' }));
      addDlPush(mockPush(3, { event: 'page_view' }));
      addDlPush(mockPush(4, { event: 'click' }));
      addDlPush(mockPush(5, { event: 'click' }));
      addDlPush(mockPush(6, { event: 'form' }));
      const names = getDlEventNames();
      expect(names[0]).toEqual(['page_view', 3]);
      expect(names[1]).toEqual(['click', 2]);
      expect(names[2]).toEqual(['form', 1]);
    });

    it('getDlEventNames ignores pushes without event', () => {
      addDlPush(mockPush(1, { page: '/home' }));
      addDlPush(mockPush(2, { event: 'page_view' }));
      const names = getDlEventNames();
      expect(names).toHaveLength(1);
      expect(names[0][0]).toBe('page_view');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // FILTER STATE
  // ══════════════════════════════════════════════════════════════════════

  describe('filter state', () => {
    it('setDlFilterText / getDlFilterText', () => {
      setDlFilterText('search term');
      expect(getDlFilterText()).toBe('search term');
    });

    it('setDlFilterSource / getDlFilterSource', () => {
      setDlFilterSource('gtm');
      expect(getDlFilterSource()).toBe('gtm');
      setDlFilterSource('');
      expect(getDlFilterSource()).toBe('');
    });

    it('setDlFilterEventName / getDlFilterEventName', () => {
      setDlFilterEventName('page_view');
      expect(getDlFilterEventName()).toBe('page_view');
    });

    it('setDlFilterHasKey / getDlFilterHasKey', () => {
      setDlFilterHasKey('ecommerce');
      expect(getDlFilterHasKey()).toBe('ecommerce');
    });

    it('setDlEcommerceOnly / getDlEcommerceOnly', () => {
      setDlEcommerceOnly(true);
      expect(getDlEcommerceOnly()).toBe(true);
      setDlEcommerceOnly(false);
      expect(getDlEcommerceOnly()).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════════════════════════════════

  describe('stats', () => {
    it('getDlTotalCount returns push count only', () => {
      addDlPush(mockPush(1));
      addDlPush(mockNavMarker(2));
      addDlPush(mockPush(3));
      expect(getDlTotalCount()).toBe(2);
    });

    it('getDlTotalCount is 0 when empty', () => {
      expect(getDlTotalCount()).toBe(0);
    });

    it('getDlVisibleCount returns filteredIds size', () => {
      addDlFilteredId(1);
      addDlFilteredId(2);
      expect(getDlVisibleCount()).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // CUMULATIVE STATE
  // ══════════════════════════════════════════════════════════════════════

  describe('computeCumulativeState', () => {
    it('computeCumulativeState(0) returns first push data', () => {
      addDlPush(mockPush(1, { a: 1 }));
      const result = computeCumulativeState(0);
      expect(result).toEqual({ a: 1 });
    });

    it('computeCumulativeState(n) returns merged data up to index', () => {
      addDlPush(mockPush(1, { a: 1 }));
      addDlPush(mockPush(2, { b: 2 }));
      addDlPush(mockPush(3, { c: 3 }));
      const result = computeCumulativeState(2);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('cache hit on second call returns same result', () => {
      addDlPush(mockPush(1, { a: 1 }));
      addDlPush(mockPush(2, { b: 2 }));
      const first = computeCumulativeState(1);
      const second = computeCumulativeState(1);
      expect(first).toEqual(second);
      expect(first).not.toBe(second); // different object (spread clone)
    });

    it('later entries overwrite earlier keys', () => {
      addDlPush(mockPush(1, { value: 'first' }));
      addDlPush(mockPush(2, { value: 'second' }));
      const result = computeCumulativeState(1);
      expect(result).toEqual({ value: 'second' });
    });

    it('returns empty object for out-of-bounds index', () => {
      addDlPush(mockPush(1, { a: 1 }));
      expect(computeCumulativeState(-1)).toEqual({});
      expect(computeCumulativeState(99)).toEqual({});
    });

    it('nav markers do not contribute data', () => {
      addDlPush(mockPush(1, { a: 1 }));
      addDlPush(mockNavMarker(2));
      addDlPush(mockPush(3, { b: 2 }));
      const result = computeCumulativeState(2);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('uses pre-computed cumulativeState when available', () => {
      const precomputed = { x: 100, y: 200 };
      addDlPush(mockPush(1, { a: 1 }, { cumulativeState: precomputed }));
      const result = computeCumulativeState(0);
      expect(result).toEqual({ x: 100, y: 200 });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // WATCH PATHS
  // ══════════════════════════════════════════════════════════════════════

  describe('watched paths', () => {
    it('addWatchedPath adds path', () => {
      const added = addWatchedPath('ecommerce.items');
      expect(added).toBe(true);
      expect(getWatchedPaths()).toContain('ecommerce.items');
    });

    it('addWatchedPath returns false for duplicate', () => {
      addWatchedPath('ecommerce.items');
      const added = addWatchedPath('ecommerce.items');
      expect(added).toBe(false);
      expect(getWatchedPaths()).toHaveLength(1);
    });

    it('addWatchedPath returns false when max reached (10)', () => {
      for (let i = 0; i < 10; i++) {
        addWatchedPath(`path${i}`);
      }
      const added = addWatchedPath('extra');
      expect(added).toBe(false);
      expect(getWatchedPaths()).toHaveLength(10);
    });

    it('removeWatchedPath removes path', () => {
      addWatchedPath('path1');
      addWatchedPath('path2');
      removeWatchedPath('path1');
      expect(getWatchedPaths()).not.toContain('path1');
      expect(getWatchedPaths()).toContain('path2');
    });

    it('clearWatchedPaths clears all', () => {
      addWatchedPath('path1');
      addWatchedPath('path2');
      clearWatchedPaths();
      expect(getWatchedPaths()).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════════════════════

  describe('validation', () => {
    it('getValidationErrors returns empty by default', () => {
      expect(getValidationErrors(1)).toEqual([]);
    });

    it('setValidationErrors / getValidationErrors', () => {
      const errors: ValidationResult[] = [
        { path: 'event', message: 'required', severity: 'error' },
      ];
      setValidationErrors(1, errors);
      expect(getValidationErrors(1)).toEqual(errors);
    });

    it('setValidationErrors overwrites previous errors', () => {
      setValidationErrors(1, [{ path: 'a', message: 'err', severity: 'error' }]);
      setValidationErrors(1, [{ path: 'b', message: 'warn', severity: 'warn' }]);
      expect(getValidationErrors(1)).toHaveLength(1);
      expect(getValidationErrors(1)[0].path).toBe('b');
    });

    it('clearValidationErrors clears all', () => {
      setValidationErrors(1, [{ path: 'a', message: 'err', severity: 'error' }]);
      setValidationErrors(2, [{ path: 'b', message: 'err', severity: 'error' }]);
      clearValidationErrors();
      expect(getValidationErrors(1)).toEqual([]);
      expect(getValidationErrors(2)).toEqual([]);
    });

    it('getValidationRules returns empty by default', () => {
      expect(getValidationRules()).toEqual([]);
    });

    it('setValidationRules / getValidationRules', () => {
      const rules: ValidationRule[] = [
        { path: 'event', type: 'required', message: 'required', severity: 'error' },
      ];
      setValidationRules(rules);
      expect(getValidationRules()).toEqual(rules);
    });

    it('isValidationLoaded returns false by default', () => {
      expect(isValidationLoaded()).toBe(false);
    });

    it('setValidationLoaded / isValidationLoaded', () => {
      setValidationLoaded(true);
      expect(isValidationLoaded()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SORT STATE
  // ══════════════════════════════════════════════════════════════════════

  describe('sort state', () => {
    it('getDlSortField returns default time', () => {
      expect(getDlSortField()).toBe('time');
    });

    it('setDlSortField updates value and calls updateConfigImmediate', () => {
      setDlSortField('source');
      expect(getDlSortField()).toBe('source');
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlSortField', 'source');
    });

    it('getDlSortOrder returns default asc', () => {
      expect(getDlSortOrder()).toBe('asc');
    });

    it('setDlSortOrder updates value and calls updateConfigImmediate', () => {
      setDlSortOrder('desc');
      expect(getDlSortOrder()).toBe('desc');
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlSortOrder', 'desc');
    });

    it('toggleDlSortOrder toggles asc → desc (starts from default asc)', () => {
      // Module initializes with asc; this tests a fresh toggle
      expect(toggleDlSortOrder()).toBe('desc');
      expect(getDlSortOrder()).toBe('desc');
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlSortOrder', 'desc');
    });

    it('toggleDlSortOrder toggles desc → asc', () => {
      // Manually set to desc first, then toggle
      setDlSortOrder('desc');
      mockUpdateConfigImmediate.mockClear();
      expect(toggleDlSortOrder()).toBe('asc');
      expect(getDlSortOrder()).toBe('asc');
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlSortOrder', 'asc');
    });

    it('initDlSortState reads from config', () => {
      mockGetConfig.mockReturnValue({
        ...mockGetConfig(),
        dlSortField: 'keycount',
        dlSortOrder: 'desc',
        dlGroupBySource: true,
      });
      initDlSortState();
      expect(getDlSortField()).toBe('keycount');
      expect(getDlSortOrder()).toBe('desc');
      expect(getDlGroupBySource()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUP BY SOURCE
  // ══════════════════════════════════════════════════════════════════════

  describe('group by source', () => {
    it('getDlGroupBySource returns false by default', () => {
      expect(getDlGroupBySource()).toBe(false);
    });

    it('setDlGroupBySource updates value and calls updateConfigImmediate', () => {
      setDlGroupBySource(true);
      expect(getDlGroupBySource()).toBe(true);
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlGroupBySource', true);
    });

    it('setDlGroupBySource(false) calls updateConfigImmediate', () => {
      setDlGroupBySource(true);
      mockUpdateConfigImmediate.mockClear();
      setDlGroupBySource(false);
      expect(getDlGroupBySource()).toBe(false);
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('dlGroupBySource', false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // BATCHING
  // ══════════════════════════════════════════════════════════════════════

  describe('batching', () => {
    it('addDlPendingPush adds item', () => {
      const push = mockPush(1);
      addDlPendingPush({ push, isVisible: true });
      expect(getDlPendingPushes()).toHaveLength(1);
    });

    it('getDlPendingPushes returns all pending', () => {
      addDlPendingPush({ push: mockPush(1), isVisible: true });
      addDlPendingPush({ push: mockPush(2), isVisible: false });
      expect(getDlPendingPushes()).toHaveLength(2);
    });

    it('clearDlPendingPushes clears queue', () => {
      addDlPendingPush({ push: mockPush(1), isVisible: true });
      clearDlPendingPushes();
      expect(getDlPendingPushes()).toHaveLength(0);
    });

    it('getDlRafId returns null by default', () => {
      expect(getDlRafId()).toBeNull();
    });

    it('setDlRafId sets value', () => {
      setDlRafId(42);
      expect(getDlRafId()).toBe(42);
    });

    it('setDlRafId(null) clears value', () => {
      setDlRafId(42);
      setDlRafId(null);
      expect(getDlRafId()).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // CORRELATION CONFIG
  // ══════════════════════════════════════════════════════════════════════

  describe('correlation config', () => {
    it('getCorrelationWindow returns config value', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), correlationWindowMs: 5000 });
      expect(getCorrelationWindow()).toBe(5000);
    });

    it('getCorrelationWindow falls back to 2000 when not set', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), correlationWindowMs: undefined as unknown as number });
      expect(getCorrelationWindow()).toBe(2000);
    });

    it('setCorrelationWindow calls updateConfigImmediate', () => {
      setCorrelationWindow(3000);
      expect(mockUpdateConfigImmediate).toHaveBeenCalledWith('correlationWindowMs', 3000);
    });

    it('getCorrelationLookback returns hardcoded 500', () => {
      expect(getCorrelationLookback()).toBe(500);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // INTEGRATION — prune cleans validation errors
  // ══════════════════════════════════════════════════════════════════════

  describe('prune cleans validation errors', () => {
    it('pruned pushes have validation errors removed', () => {
      mockGetConfig.mockReturnValue({ ...mockGetConfig(), maxDlPushes: 5 });
      for (let i = 1; i <= 10; i++) {
        addDlPush(mockPush(i, { event: `e${i}` }));
      }
      // Final state: pushes 7,8,9,10 remain (4 entries)
      expect(getAllDlEntries()).toHaveLength(4);
      // Pruned pushes (1-6) have errors removed
      expect(getValidationErrors(1)).toEqual([]); // pruned
      expect(getValidationErrors(6)).toEqual([]); // pruned
      // Kept pushes (7-10) have no errors yet
      expect(getValidationErrors(7)).toEqual([]);
      expect(getValidationErrors(10)).toEqual([]);
      // Can set errors on kept push
      setValidationErrors(7, [{ path: 'event', message: 'err', severity: 'error' }]);
      expect(getValidationErrors(7)).toHaveLength(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // PUSH-ONLY CACHE (getAllDlPushes)
  // ══════════════════════════════════════════════════════════════════════

  describe('push-only cache', () => {
    it('getAllDlPushes returns cached result on second call', () => {
      addDlPush(mockPush(1));
      addDlPush(mockPush(2));
      const first = getAllDlPushes();
      const second = getAllDlPushes();
      expect(first).toBe(second); // same reference
    });

    it('getAllDlPushes cache invalidated after clear', () => {
      addDlPush(mockPush(1));
      const first = getAllDlPushes();
      clearDlPushes();
      const second = getAllDlPushes();
      expect(first).not.toBe(second);
      expect(second).toHaveLength(0);
    });

    it('getAllDlPushes cache invalidated after add', () => {
      addDlPush(mockPush(1));
      const first = getAllDlPushes();
      addDlPush(mockPush(2));
      const second = getAllDlPushes();
      expect(first).not.toBe(second);
      expect(second).toHaveLength(2);
    });
  });
});