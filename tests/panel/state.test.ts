// ─── PANEL STATE TESTS ────────────────────────────────────────────────────────
// Unit tests for the centralized panel state management module

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ParsedRequest, PageNavigation, PendingRequest, TabName } from '@/types/request';

// Mock chrome.storage.local before importing state module
const mockStorageLocal = {
  get: vi.fn(() => Promise.resolve({})),
  set: vi.fn(() => Promise.resolve()),
};
vi.stubGlobal('chrome', {
  storage: { local: mockStorageLocal },
});

// Import state module (after global mock is set up)
import {
  addRequest,
  clearRequests,
  hasRequest,
  getRequest,
  deleteRequestById,
  getAllRequests,
  getSelectedId,
  setSelectedId,
  getIsPaused,
  setIsPaused,
  getActiveTab,
  setActiveTab,
  getFilterText,
  setFilterText,
  getFilterEventType,
  setFilterEventType,
  getFilterUserId,
  setFilterUserId,
  getFilterStatus,
  setFilterStatus,
  getFilterMethod,
  setFilterMethod,
  getFilterHasParam,
  setFilterHasParam,
  resetFilters,
  getPageNavigations,
  addPageNavigation,
  clearPageNavigations,
  getActivePageFilter,
  setActivePageFilter,
  getStats,
  resetStats,
  updateStats,
  incrementStats,
  getActiveProviders,
  getHiddenProviders,
  addHiddenProvider,
  removeHiddenProvider,
  isProviderHidden,
  getPendingRequests,
  addFilteredId,
  addPendingRequest,
  clearPendingRequests,
  getRafId,
  setRafId,
  getConfig,
  updateConfig,
  resetConfig,
  syncHiddenProviders,
  getFilteredIds,
} from '@/panel/state';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function mockRequest(id: number, overrides: Record<string, unknown> = {}): ParsedRequest {
  return {
    id,
    provider: 'GA4',
    color: '#e37400',
    url: 'https://example.com',
    method: 'GET',
    status: 200,
    timestamp: '2024-01-01T00:00:00Z',
    duration: 100,
    size: 500,
    allParams: {},
    decoded: {},
    postBody: null,
    ...overrides,
  } as unknown as ParsedRequest;
}

// ─── STATE RESET ─────────────────────────────────────────────────────────────

/**
 * Reset all mutable state between tests to ensure test isolation.
 * Since state.ts uses module-level mutable state that persists across tests,
 * we must explicitly reset it in beforeEach hooks.
 */
function resetAllState(): void {
  clearRequests();
  resetFilters();
  resetStats();
  clearPageNavigations();
  setActivePageFilter(null);
  setSelectedId(null);
  setIsPaused(false);
  setActiveTab('decoded');
  clearPendingRequests();
  setRafId(null);
  // Reset hidden providers
  getHiddenProviders().forEach((name) => removeHiddenProvider(name));
  // Reset config to defaults
  resetConfig();
}

// ─── REQUEST OPERATIONS ───────────────────────────────────────────────────────

