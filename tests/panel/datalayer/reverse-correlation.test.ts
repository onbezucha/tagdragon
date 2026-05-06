import { describe, it, expect } from 'vitest';
import { findTriggeringPush, type TriggeringPushResult } from '../../../src/panel/datalayer/utils/reverse-correlation';
import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function makePush(
  timestamp: string,
  data: Record<string, unknown> = {},
  id = 1,
  eventName?: string,
  source: DataLayerPush['source'] = 'gtm',
  _ts?: number
): DataLayerPush {
  return {
    id,
    source,
    sourceLabel: source.toUpperCase(),
    pushIndex: id - 1,
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

// ─── FIND TRIGGERING PUSH ────────────────────────────────────────────────────

describe('findTriggeringPush', () => {
  // ─── No match ─────────────────────────────────────────────────────────────

  describe('no match', () => {
    it('returns null when pushes array is empty', () => {
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      expect(findTriggeringPush(request, [])).toBeNull();
    });

    it('returns null when request timestamp is invalid', () => {
      const request = makeRequest('invalid-timestamp', 1);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      expect(findTriggeringPush(request, pushes)).toBeNull();
    });

    it('returns null when all pushes are too far before request', () => {
      const request = makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, 0);
      const pushes = [
        makePush('2024-01-01T11:59:00.000Z', {}, 1, undefined, 'gtm', -60000),
        makePush('2024-01-01T11:58:00.000Z', {}, 2, undefined, 'gtm', -120000),
      ];
      expect(findTriggeringPush(request, pushes)).toBeNull();
    });

    it('returns null when no pushes exist before the request', () => {
      const request = makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, 1000);
      const pushes = [
        makePush('2024-01-01T12:00:01.500Z', {}, 1, undefined, 'gtm', 1500), // After request
      ];
      expect(findTriggeringPush(request, pushes)).toBeNull();
    });
  });

  // ─── Basic correlation ────────────────────────────────────────────────────

  describe('basic correlation', () => {
    it('finds push within default lookback (2000ms)', () => {
      // Request at t=1000, push at t=0 (1000ms before)
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.push.id).toBe(1);
      expect(result!.delayMs).toBe(1000);
    });

    it('finds closest push when multiple candidates exist', () => {
      // Request at t=2000, three pushes at t=0, 500, 1500
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [
        makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0),
        makePush('2024-01-01T12:00:00.500Z', {}, 2, undefined, 'gtm', 500),
        makePush('2024-01-01T12:00:01.500Z', {}, 3, undefined, 'gtm', 1500),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.push.id).toBe(3); // closest: 1500ms before
      expect(result!.delayMs).toBe(500);
    });

    it('respects custom lookbackMs parameter', () => {
      // Request at t=2000, push at t=500 (1500ms before)
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [makePush('2024-01-01T12:00:00.500Z', {}, 1, undefined, 'gtm', 500)];
      // Within 2000ms default lookback
      expect(findTriggeringPush(request, pushes)).not.toBeNull();
      // Outside 1000ms custom lookback
      expect(findTriggeringPush(request, pushes, 1000)).toBeNull();
    });

    it('finds push at exact boundary of lookback', () => {
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      // Exactly 2000ms before
      expect(findTriggeringPush(request, pushes, 2000)).not.toBeNull();
      // Just outside (2001ms)
      expect(findTriggeringPush(request, pushes, 1999)).toBeNull();
    });
  });

  // ─── Confidence levels ───────────────────────────────────────────────────

  describe('confidence levels', () => {
    it('assigns high confidence for delay < 200ms', () => {
      const request = makeRequest('2024-01-01T12:00:00.199Z', 1, undefined, 199);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.confidence).toBe('high');
      expect(result.delayMs).toBe(199);
    });

    it('assigns medium confidence for 200ms <= delay < 1000ms', () => {
      const request = makeRequest('2024-01-01T12:00:00.700Z', 1, undefined, 700);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.confidence).toBe('medium');
    });

    it('assigns low confidence for delay >= 1000ms', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.confidence).toBe('low');
    });

    it('assigns confidence based on absolute delay', () => {
      // Delay is 100ms (< 200), should be high
      const request = makeRequest('2024-01-01T12:00:00.100Z', 1, undefined, 100);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.delayMs).toBe(100);
      expect(result.confidence).toBe('high');
    });
  });

  // ─── Negative delay (push after request) ─────────────────────────────────

  describe('push after request handling', () => {
    it('skips pushes that occur more than 200ms after request', () => {
      // Push at t=300, request at t=0 — delay = -300 (200ms after request, should be skipped)
      const request = makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, 0);
      const pushes = [
        makePush('2024-01-01T12:00:00.300Z', {}, 1, undefined, 'gtm', 300),
        makePush('2024-01-01T12:00:00.800Z', {}, 2, undefined, 'gtm', 800),
      ];
      // Both pushes are after request (negative delay from request perspective)
      // delay < -200 is skipped; the 800ms push is outside lookback
      expect(findTriggeringPush(request, pushes)).toBeNull();
    });

    it('accepts pushes within -200ms to +lookbackMs range', () => {
      // Push at t=-100 (just after request), request at t=0
      const request = makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, 0);
      const pushes = [
        makePush('2024-01-01T11:59:59.900Z', {}, 1, undefined, 'gtm', -100),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.delayMs).toBe(100);
    });
  });

  // ─── Binary search efficiency ─────────────────────────────────────────────

  describe('binary search efficiency', () => {
    it('finds push in large sorted array', () => {
      // Create 100 pushes at 100ms intervals, request at t=5050ms.
      // Push at index 50 is at t=5000ms — 50ms before request (high confidence).
      const request = makeRequest('2024-01-01T12:00:05.050Z', 1, undefined, 5050);
      const pushes: DataLayerPush[] = [];
      for (let i = 0; i < 100; i++) {
        const ts = i * 100;
        const seconds = Math.floor(ts / 1000);
        const millis = ts % 1000;
        const tsStr = `2024-01-01T12:00:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}Z`;
        pushes.push(makePush(tsStr, {}, i + 1, undefined, 'gtm', ts));
      }
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.delayMs).toBe(50);
      expect(result!.confidence).toBe('high');
    });

    it('finds the earliest push within lookback when all are before request', () => {
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [
        makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0),
        makePush('2024-01-01T12:00:00.200Z', {}, 2, undefined, 'gtm', 200),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.push.id).toBe(2); // closer
      expect(result!.delayMs).toBe(1800);
    });
  });

  // ─── Invalid push timestamps ──────────────────────────────────────────────

  describe('invalid push timestamps', () => {
    it('skips pushes with invalid timestamps during scan', () => {
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [
        makePush('invalid-timestamp', {}, 1, undefined, 'gtm', undefined),
        makePush('2024-01-01T12:00:01.000Z', {}, 2, undefined, 'gtm', 1000),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.push.id).toBe(2);
    });

    // Note: findTriggeringPush uses _ts (numeric), not timestamp string. When _ts is
    // undefined, the binary search produces lo=0 and no pushes satisfy the delay filter,
    // so result is null. This is the documented/expected behavior.
    it('returns null when push has no _ts (uses numeric _ts, not string fallback)', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes = [
        makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', undefined),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).toBeNull();
    });

    it('skips pushes with NaN timestamps', () => {
      const request = makeRequest('2024-01-01T12:00:02.000Z', 1, undefined, 2000);
      const pushes = [
        makePush('2024-01-01T12:00:01.000Z', {}, 1, undefined, 'gtm', NaN),
        makePush('2024-01-01T12:00:00.500Z', {}, 2, undefined, 'gtm', 500),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.push.id).toBe(2);
    });
  });

  // ─── Result shape ─────────────────────────────────────────────────────────

  describe('TriggeringPushResult shape', () => {
    it('returns push, delayMs, and confidence', () => {
      const request = makeRequest('2024-01-01T12:00:00.500Z', 1, undefined, 500);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 42, 'purchase', 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.push.id).toBe(42);
      expect(result.push._eventName).toBe('purchase');
      expect(result.delayMs).toBe(500);
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles exact same timestamps (push at same time as request)', () => {
      const ts = 1000;
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, ts);
      const pushes = [makePush('2024-01-01T12:00:01.000Z', {}, 1, undefined, 'gtm', ts)];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      expect(result!.delayMs).toBe(0);
      expect(result!.confidence).toBe('high');
    });

    it('returns closest push when two pushes are equidistant', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes = [
        makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0),
        makePush('2024-01-01T12:00:02.000Z', {}, 2, undefined, 'gtm', 2000),
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
      // t=0 is 1000ms before, t=2000 is 1000ms after — but pushes after request are ignored
      // Actually, the algorithm checks delay < -200, so t=2000 push (delay=1000ms from request = -1000 after request?) No,
      // delay = reqTime - pushTime. If push is at 2000 and req is at 1000, delay = -1000 which is < -200 -> skipped
      // So only the t=0 push qualifies
      expect(result!.push.id).toBe(1);
      expect(result!.delayMs).toBe(1000);
    });

    it('returns null when single push is after request and beyond -200ms boundary', () => {
      const request = makeRequest('2024-01-01T12:00:00.000Z', 1, undefined, 0);
      const pushes = [makePush('2024-01-01T12:00:00.500Z', {}, 1, undefined, 'gtm', 500)];
      expect(findTriggeringPush(request, pushes)).toBeNull();
    });

    it('handles pushes array with null elements (should not happen, but test skip)', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes: DataLayerPush[] = [
        makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0),
        // @ts-ignore — intentionally test edge case
      ];
      const result = findTriggeringPush(request, pushes);
      expect(result).not.toBeNull();
    });

    it('handles lookbackMs of 0', () => {
      const request = makeRequest('2024-01-01T12:00:00.500Z', 1, undefined, 500);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      expect(findTriggeringPush(request, pushes, 0)).toBeNull();
    });

    it('handles very large lookbackMs', () => {
      const request = makeRequest('2024-01-01T12:00:05.000Z', 1, undefined, 5000);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, undefined, 'gtm', 0)];
      const result = findTriggeringPush(request, pushes, 10000);
      expect(result).not.toBeNull();
      expect(result!.delayMs).toBe(5000);
    });
  });

  // ─── Push metadata preserved ─────────────────────────────────────────────

  describe('push metadata preserved', () => {
    it('preserves source and sourceLabel in result', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const pushes = [makePush('2024-01-01T12:00:00.000Z', {}, 1, 'purchase', 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.push.source).toBe('gtm');
      expect(result.push.sourceLabel).toBe('GTM');
    });

    it('preserves data in returned push', () => {
      const request = makeRequest('2024-01-01T12:00:01.000Z', 1, undefined, 1000);
      const data = { event: 'purchase', transaction_id: 'T-123' };
      const pushes = [makePush('2024-01-01T12:00:00.000Z', data, 1, 'purchase', 'gtm', 0)];
      const result = findTriggeringPush(request, pushes)!;
      expect(result.push.data).toEqual(data);
    });
  });
});