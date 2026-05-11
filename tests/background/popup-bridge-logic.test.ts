// ─── POPUP BRIDGE LOGIC TESTS ─────────────────────────────────────────────────
// Unit tests for the pure-logic functions in popup-bridge.ts:
// createEmptyStats, accumulateStatsUpdate, buildPopupResponse

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── MOCK DEPENDENCIES ────────────────────────────────────────────────────────
// popup-bridge.ts imports devToolsPorts from './index' and updateBadgeForTab from './badge'.
// We must mock these at module level before importing the module under test.

const { mockDevToolsPorts } = vi.hoisted(() => ({
  mockDevToolsPorts: new Map<number, chrome.runtime.Port>(),
}));

vi.mock('@/background/index', () => ({
  devToolsPorts: mockDevToolsPorts,
}));

vi.mock('@/background/badge', () => ({
  initBadge: vi.fn(),
  updateBadgeForTab: vi.fn(),
}));

// ─── CHROME STUB ──────────────────────────────────────────────────────────────
// chrome is used by loadStatsCache(), scheduleFlush(), initPopupBridge().
// The pure-logic functions (createEmptyStats, accumulateStatsUpdate, buildPopupResponse)
// do not call these at runtime, but we stub chrome globally so the module can load.

vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
  },
});

// ─── IMPORTS ──────────────────────────────────────────────────────────────────
// Import the module under test AFTER mocks are set up so the mocked exports are
// resolved at load time.

import {
  createEmptyStats,
  accumulateStatsUpdate,
  buildPopupResponse,
  invalidateStatsCache,
} from '@/background/popup-bridge';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

type StatsUpdate = {
  provider: string;
  color: string;
  size: number;
  duration: number;
  status: number;
};

function makeStats(overrides: Partial<{
  tabId: number;
  totalRequests: number;
  totalSize: number;
  totalDuration: number;
  successCount: number;
  providers: { name: string; color: string; count: number }[];
  firstRequest: string | null;
  lastRequest: string | null;
  isPaused: boolean;
}> = {}): ReturnType<typeof createEmptyStats> {
  return {
    tabId: 1,
    totalRequests: 0,
    totalSize: 0,
    totalDuration: 0,
    successCount: 0,
    providers: [],
    firstRequest: null,
    lastRequest: null,
    isPaused: false,
    ...overrides,
  };
}

function update(status: number, overrides: Partial<StatsUpdate> = {}): StatsUpdate {
  return {
    provider: 'TestProvider',
    color: '#ff0000',
    size: 100,
    duration: 50,
    status,
    ...overrides,
  };
}

// ─── CREATE EMPTY STATS ───────────────────────────────────────────────────────

describe('createEmptyStats', () => {
  it('creates stats with zero counts and empty providers', () => {
    const stats = createEmptyStats(42);

    expect(stats.tabId).toBe(42);
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.successCount).toBe(0);
    expect(stats.providers).toEqual([]);
    expect(stats.firstRequest).toBeNull();
    expect(stats.lastRequest).toBeNull();
    expect(stats.isPaused).toBe(false);
  });

  it('sets tabId from parameter', () => {
    expect(createEmptyStats(1).tabId).toBe(1);
    expect(createEmptyStats(999).tabId).toBe(999);
  });
});

// ─── ACCUMULATE STATS UPDATE ──────────────────────────────────────────────────

describe('accumulateStatsUpdate', () => {
  beforeEach(() => {
    invalidateStatsCache();
  });

  it('increments totalRequests', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200));

    expect(stats.totalRequests).toBe(1);
  });

  it('accumulates totalSize and totalDuration', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200, { size: 500, duration: 120 }));

    expect(stats.totalSize).toBe(500);
    expect(stats.totalDuration).toBe(120);
  });

  it('counts success for 2xx status', () => {
    for (const status of [200, 201, 204, 299]) {
      const stats = makeStats();
      accumulateStatsUpdate(stats, update(status));

      expect(stats.successCount).toBe(1);
    }
  });

  it('does not count success for 4xx/5xx status', () => {
    for (const status of [400, 401, 403, 404, 500, 502, 503]) {
      const stats = makeStats();
      accumulateStatsUpdate(stats, update(status));

      expect(stats.successCount).toBe(0);
    }
  });

  it('adds new provider when first seen', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200, { provider: 'GA4', color: '#ff9900' }));

    expect(stats.providers).toHaveLength(1);
    expect(stats.providers[0]).toEqual({ name: 'GA4', color: '#ff9900', count: 1 });
  });

  it('increments existing provider count', () => {
    const stats = makeStats({ providers: [{ name: 'GA4', color: '#ff9900', count: 3 }] });
    accumulateStatsUpdate(stats, update(200, { provider: 'GA4', color: '#ff9900' }));

    expect(stats.providers).toHaveLength(1);
    expect(stats.providers[0].count).toBe(4);
  });

  it('accumulates multiple updates correctly', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200, { size: 100, duration: 50 }));
    accumulateStatsUpdate(stats, update(200, { size: 200, duration: 100 }));
    accumulateStatsUpdate(stats, update(404, { size: 50, duration: 25 }));

    expect(stats.totalRequests).toBe(3);
    expect(stats.totalSize).toBe(350);
    expect(stats.totalDuration).toBe(175);
    expect(stats.successCount).toBe(2); // 200 + 200 = 2 successes, 404 is not
  });

  it('handles zero size and duration', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200, { size: 0, duration: 0 }));

    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });

  it('adds multiple different providers', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, update(200, { provider: 'GA4', color: '#ff9900' }));
    accumulateStatsUpdate(stats, update(200, { provider: 'Meta', color: '#1877f2' }));
    accumulateStatsUpdate(stats, update(200, { provider: 'TikTok', color: '#000000' }));

    expect(stats.providers).toHaveLength(3);
    expect(stats.providers.map((p) => p.name)).toEqual(['GA4', 'Meta', 'TikTok']);
  });

  it('handles falsy update.size (undefined/zero)', () => {
    const stats = makeStats();
    accumulateStatsUpdate(stats, { provider: 'P', color: '#000', size: 0, duration: 0, status: 200 });

    expect(stats.totalSize).toBe(0);
  });
});