describe('Request Operations', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── addRequest ──────────────────────────────────────────────────────────────

  it('adds request to all array and map', () => {
    const req = mockRequest(1);
    addRequest(req);

    expect(getAllRequests()).toHaveLength(1);
    expect(getAllRequests()[0]).toBe(req);
    expect(getRequest('1')).toBe(req);
    expect(getRequest(1)).toBe(req);
  });

  it('adds multiple requests in order', () => {
    const req1 = mockRequest(1, { url: 'https://a.com/' });
    const req2 = mockRequest(2, { url: 'https://b.com/' });
    const req3 = mockRequest(3, { url: 'https://c.com/' });

    addRequest(req1);
    addRequest(req2);
    addRequest(req3);

    expect(getAllRequests()).toHaveLength(3);
    expect(getAllRequests()[0]).toBe(req1);
    expect(getAllRequests()[1]).toBe(req2);
    expect(getAllRequests()[2]).toBe(req3);
  });

  // ── getRequest ──────────────────────────────────────────────────────────────

  it('returns request when found by numeric ID', () => {
    const req = mockRequest(42, { provider: 'Meta' });
    addRequest(req);

    expect(getRequest(42)).toBe(req);
  });

  it('returns request when found by string ID', () => {
    const req = mockRequest(99, { provider: 'GA4' });
    addRequest(req);

    expect(getRequest('99')).toBe(req);
  });

  it('returns undefined for unknown ID', () => {
    expect(getRequest(9999)).toBeUndefined();
  });

  it('returns undefined for null ID', () => {
    expect(getRequest(null)).toBeUndefined();
  });

  // ── hasRequest ─────────────────────────────────────────────────────────────

  it('returns true for existing request', () => {
    const req = mockRequest(1);
    addRequest(req);

    expect(hasRequest(1)).toBe(true);
    expect(hasRequest('1')).toBe(true);
  });

  it('returns false for unknown request', () => {
    expect(hasRequest(12345)).toBe(false);
  });

  it('returns false for null ID', () => {
    expect(hasRequest(null)).toBe(false);
  });

  // ── deleteRequestById ───────────────────────────────────────────────────────

  it('removes request from all, map, and filteredIds', () => {
    const req1 = mockRequest(1);
    const req2 = mockRequest(2);

    addRequest(req1);
    addRequest(req2);

    // Simulate being filtered
    addFilteredId('1');
    addFilteredId('2');

    expect(getFilteredIds().has('1')).toBe(true);
    expect(getFilteredIds().has('2')).toBe(true);

    deleteRequestById(1);

    expect(getAllRequests()).toHaveLength(1);
    expect(getAllRequests()[0]).toBe(req2);
    expect(getRequest(1)).toBeUndefined();
    expect(getFilteredIds().has('1')).toBe(false);
    expect(getFilteredIds().has('2')).toBe(true);
  });

  it('handles deleting non-existent request gracefully', () => {
    const req = mockRequest(1);
    addRequest(req);

    expect(() => deleteRequestById(999)).not.toThrow();
    expect(getAllRequests()).toHaveLength(1);
  });

  // ── getAllRequests ──────────────────────────────────────────────────────────

  it('returns all requests in order', () => {
    const req1 = mockRequest(1);
    const req2 = mockRequest(2);
    const req3 = mockRequest(3);

    addRequest(req1);
    addRequest(req2);
    addRequest(req3);

    const all = getAllRequests();
    expect(all).toHaveLength(3);
    expect(all[0].id).toBe(1);
    expect(all[1].id).toBe(2);
    expect(all[2].id).toBe(3);
  });

  it('returns empty array when no requests', () => {
    expect(getAllRequests()).toEqual([]);
  });

  // ── clearRequests ───────────────────────────────────────────────────────────

  it('clears all requests', () => {
    addRequest(mockRequest(1));
    addRequest(mockRequest(2));

    clearRequests();

    expect(getAllRequests()).toEqual([]);
    expect(getRequest(1)).toBeUndefined();
    expect(getRequest(2)).toBeUndefined();
  });

  it('also clears activeProviders, pageNavigations, and activePageFilter', () => {
    addRequest(mockRequest(1, { provider: 'GA4' }));
    addRequest(mockRequest(2, { provider: 'Meta' }));
    addPageNavigation({
      id: 'nav1',
      url: 'https://example.com',
      timestamp: '2024-01-01T00:00:00Z',
    });
    setActivePageFilter('nav1');

    clearRequests();

    expect(getActiveProviders().size).toBe(0);
    expect(getPageNavigations()).toEqual([]);
    expect(getActivePageFilter()).toBeNull();
  });
});

// ─── UI STATE ─────────────────────────────────────────────────────────────────

