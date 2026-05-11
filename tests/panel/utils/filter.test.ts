// ─── FILTER UTILITIES TESTS ─────────────────────────────────────────────────

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ParsedRequest } from '@/types/request';

// Use vi.hoisted so the mock object is available when vi.mock is hoisted
const { mockState, resetStateMocks } = vi.hoisted(() => {
  const mockState = {
    getFilterText: vi.fn(() => ''),
    getFilterEventType: vi.fn(() => ''),
    getFilterUserId: vi.fn(() => ''),
    getFilterStatus: vi.fn(() => ''),
    getFilterMethod: vi.fn(() => ''),
    getFilterHasParam: vi.fn(() => ''),
    getFilteredIds: vi.fn(() => new Set<string>()),
    getAllRequests: vi.fn(() => [] as ParsedRequest[]),
    getHiddenProviders: vi.fn(() => new Set<string>()),
    updateStats: vi.fn(),
  };

  function resetStateMocks(): void {
    mockState.getFilterText.mockReturnValue('');
    mockState.getFilterEventType.mockReturnValue('');
    mockState.getFilterUserId.mockReturnValue('');
    mockState.getFilterStatus.mockReturnValue('');
    mockState.getFilterMethod.mockReturnValue('');
    mockState.getFilterHasParam.mockReturnValue('');
    mockState.getFilteredIds.mockReturnValue(new Set<string>());
    mockState.getAllRequests.mockReturnValue([]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());
    mockState.updateStats.mockClear();
  }

  return { mockState, resetStateMocks };
});

vi.mock('@/panel/state', () => mockState);

// Import after mocking
import { matchesFilter, applyFilters } from '@/panel/utils/filter';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function mockRequest(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    id: 1,
    provider: 'GA4',
    color: '#e37400',
    url: 'https://analytics.google.com/g/collect?v=2&en=page_view',
    method: 'GET' as const,
    status: 200,
    timestamp: '2024-01-01T00:00:00.000Z',
    duration: 100,
    size: 500,
    allParams: { v: '2', en: 'page_view' },
    decoded: { v: '2', en: 'page_view' },
    postBody: null,
    ...overrides,
  } as ParsedRequest;
}

// ─── matchesFilter TESTS ─────────────────────────────────────────────────────