// ─── BUILD POPUP RESPONSE ──────────────────────────────────────────────────────

describe('buildPopupResponse', () => {
  beforeEach(() => {
    invalidateStatsCache();
    mockDevToolsPorts.clear();
  });

  it('calculates avgDuration from totalDuration / totalRequests', () => {
    const stats = makeStats({ totalRequests: 10, totalDuration: 500 });
    const result = buildPopupResponse(stats, 1);

    expect(result.avgDuration).toBe(50); // 500 / 10 = 50
  });

  it('calculates successRate percentage', () => {
    const stats = makeStats({ totalRequests: 20, successCount: 5 });
    const result = buildPopupResponse(stats, 1);

    expect(result.successRate).toBe(25); // (5 / 20) * 100 = 25
  });

  it('limits topProviders to top 5', () => {
    const providers = Array.from({ length: 8 }, (_, i) => ({
      name: `Provider${i}`,
      color: '#000',
      count: 8 - i, // sorted by count desc
    }));
    const stats = makeStats({ providers });
    const result = buildPopupResponse(stats, 1);

    expect(result.topProviders).toHaveLength(5);
    expect(result.topProviders[0].name).toBe('Provider0');
    expect(result.topProviders[4].name).toBe('Provider4');
  });

  it('sums remaining providers into otherProvidersTotal', () => {
    const providers = Array.from({ length: 8 }, (_, i) => ({
      name: `Provider${i}`,
      color: '#000',
      count: 1,
    }));
    const stats = makeStats({ providers });
    const result = buildPopupResponse(stats, 1);

    expect(result.otherProvidersCount).toBe(3); // 8 total - 5 top = 3 others
    expect(result.otherProvidersTotal).toBe(3);  // 3 providers * 1 count each
  });

  it('returns 0 avgDuration when no requests', () => {
    const stats = makeStats({ totalRequests: 0, totalDuration: 0 });
    const result = buildPopupResponse(stats, 1);

    expect(result.avgDuration).toBe(0);
  });

  it('returns 100 successRate when no requests', () => {
    const stats = makeStats({ totalRequests: 0, successCount: 0 });
    const result = buildPopupResponse(stats, 1);

    expect(result.successRate).toBe(100);
  });

  it('detects isDevToolsOpen from ports Map — open', () => {
    const mockPort = {} as chrome.runtime.Port;
    mockDevToolsPorts.set(42, mockPort);

    const stats = makeStats({ tabId: 42 });
    const result = buildPopupResponse(stats, 42);

    expect(result.isDevToolsOpen).toBe(true);
  });

  it('detects isDevToolsOpen from ports Map — closed', () => {
    const stats = makeStats({ tabId: 99 });
    const result = buildPopupResponse(stats, 99);

    expect(result.isDevToolsOpen).toBe(false);
  });

  it('returns otherProvidersCount: 0 when 5 or fewer providers', () => {
    const providers = [
      { name: 'A', color: '#000', count: 1 },
      { name: 'B', color: '#000', count: 1 },
    ];
    const stats = makeStats({ providers });
    const result = buildPopupResponse(stats, 1);

    expect(result.otherProvidersCount).toBe(0);
    expect(result.otherProvidersTotal).toBe(0);
    expect(result.topProviders).toHaveLength(2);
  });

  it('rounds avgDuration with Math.round', () => {
    const stats = makeStats({ totalRequests: 3, totalDuration: 100 });
    const result = buildPopupResponse(stats, 1);

    expect(result.avgDuration).toBe(33); // 100 / 3 = 33.33... rounded to 33
  });

  it('rounds successRate with Math.round', () => {
    const stats = makeStats({ totalRequests: 3, successCount: 1 });
    const result = buildPopupResponse(stats, 1);

    expect(result.successRate).toBe(33); // (1 / 3) * 100 = 33.33... rounded to 33
  });

  it('spreads all TabPopupStats fields into result', () => {
    const stats = makeStats({
      tabId: 7,
      totalRequests: 5,
      totalSize: 1234,
      totalDuration: 300,
      successCount: 4,
      providers: [{ name: 'GA4', color: '#ff9900', count: 5 }],
      firstRequest: '2024-01-01T00:00:00Z',
      lastRequest: '2024-01-01T00:01:00Z',
      isPaused: true,
    });
    const result = buildPopupResponse(stats, 7);

    expect(result.tabId).toBe(7);
    expect(result.totalRequests).toBe(5);
    expect(result.totalSize).toBe(1234);
    expect(result.totalDuration).toBe(300);
    expect(result.successCount).toBe(4);
    expect(result.providers).toHaveLength(1);
    expect(result.firstRequest).toBe('2024-01-01T00:00:00Z');
    expect(result.lastRequest).toBe('2024-01-01T00:01:00Z');
    expect(result.isPaused).toBe(true);
  });
});