describe('UI State', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── selectedId ─────────────────────────────────────────────────────────────

  it('getSelectedId returns null by default', () => {
    expect(getSelectedId()).toBeNull();
  });

  it('setSelectedId sets the selected request ID', () => {
    setSelectedId('42');
    expect(getSelectedId()).toBe('42');
  });

  it('setSelectedId with null deselects', () => {
    setSelectedId('99');
    setSelectedId(null);
    expect(getSelectedId()).toBeNull();
  });

  // ── isPaused ───────────────────────────────────────────────────────────────

  it('getIsPaused returns false by default', () => {
    expect(getIsPaused()).toBe(false);
  });

  it('setIsPaused sets the paused state', () => {
    setIsPaused(true);
    expect(getIsPaused()).toBe(true);
  });

  it('toggle pauses works', () => {
    setIsPaused(!getIsPaused());
    expect(getIsPaused()).toBe(true);
    setIsPaused(!getIsPaused());
    expect(getIsPaused()).toBe(false);
  });

  // ── activeTab ───────────────────────────────────────────────────────────────

  it('getActiveTab returns "decoded" by default', () => {
    expect(getActiveTab()).toBe('decoded');
  });

  it('setActiveTab sets the active tab', () => {
    setActiveTab('query');
    expect(getActiveTab()).toBe('query');
  });

  it('setActiveTab accepts all valid tab names', () => {
    const tabs: TabName[] = ['decoded', 'query', 'post', 'headers', 'response'];

    tabs.forEach((tab) => {
      setActiveTab(tab);
      expect(getActiveTab()).toBe(tab);
    });
  });
});

// ─── FILTER STATE ─────────────────────────────────────────────────────────────

describe('Filter State', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── text filter ─────────────────────────────────────────────────────────────

  it('getFilterText returns empty string by default', () => {
    expect(getFilterText()).toBe('');
  });

  it('setFilterText sets the text filter', () => {
    setFilterText('google analytics');
    expect(getFilterText()).toBe('google analytics');
  });

  // ── eventType filter ────────────────────────────────────────────────────────

  it('getFilterEventType returns empty string by default', () => {
    expect(getFilterEventType()).toBe('');
  });

  it('setFilterEventType sets the event type filter', () => {
    setFilterEventType('page_view');
    expect(getFilterEventType()).toBe('page_view');
  });

  // ── userId filter ────────────────────────────────────────────────────────────

  it('getFilterUserId returns empty string by default', () => {
    expect(getFilterUserId()).toBe('');
  });

  it('setFilterUserId sets the user ID filter', () => {
    setFilterUserId('has');
    expect(getFilterUserId()).toBe('has');
  });

  // ── status filter ──────────────────────────────────────────────────────────

  it('getFilterStatus returns empty string by default', () => {
    expect(getFilterStatus()).toBe('');
  });

  it('setFilterStatus sets the status filter', () => {
    setFilterStatus('2');
    expect(getFilterStatus()).toBe('2');
  });

  // ── method filter ───────────────────────────────────────────────────────────

  it('getFilterMethod returns empty string by default', () => {
    expect(getFilterMethod()).toBe('');
  });

  it('setFilterMethod sets the method filter to GET', () => {
    setFilterMethod('GET');
    expect(getFilterMethod()).toBe('GET');
  });

  it('setFilterMethod sets the method filter to POST', () => {
    setFilterMethod('POST');
    expect(getFilterMethod()).toBe('POST');
  });

  it('setFilterMethod sets the method filter to empty string', () => {
    setFilterMethod('GET');
    setFilterMethod('');
    expect(getFilterMethod()).toBe('');
  });

  // ── hasParam filter ──────────────────────────────────────────────────────────

  it('getFilterHasParam returns empty string by default', () => {
    expect(getFilterHasParam()).toBe('');
  });

  it('setFilterHasParam sets the has param filter', () => {
    setFilterHasParam('en');
    expect(getFilterHasParam()).toBe('en');
  });

  // ── resetFilters ─────────────────────────────────────────────────────────────

  it('resetFilters clears all filter values', () => {
    setFilterText('text search');
    setFilterEventType('purchase');
    setFilterUserId('has');
    setFilterStatus('4');
    setFilterMethod('POST');
    setFilterHasParam('event');

    resetFilters();

    expect(getFilterText()).toBe('');
    expect(getFilterEventType()).toBe('');
    expect(getFilterUserId()).toBe('');
    expect(getFilterStatus()).toBe('');
    expect(getFilterMethod()).toBe('');
    expect(getFilterHasParam()).toBe('');
  });
});