describe('matchesFilter()', () => {
  beforeEach(() => {
    resetStateMocks();
  });

  // ── No filters ───────────────────────────────────────────────────────────

  it('returns true when no filters are active', () => {
    const req = mockRequest();
    expect(matchesFilter(req)).toBe(true);
  });

  // ── Text filter ───────────────────────────────────────────────────────────

  it('matches URL text in text filter', () => {
    mockState.getFilterText.mockReturnValue('google');
    const req = mockRequest({ url: 'https://analytics.google.com/collect' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches provider name in text filter', () => {
    mockState.getFilterText.mockReturnValue('GA4');
    const req = mockRequest({ provider: 'GA4' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches param key in text filter', () => {
    mockState.getFilterText.mockReturnValue('en');
    const req = mockRequest({ allParams: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches param value in text filter', () => {
    mockState.getFilterText.mockReturnValue('page_view');
    const req = mockRequest({ decoded: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches regex pattern with /pattern/flags syntax', () => {
    mockState.getFilterText.mockReturnValue('/google.*analytics/i');
    const req = mockRequest({ url: 'https://www.google.com/analytics' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('falls back to plain text when regex is invalid', () => {
    mockState.getFilterText.mockReturnValue('/[invalid/');
    const req = mockRequest({ url: 'contains /[invalid/ text' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('is case-insensitive in text filter', () => {
    mockState.getFilterText.mockReturnValue('GOOGLE');
    const req = mockRequest({ url: 'https://www.google.com/' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('returns false when text filter does not match', () => {
    mockState.getFilterText.mockReturnValue('nomatch');
    const req = mockRequest({ url: 'https://example.com/' });
    expect(matchesFilter(req)).toBe(false);
  });

  // ── Event type filter ─────────────────────────────────────────────────────

  it('matches "page_view" filter to event name containing "page"', () => {
    mockState.getFilterEventType.mockReturnValue('page_view');
    const req = mockRequest({ decoded: { event: 'page_view' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches "page_view" filter to event name containing "pageview"', () => {
    mockState.getFilterEventType.mockReturnValue('page_view');
    const req = mockRequest({ decoded: { event: 'pageview' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches "purchase" filter to event name containing "purchase"', () => {
    mockState.getFilterEventType.mockReturnValue('purchase');
    const req = mockRequest({ decoded: { event: 'purchase' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches "purchase" filter to event name containing "transaction"', () => {
    mockState.getFilterEventType.mockReturnValue('purchase');
    const req = mockRequest({ decoded: { event: 'transaction' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('excludes page/purchase events when eventType is "custom"', () => {
    mockState.getFilterEventType.mockReturnValue('custom');
    const req = mockRequest({ decoded: { event: 'page_view' } });
    expect(matchesFilter(req)).toBe(false);
  });

  it('matches custom event when eventType is "custom"', () => {
    mockState.getFilterEventType.mockReturnValue('custom');
    const req = mockRequest({ decoded: { event: 'custom_click' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('uses exact: prefix for strict event name matching', () => {
    mockState.getFilterEventType.mockReturnValue('exact:page_view');
    const req1 = mockRequest({ decoded: { event: 'page_view' } });
    const req2 = mockRequest({ decoded: { event: 'pageview' } });
    expect(matchesFilter(req1)).toBe(true);
    expect(matchesFilter(req2)).toBe(false);
  });

  it('uses pre-computed _eventName when available', () => {
    mockState.getFilterEventType.mockReturnValue('page_view');
    const req = mockRequest({ _eventName: 'page_view' });
    expect(matchesFilter(req)).toBe(true);
  });

  // ── User ID filter ────────────────────────────────────────────────────────

  it('matches userId "has" when uid param exists', () => {
    mockState.getFilterUserId.mockReturnValue('has');
    const req = mockRequest({ decoded: { uid: 'abc123' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches userId "has" when client_id param exists', () => {
    mockState.getFilterUserId.mockReturnValue('has');
    const req = mockRequest({ decoded: { client_id: 'xyz789' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches userId "missing" when no user ID param exists', () => {
    mockState.getFilterUserId.mockReturnValue('missing');
    const req = mockRequest({ decoded: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('returns false for userId "has" when no user ID param', () => {
    mockState.getFilterUserId.mockReturnValue('has');
    const req = mockRequest({ decoded: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(false);
  });

  it('returns false for userId "missing" when user ID param exists', () => {
    mockState.getFilterUserId.mockReturnValue('missing');
    const req = mockRequest({ decoded: { cid: 'client123' } });
    expect(matchesFilter(req)).toBe(false);
  });

  it('uses pre-computed _hasUserId when available', () => {
    mockState.getFilterUserId.mockReturnValue('has');
    const req = mockRequest({ _hasUserId: true });
    expect(matchesFilter(req)).toBe(true);
  });

  it('checks allParams keys for user ID when decoded is empty', () => {
    mockState.getFilterUserId.mockReturnValue('has');
    const req = mockRequest({ decoded: {}, allParams: { user_id: 'u123' } });
    expect(matchesFilter(req)).toBe(true);
  });

  // ── Status filter ─────────────────────────────────────────────────────────

  it('matches status code prefix (2xx)', () => {
    mockState.getFilterStatus.mockReturnValue('2');
    const req = mockRequest({ status: 200 });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches status code prefix (3xx)', () => {
    mockState.getFilterStatus.mockReturnValue('3');
    const req = mockRequest({ status: 302 });
    expect(matchesFilter(req)).toBe(true);
  });

  it('returns false when status prefix does not match', () => {
    mockState.getFilterStatus.mockReturnValue('4');
    const req = mockRequest({ status: 200 });
    expect(matchesFilter(req)).toBe(false);
  });

  it('uses pre-computed _statusPrefix when available', () => {
    mockState.getFilterStatus.mockReturnValue('5');
    const req = mockRequest({ _statusPrefix: '5' });
    expect(matchesFilter(req)).toBe(true);
  });

  // ── Method filter ─────────────────────────────────────────────────────────

  it('matches GET method filter', () => {
    mockState.getFilterMethod.mockReturnValue('GET');
    const req = mockRequest({ method: 'GET' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches POST method filter', () => {
    mockState.getFilterMethod.mockReturnValue('POST');
    const req = mockRequest({ method: 'POST' });
    expect(matchesFilter(req)).toBe(true);
  });

  it('returns false when method does not match', () => {
    mockState.getFilterMethod.mockReturnValue('GET');
    const req = mockRequest({ method: 'POST' });
    expect(matchesFilter(req)).toBe(false);
  });

  // ── HasParam filter ───────────────────────────────────────────────────────

  it('matches hasParam filter by param key (case-insensitive)', () => {
    mockState.getFilterHasParam.mockReturnValue('en');
    const req = mockRequest({ allParams: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(true);
  });

  it('matches hasParam filter across allParams and decoded', () => {
    mockState.getFilterHasParam.mockReturnValue('en');
    const req = mockRequest({ allParams: { en: 'page_view' }, decoded: {} });
    expect(matchesFilter(req)).toBe(true);
  });

  it('returns false when hasParam key is not present', () => {
    mockState.getFilterHasParam.mockReturnValue('nonexistent');
    const req = mockRequest({ allParams: { en: 'page_view' } });
    expect(matchesFilter(req)).toBe(false);
  });

  it('ignores empty string values in hasParam check', () => {
    mockState.getFilterHasParam.mockReturnValue('en');
    const req = mockRequest({ allParams: { en: '' }, decoded: {} });
    expect(matchesFilter(req)).toBe(false);
  });

  // ── Combined filters ──────────────────────────────────────────────────────

  it('requires all combined filters to pass', () => {
    mockState.getFilterText.mockReturnValue('google');
    mockState.getFilterEventType.mockReturnValue('page_view');
    mockState.getFilterMethod.mockReturnValue('GET');

    const req1 = mockRequest({ url: 'https://google.com/', decoded: { event: 'page_view' } });
    const req2 = mockRequest({ url: 'https://google.com/', decoded: { event: 'purchase' } });
    const req3 = mockRequest({ url: 'https://analytics.com/', decoded: { event: 'page_view' } });

    expect(matchesFilter(req1)).toBe(true);
    expect(matchesFilter(req2)).toBe(false);
    expect(matchesFilter(req3)).toBe(false);
  });
});

// ─── applyFilters TESTS ──────────────────────────────────────────────────────

describe('applyFilters()', () => {
  beforeEach(() => {
    resetStateMocks();
  });

  it('shows 0 visible requests when allRequests is empty', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    applyFilters();

    expect(filteredIds.size).toBe(0);
    expect(mockState.updateStats).toHaveBeenCalledWith(0, 0, 0);
  });

  it('makes all requests visible when no filters are active', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, url: 'https://a.com/', size: 100, duration: 10 }),
      mockRequest({ id: 2, url: 'https://b.com/', size: 200, duration: 20 }),
      mockRequest({ id: 3, url: 'https://c.com/', size: 300, duration: 30 }),
    ]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    applyFilters();

    expect(filteredIds.size).toBe(3);
    expect(filteredIds.has('1')).toBe(true);
    expect(filteredIds.has('2')).toBe(true);
    expect(filteredIds.has('3')).toBe(true);
  });

  it('excludes requests from hidden providers', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, provider: 'GA4' }),
      mockRequest({ id: 2, provider: 'Meta' }),
    ]);
    mockState.getHiddenProviders.mockReturnValue(new Set(['Meta']));

    applyFilters();

    expect(filteredIds.size).toBe(1);
    expect(filteredIds.has('1')).toBe(true);
    expect(filteredIds.has('2')).toBe(false);
  });

  it('excludes requests that do not match filters', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, url: 'https://google.com/' }),
      mockRequest({ id: 2, url: 'https://example.com/' }),
    ]);
    mockState.getFilterText.mockReturnValue('google');
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    applyFilters();

    expect(filteredIds.size).toBe(1);
    expect(filteredIds.has('1')).toBe(true);
    expect(filteredIds.has('2')).toBe(false);
  });

  it('computes stats correctly (visibleCount, totalSize, totalDuration)', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, size: 100, duration: 10 }),
      mockRequest({ id: 2, size: 200, duration: 20 }),
      mockRequest({ id: 3, size: 300, duration: 30 }),
    ]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    applyFilters();

    expect(filteredIds.size).toBe(3);
    expect(mockState.updateStats).toHaveBeenCalledWith(3, 600, 60);
  });

  it('calls updateStatusBar callback with correct values', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, size: 100, duration: 10 }),
    ]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    const statusBarCallback = vi.fn();
    applyFilters(undefined, statusBarCallback);

    expect(statusBarCallback).toHaveBeenCalledWith(1, 100, 10);
  });

  it('calls updateRowVisibility callback when provided', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    const rowVisibilityCallback = vi.fn();
    applyFilters(rowVisibilityCallback, undefined);

    expect(rowVisibilityCallback).toHaveBeenCalledTimes(1);
  });

  it('handles requests with missing size and duration gracefully', () => {
    const filteredIds = new Set<string>();
    mockState.getFilteredIds.mockReturnValue(filteredIds);
    mockState.getAllRequests.mockReturnValue([
      mockRequest({ id: 1, size: 0, duration: 0 }),
    ]);
    mockState.getHiddenProviders.mockReturnValue(new Set<string>());

    applyFilters();

    expect(filteredIds.size).toBe(1);
    expect(mockState.updateStats).toHaveBeenCalledWith(1, 0, 0);
  });
});