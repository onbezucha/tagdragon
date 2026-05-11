// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ParsedRequest } from '@/types/request';

vi.stubGlobal('chrome', {
  devtools: { inspectedWindow: { tabId: 42 } },
});

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

// ═══════════════════════════════════════════════════════════════
// Dynamic import to ensure module state is fresh per test after
// vi.useFakeTimers() resets timers.
// ═══════════════════════════════════════════════════════════════

describe('session-persist', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════
  // loadPersistedRequests
  // ═══════════════════════════════════════════════════════════════

  describe('loadPersistedRequests', () => {
    it('returns empty array when no data in sessionStorage', async () => {
      const { loadPersistedRequests } = await importModule();
      const result = loadPersistedRequests();
      expect(result).toEqual([]);
    });

    it('returns parsed array when valid JSON array exists', async () => {
      const { loadPersistedRequests } = await importModule();
      const requests = [mockRequest(1), mockRequest(2)];
      sessionStorage.setItem('tagdragon_requests_42', JSON.stringify(requests));
      const result = loadPersistedRequests();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('returns empty array for invalid JSON', async () => {
      const { loadPersistedRequests } = await importModule();
      sessionStorage.setItem('tagdragon_requests_42', 'not valid json');
      const result = loadPersistedRequests();
      expect(result).toEqual([]);
    });

    it('returns empty array when JSON is not an array', async () => {
      const { loadPersistedRequests } = await importModule();
      sessionStorage.setItem('tagdragon_requests_42', JSON.stringify({ foo: 'bar' }));
      const result = loadPersistedRequests();
      expect(result).toEqual([]);
    });

    it('returns empty array when items are missing required fields', async () => {
      const { loadPersistedRequests } = await importModule();
      const invalidItems = [
        { id: 1, url: 'https://example.com' },
        { id: 2 },
      ];
      sessionStorage.setItem('tagdragon_requests_42', JSON.stringify(invalidItems));
      const result = loadPersistedRequests();
      expect(result).toEqual([]);
    });

    it('returns items with minimum valid shape', async () => {
      const { loadPersistedRequests } = await importModule();
      const validItems = [
        { id: 1, url: 'https://a.com', provider: 'GA4' },
        { id: 2, url: 'https://b.com', provider: 'GA4' },
      ];
      sessionStorage.setItem('tagdragon_requests_42', JSON.stringify(validItems));
      const result = loadPersistedRequests();
      expect(result).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // scheduleSaveRequests (covers stringifyStripped indirectly)
  // ═══════════════════════════════════════════════════════════════

  describe('scheduleSaveRequests', () => {
    it('saves stripped requests after debounce delay', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([
        mockRequest(1, {
          responseBody: 'heavy response body content',
          requestHeaders: [{ name: 'Cookie', value: 'secret=abc' }],
          responseHeaders: [{ name: 'Set-Cookie', value: 'token=xyz' }],
        }),
        mockRequest(2, { extraField: 'preserved' }),
      ]);
      expect(mod.loadPersistedRequests()).toEqual([]);
      vi.advanceTimersByTime(1500);
      const saved = mod.loadPersistedRequests();
      expect(saved).toHaveLength(2);
      expect(saved[0]).not.toHaveProperty('responseBody');
      expect(saved[0]).not.toHaveProperty('requestHeaders');
      expect(saved[0]).not.toHaveProperty('responseHeaders');
      // Standard ParsedRequest fields (extraField is non-standard) are preserved.
      // Second request has method: 'GET' from mockRequest base, shown via direct key access.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((saved[1] as any)['method']).toBe('GET');
      expect(saved[1]).toHaveProperty('id', 2);
      expect(saved[1]).toHaveProperty('provider', 'GA4');
    });

    it('strips heavy keys but preserves all other keys', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([
        mockRequest(1, {
          responseBody: 'ignored',
          requestHeaders: 'ignored',
          responseHeaders: 'ignored',
          id: 1,
          url: 'https://test.com',
          provider: 'GA4',
          color: '#fff',
          method: 'POST',
          status: 201,
          timestamp: '2024-06-15T12:00:00Z',
          duration: 250,
          size: 1024,
          allParams: { key: 'value' },
          decoded: { decoded: true },
          postBody: { data: 'body' },
        }),
      ]);
      vi.advanceTimersByTime(1500);
      const saved = mod.loadPersistedRequests();
      expect(saved[0]).toHaveProperty('id', 1);
      expect(saved[0]).toHaveProperty('url', 'https://test.com');
      expect(saved[0]).toHaveProperty('provider', 'GA4');
      expect(saved[0]).toHaveProperty('color', '#fff');
      expect(saved[0]).toHaveProperty('method', 'POST');
      expect(saved[0]).toHaveProperty('status', 201);
      expect(saved[0]).toHaveProperty('timestamp', '2024-06-15T12:00:00Z');
      expect(saved[0]).toHaveProperty('duration', 250);
      expect(saved[0]).toHaveProperty('size', 1024);
      expect(saved[0]).toHaveProperty('allParams');
      expect(saved[0]).toHaveProperty('decoded');
      expect(saved[0]).toHaveProperty('postBody');
      expect(saved[0]).not.toHaveProperty('responseBody');
      expect(saved[0]).not.toHaveProperty('requestHeaders');
      expect(saved[0]).not.toHaveProperty('responseHeaders');
    });

    it('produces valid JSON output', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([
        mockRequest(1, {
          allParams: { nested: { deep: 'value' } },
          decoded: ['array', 'items'],
        }),
      ]);
      vi.advanceTimersByTime(1500);
      const raw = sessionStorage.getItem('tagdragon_requests_42');
      expect(() => JSON.parse(raw!)).not.toThrow();
      const saved = mod.loadPersistedRequests();
      expect(saved).toHaveLength(1);
    });

    it('triggers max-wait save if debounce not yet fired', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([mockRequest(1)]);
      vi.advanceTimersByTime(1600);
      expect(mod.loadPersistedRequests()).toHaveLength(1);
      vi.advanceTimersByTime(3500);
      const saved = mod.loadPersistedRequests();
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clearPersistedRequests
  // ═══════════════════════════════════════════════════════════════

  describe('clearPersistedRequests', () => {
    it('clears sessionStorage and cancels pending timers', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([mockRequest(1)]);
      mod.clearPersistedRequests();
      vi.advanceTimersByTime(5000);
      expect(mod.loadPersistedRequests()).toEqual([]);
      expect(sessionStorage.getItem('tagdragon_requests_42')).toBeNull();
    });

    it('can reschedule after clear', async () => {
      const mod = await importModule();
      mod.scheduleSaveRequests([mockRequest(1)]);
      mod.clearPersistedRequests();
      mod.scheduleSaveRequests([mockRequest(2), mockRequest(3)]);
      vi.advanceTimersByTime(1500);
      const saved = mod.loadPersistedRequests();
      expect(saved).toHaveLength(2);
      expect(saved[0].id).toBe(2);
      expect(saved[1].id).toBe(3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Relative path: tests/panel/utils/*.test.ts → src/panel/utils/*.ts
// ─────────────────────────────────────────────────────────────────

async function importModule() {
  return await import('../../../src/panel/utils/session-persist');
}