// ─── PAGE NAVIGATION ───────────────────────────────────────────────────────────

describe('Page Navigation', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── addPageNavigation ───────────────────────────────────────────────────────

  it('addPageNavigation adds navigation to list', () => {
    const nav: PageNavigation = {
      id: 'nav1',
      url: 'https://example.com/page1',
      timestamp: '2024-01-01T00:00:00Z',
    };

    addPageNavigation(nav);

    const navs = getPageNavigations();
    expect(navs).toHaveLength(1);
    expect(navs[0]).toBe(nav);
  });

  it('addPageNavigation adds multiple navigations in order', () => {
    const nav1: PageNavigation = {
      id: 'nav1',
      url: 'https://a.com/',
      timestamp: '2024-01-01T00:00:00Z',
    };
    const nav2: PageNavigation = {
      id: 'nav2',
      url: 'https://b.com/',
      timestamp: '2024-01-01T00:01:00Z',
    };

    addPageNavigation(nav1);
    addPageNavigation(nav2);

    const navs = getPageNavigations();
    expect(navs).toHaveLength(2);
    expect(navs[0].id).toBe('nav1');
    expect(navs[1].id).toBe('nav2');
  });

  // ── getPageNavigations ──────────────────────────────────────────────────────

  it('getPageNavigations returns empty array when empty', () => {
    expect(getPageNavigations()).toEqual([]);
  });

  // ── clearPageNavigations ────────────────────────────────────────────────────

  it('clearPageNavigations empties the list', () => {
    addPageNavigation({ id: 'nav1', url: 'https://a.com/', timestamp: '2024-01-01T00:00:00Z' });
    addPageNavigation({ id: 'nav2', url: 'https://b.com/', timestamp: '2024-01-01T00:01:00Z' });

    clearPageNavigations();

    expect(getPageNavigations()).toEqual([]);
  });

  // ── activePageFilter ────────────────────────────────────────────────────────

  it('getActivePageFilter returns null by default', () => {
    expect(getActivePageFilter()).toBeNull();
  });

  it('setActivePageFilter sets the active page filter', () => {
    setActivePageFilter('nav42');
    expect(getActivePageFilter()).toBe('nav42');
  });

  it('setActivePageFilter with null clears the filter', () => {
    setActivePageFilter('nav99');
    setActivePageFilter(null);
    expect(getActivePageFilter()).toBeNull();
  });
});

// ─── STATS ───────────────────────────────────────────────────────────────────────

describe('Stats', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── getStats ────────────────────────────────────────────────────────────────

  it('getStats returns zeros by default', () => {
    const stats = getStats();
    expect(stats.visibleCount).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });

  it('getStats returns a copy, not the original', () => {
    const stats1 = getStats();
    stats1.visibleCount = 999;
    const stats2 = getStats();
    expect(stats2.visibleCount).toBe(0);
  });

  // ── updateStats ─────────────────────────────────────────────────────────────

  it('updateStats replaces all stats values', () => {
    updateStats(10, 5000, 1500);

    const stats = getStats();
    expect(stats.visibleCount).toBe(10);
    expect(stats.totalSize).toBe(5000);
    expect(stats.totalDuration).toBe(1500);
  });

  // ── incrementStats ──────────────────────────────────────────────────────────

  it('incrementStats increments count by 1 and adds size/duration', () => {
    incrementStats(100, 50);
    incrementStats(200, 75);

    const stats = getStats();
    expect(stats.visibleCount).toBe(2);
    expect(stats.totalSize).toBe(300);
    expect(stats.totalDuration).toBe(125);
  });

  it('incrementStats handles zero values gracefully', () => {
    incrementStats(0, 0);
    incrementStats(0, 0);

    const stats = getStats();
    expect(stats.visibleCount).toBe(2);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });

  // ── resetStats ──────────────────────────────────────────────────────────────

  it('resetStats resets all stats to zero', () => {
    updateStats(10, 5000, 1500);
    incrementStats(100, 50);

    resetStats();

    const stats = getStats();
    expect(stats.visibleCount).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });
});

