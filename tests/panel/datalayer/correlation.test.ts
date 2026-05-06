import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findCorrelatedRequests, type CorrelatedRequest } from '../../../src/panel/datalayer/utils/correlation';
import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function makePush(
  timestamp: string,
  data: Record<string, unknown>,
  id = 1,
  source: DataLayerPush['source'] = 'gtm',
  eventName?: string,
  _ts?: number
): DataLayerPush {
  return {
    id,
    source,
    sourceLabel: source.toUpperCase(),
    pushIndex: 0,
    timestamp,
    data,
    cumulativeState: null,
    _ts,
    _eventName: eventName,
  };
}

function makeRequest(
  timestamp: string,
  id = 1,
  url = 'https://example.com/collect',
  _ts?: number
): ParsedRequest {
  return {
    id,
    provider: 'GA4',
    color: '#0000FF',
    url,
    method: 'GET',
    status: 200,
    timestamp,
    duration: 100,
    size: 50,
    allParams: {},
    decoded: {},
    postBody: null,
    _ts,
  };
}

// ─── FIND CORRELATED REQUESTS ─────────────────────────────────────────────────

describe('findCorrelatedRequests', () => {
  // ─── No requests ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array when no requests provided', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1704110400000);
      expect(findCorrelatedRequests(push, [])).toEqual([]);
    });

    it('returns empty array for requests with invalid timestamps', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1704110400000);
      const requests: ParsedRequest[] = [
        makeRequest('invalid-timestamp', 1),
      ];
      expect(findCorrelatedRequests(push, requests)).toEqual([]);
    });

    it('returns empty array for push with invalid timestamp', () => {
      const push = makePush('invalid-timestamp', {}, 1);
      const requests = [makeRequest('2024-01-01T12:00:01.000Z', 1)];
      expect(findCorrelatedRequests(push, requests)).toEqual([]);
    });

    it('returns empty array for push with undefined timestamp and no _ts', () => {
      const push = makePush('', {}, 1);
      const requests = [makeRequest('2024-01-01T12:00:01.000Z', 1)];
      expect(findCorrelatedRequests(push, requests)).toEqual([]);
    });
  });

  // ─── Basic correlation ────────────────────────────────────────────────────

  describe('basic correlation', () => {
    it('finds request within default window (2000ms)', () => {
      // push at t=0, request at t=500ms
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 0);
      const requests = [makeRequest('2024-01-01T12:00:00.500Z', 1, undefined, 500)];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(1);
      expect(result[0].delayMs).toBe(500);
    });

    it('finds request at boundary of default window (2000ms)', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 0);
      const requests = [makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000)];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(1);
      expect(result[0].delayMs).toBe(2000);
    });

    it('excludes request just outside default window (beyond 2000ms)', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 0);
      const requests = [makeRequest('2024-01-01T12:00:02.001Z', 1, undefined, 2001)];
      expect(findCorrelatedRequests(push, requests)).toHaveLength(0);
    });

    it('respects custom windowMs parameter', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 0);
      const requests = [makeRequest('2024-01-01T12:00:01.500Z', 1, undefined, 1500)];
      // Within 3000ms custom window
      const result = findCorrelatedRequests(push, requests, 3000);
      expect(result).toHaveLength(1);
      // Outside 1000ms custom window
      expect(findCorrelatedRequests(push, requests, 1000)).toHaveLength(0);
    });
  });

  // ─── Lookback window ──────────────────────────────────────────────────────

  describe('lookback window', () => {
    it('includes requests that started before the push (lookback)', () => {
      // Request started 300ms before push — within 500ms lookback
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1000);
      const requests = [makeRequest('2024-01-01T12:00:00.700Z', 1, undefined, 700)];
      // Default lookback is 500ms
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(1);
      expect(result[0].delayMs).toBe(-300);
    });

    it('excludes requests too far before push (beyond lookback)', () => {
      // Request started 600ms before push — outside 500ms lookback
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1000);
      const requests = [makeRequest('2024-01-01T12:00:00.400Z', 1, undefined, 400)];
      expect(findCorrelatedRequests(push, requests)).toHaveLength(0);
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  describe('sorting', () => {
    it('sorts results by delayMs ascending (closest first)', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1000);
      const requests = [
        makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 2000), // +1000ms
        makeRequest('2024-01-01T12:00:01.500Z', 2, undefined, 2500), // +1500ms
        makeRequest('2024-01-01T12:00:00.500Z', 3, undefined, 1500), // +500ms
      ];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(3);
      expect(result[0].delayMs).toBe(500);
      expect(result[1].delayMs).toBe(1000);
      expect(result[2].delayMs).toBe(1500);
    });
  });

  // ─── Multiple requests ─────────────────────────────────────────────────────

  describe('multiple requests', () => {
    it('returns all matching requests within window', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1000);
      const requests = [
        makeRequest('2024-01-01T12:00:00.300Z', 1, undefined, 1300), // +300ms
        makeRequest('2024-01-01T12:00:01.200Z', 2, undefined, 2200), // +1200ms
        makeRequest('2024-01-01T12:00:02.000Z', 3, undefined, 3000), // +2000ms (boundary)
        makeRequest('2024-01-01T12:00:03.000Z', 4, undefined, 4000), // +3000ms (outside)
        makeRequest('2024-01-01T12:00:00.100Z', 5, undefined, 1100), // +100ms
      ];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(4);
    });

    it('returns empty when no requests are within window', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 0);
      const requests = [
        makeRequest('2024-01-01T12:05:00.000Z', 1, undefined, 300000), // 5 min later
        makeRequest('2024-01-01T11:55:00.000Z', 2, undefined, -300000), // 5 min before
      ];
      expect(findCorrelatedRequests(push, requests)).toHaveLength(0);
    });
  });

  // ─── Request metadata ──────────────────────────────────────────────────────

  describe('returns request metadata', () => {
    it('includes request object and delayMs in result', () => {
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, 1000);
      const req = makeRequest('2024-01-01T12:00:01.000Z', 42, 'https://analytics.google.com/batch', 2000);
      req._eventName = 'page_view';
      const requests = [req];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(1);
      expect(result[0].request.id).toBe(42);
      expect(result[0].delayMs).toBe(1000);
    });
  });

  // ─── Edge: equal timestamps ────────────────────────────────────────────────

  describe('equal timestamps', () => {
    it('handles request with same timestamp as push', () => {
      const ts = 1704110400000;
      const push = makePush('2024-01-01T12:00:00.000Z', {}, 1, 'gtm', undefined, ts);
      const requests = [makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, ts)];
      const result = findCorrelatedRequests(push, requests);
      expect(result).toHaveLength(1);
      expect(result[0].delayMs).toBe(0);
    });
  });
});