// ─── PROVIDER STATE ───────────────────────────────────────────────────────────

describe('Provider State', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── getActiveProviders ──────────────────────────────────────────────────────

  it('getActiveProviders returns empty Set by default', () => {
    expect(getActiveProviders().size).toBe(0);
  });

  // Note: activeProviders is populated internally by addRequest tracking
  // This test verifies the getter returns the Set reference
  it('getActiveProviders returns a Set (can add/remove)', () => {
    const providers = getActiveProviders();
    providers.add('GA4');
    expect(providers.has('GA4')).toBe(true);
  });

  // ── getHiddenProviders ───────────────────────────────────────────────────────

  it('getHiddenProviders returns empty Set by default', () => {
    expect(getHiddenProviders().size).toBe(0);
  });

  // ── addHiddenProvider / removeHiddenProvider ────────────────────────────────

  it('addHiddenProvider adds provider to hidden set', () => {
    addHiddenProvider('GA4');
    expect(isProviderHidden('GA4')).toBe(true);
  });

  it('addHiddenProvider adds multiple providers', () => {
    addHiddenProvider('GA4');
    addHiddenProvider('Meta');

    expect(isProviderHidden('GA4')).toBe(true);
    expect(isProviderHidden('Meta')).toBe(true);
  });

  it('removeHiddenProvider removes provider from hidden set', () => {
    addHiddenProvider('GA4');
    addHiddenProvider('Meta');

    removeHiddenProvider('GA4');

    expect(isProviderHidden('GA4')).toBe(false);
    expect(isProviderHidden('Meta')).toBe(true);
  });

  it('removeHiddenProvider handles non-existent provider gracefully', () => {
    expect(() => removeHiddenProvider('NonExistent')).not.toThrow();
  });

  // ── isProviderHidden ───────────────────────────────────────────────────────

  it('isProviderHidden returns false for non-hidden provider', () => {
    expect(isProviderHidden('GA4')).toBe(false);
  });

  it('isProviderHidden returns true for hidden provider', () => {
    addHiddenProvider('GA4');
    expect(isProviderHidden('GA4')).toBe(true);
  });
});

// ─── BATCHING ─────────────────────────────────────────────────────────────────

describe('Batching', () => {
  beforeEach(() => {
    resetAllState();
  });

  // ── getPendingRequests / addPendingRequest ─────────────────────────────────

  it('addPendingRequest adds item to pending queue', () => {
    const item: PendingRequest = {
      data: mockRequest(1),
      isVisible: true,
    };

    addPendingRequest(item);

    const pending = getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toBe(item);
  });

  it('addPendingRequest adds multiple items in order', () => {
    const item1: PendingRequest = { data: mockRequest(1), isVisible: true };
    const item2: PendingRequest = { data: mockRequest(2), isVisible: false };

    addPendingRequest(item1);
    addPendingRequest(item2);

    const pending = getPendingRequests();
    expect(pending).toHaveLength(2);
    expect(pending[0].data.id).toBe(1);
    expect(pending[1].data.id).toBe(2);
  });

  // ── clearPendingRequests ────────────────────────────────────────────────────

  it('clearPendingRequests empties the queue', () => {
    addPendingRequest({ data: mockRequest(1), isVisible: true });
    addPendingRequest({ data: mockRequest(2), isVisible: false });

    clearPendingRequests();

    expect(getPendingRequests()).toEqual([]);
  });

  // ── rafId ─────────────────────────────────────────────────────────────────

  it('getRafId returns null by default', () => {
    expect(getRafId()).toBeNull();
  });

  it('setRafId sets the rafId', () => {
    setRafId(12345);
    expect(getRafId()).toBe(12345);
  });

  it('setRafId with null clears the rafId', () => {
    setRafId(999);
    setRafId(null);
    expect(getRafId()).toBeNull();
  });
});

// ─── CONFIG ────────────────────────────────────────────────────────────────────

describe('Config', () => {
  beforeEach(() => {
    resetAllState();
    mockStorageLocal.set.mockClear();
  });

  // ── getConfig ───────────────────────────────────────────────────────────────

  it('getConfig returns config object with defaults', () => {
    const config = getConfig();
    expect(config.maxRequests).toBe(500);
    expect(config.autoPrune).toBe(true);
    expect(config.pruneRatio).toBe(0.75);
    expect(config.sortOrder).toBe('asc');
    expect(config.wrapValues).toBe(false);
    expect(config.autoExpand).toBe(false);
    expect(config.collapsedGroups).toEqual([]);
    expect(config.hiddenProviders).toEqual([]);
    expect(config.defaultTab).toBe('decoded');
    expect(config.compactRows).toBe(false);
    expect(config.showEmptyParams).toBe(false);
    expect(config.timestampFormat).toBe('absolute');
    expect(config.exportFormat).toBe('json');
    expect(config.dlSortField).toBe('time');
    expect(config.dlSortOrder).toBe('asc');
    expect(config.dlGroupBySource).toBe(false);
    expect(config.maxDlPushes).toBe(1000);
    expect(config.correlationWindowMs).toBe(2000);
    expect(config.sectionAccentBar).toBe(true);
    expect(config.sectionDimOthers).toBe(true);
    expect(config.sectionDimOpacity).toBe(0.5);
  });

  it('getConfig returns a copy, not the original', () => {
    const config1 = getConfig();
    config1.maxRequests = 999;
    const config2 = getConfig();
    expect(config2.maxRequests).toBe(500);
  });

  // ── updateConfig ───────────────────────────────────────────────────────────

  it('updateConfig updates a single config value', () => {
    updateConfig('maxRequests', 1000);
    expect(getConfig().maxRequests).toBe(1000);
  });

  it('updateConfig updates multiple config values', () => {
    updateConfig('autoPrune', false);
    updateConfig('sortOrder', 'desc');
    updateConfig('wrapValues', true);

    const config = getConfig();
    expect(config.autoPrune).toBe(false);
    expect(config.sortOrder).toBe('desc');
    expect(config.wrapValues).toBe(true);
  });

  it('updateConfig schedules save to chrome.storage.local', () => {
    vi.useFakeTimers();
    updateConfig('maxRequests', 2000);
    vi.advanceTimersByTime(400); // Wait for debounce
    expect(mockStorageLocal.set).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ── resetConfig ────────────────────────────────────────────────────────────

  it('resetConfig restores all defaults', () => {
    updateConfig('maxRequests', 999);
    updateConfig('autoPrune', false);
    updateConfig('sortOrder', 'desc');

    resetConfig();

    const config = getConfig();
    expect(config.maxRequests).toBe(500);
    expect(config.autoPrune).toBe(true);
    expect(config.sortOrder).toBe('asc');
  });

  // ── syncHiddenProviders ────────────────────────────────────────────────────

  it('syncHiddenProviders saves hidden providers to config', () => {
    addHiddenProvider('GA4');
    addHiddenProvider('Meta');

    syncHiddenProviders();

    expect(getConfig().hiddenProviders).toContain('GA4');
    expect(getConfig().hiddenProviders).toContain('Meta');
  });

  it('syncHiddenProviders with empty hidden set clears config', () => {
    addHiddenProvider('GA4');
    syncHiddenProviders();
    expect(getConfig().hiddenProviders).toContain('GA4');

    // Manually clear for this test
    getHiddenProviders().clear();
    syncHiddenProviders();
    expect(getConfig().hiddenProviders).toEqual([]);
  });
});

// ─── INTEGRATION ──────────────────────────────────────────────────────────────

describe('Integration', () => {
  beforeEach(() => {
    resetAllState();
  });

  it('full workflow: add requests, filter, select, check stats', () => {
    // Add requests
    const req1 = mockRequest(1, { provider: 'GA4', size: 100, duration: 10 });
    const req2 = mockRequest(2, { provider: 'Meta', size: 200, duration: 20 });
    const req3 = mockRequest(3, { provider: 'GA4', size: 300, duration: 30 });

    addRequest(req1);
    addRequest(req2);
    addRequest(req3);

    expect(getAllRequests()).toHaveLength(3);
    expect(hasRequest(1)).toBe(true);
    expect(hasRequest(2)).toBe(true);
    expect(hasRequest(3)).toBe(true);

    // Select one
    setSelectedId('2');
    expect(getSelectedId()).toBe('2');

    // Check stats
    const stats = getStats();
    expect(stats.visibleCount).toBe(0); // Not filtered yet

    // Hide a provider
    addHiddenProvider('Meta');

    // Increment stats manually
    incrementStats(req1.size, req1.duration);
    incrementStats(req3.size, req3.duration);

    const statsAfter = getStats();
    expect(statsAfter.visibleCount).toBe(2);
    expect(statsAfter.totalSize).toBe(400);
    expect(statsAfter.totalDuration).toBe(40);

    // Clear all
    clearRequests();

    expect(getAllRequests()).toHaveLength(0);
    expect(getActiveProviders().size).toBe(0);
    // Note: clearRequests() does NOT clear selectedId - only requests and related state
    // If we want to clear selection, we must do it explicitly
    setSelectedId(null);
    expect(getSelectedId()).toBeNull();
  });

  it('resetFilters clears all filters without affecting requests', () => {
    addRequest(mockRequest(1));
    addRequest(mockRequest(2));

    setFilterText('test');
    setFilterEventType('page_view');
    setFilterMethod('GET');
    setFilterUserId('has');

    resetFilters();

    expect(getFilterText()).toBe('');
    expect(getFilterEventType()).toBe('');
    expect(getFilterMethod()).toBe('');
    expect(getFilterUserId()).toBe('');
    expect(getAllRequests()).toHaveLength(2); // Requests still there
  });

  it('page navigation workflow', () => {
    const nav1: PageNavigation = {
      id: 'nav1',
      url: 'https://example.com/',
      timestamp: '2024-01-01T00:00:00Z',
    };
    const nav2: PageNavigation = {
      id: 'nav2',
      url: 'https://example.com/other',
      timestamp: '2024-01-01T00:01:00Z',
    };

    addPageNavigation(nav1);
    addPageNavigation(nav2);

    expect(getPageNavigations()).toHaveLength(2);

    setActivePageFilter('nav1');
    expect(getActivePageFilter()).toBe('nav1');

    clearPageNavigations();
    expect(getPageNavigations()).toHaveLength(0);
    // Note: clearPageNavigations() does NOT clear activePageFilter
    // Only clearRequests() clears activePageFilter
    expect(getActivePageFilter()).toBe('nav1'); // Still set
  });

  it('config updates survive across multiple operations', () => {
    updateConfig('maxRequests', 1000);
    updateConfig('autoPrune', false);
    updateConfig('hiddenProviders', ['GA4']);

    expect(getConfig().maxRequests).toBe(1000);
    expect(getConfig().autoPrune).toBe(false);
    expect(getConfig().hiddenProviders).toContain('GA4');

    updateConfig('maxRequests', 2000);
    expect(getConfig().maxRequests).toBe(2000);

    resetConfig();
    expect(getConfig().maxRequests).toBe(500);
    expect(getConfig().autoPrune).toBe(true);
    expect(getConfig().hiddenProviders).toEqual([]);
  });
});
