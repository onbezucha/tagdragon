import { describe, it, expect } from 'vitest';
import type { ParsedRequest } from '@/types/request';
import { computeProviderStats, formatMs } from '@/panel/utils/provider-stats';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function mockRequest(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    id: 'req-1',
    provider: 'GA4',
    color: '#e37400',
    url: 'https://www.google-analytics.com/mp/collect',
    method: 'GET',
    status: 200,
    timestamp: '2024-01-01T00:00:00.000Z',
    duration: 0,
    size: 0,
    allParams: {},
    decoded: {},
    postBody: null,
    ...overrides,
  } as unknown as ParsedRequest;
}

// ─── COMPUTE PROVIDER STATS ────────────────────────────────────────────────

describe('computeProviderStats', () => {
  it('should return empty array for empty input', () => {
    const result = computeProviderStats([]);
    expect(result).toEqual([]);
  });

  it('should return single stat with count 1 for single request', () => {
    const result = computeProviderStats([mockRequest()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'GA4',
      count: 1,
      errorCount: 0,
      totalSize: 0,
    });
  });

  it('should aggregate multiple requests from same provider', () => {
    const requests = [
      mockRequest({ id: 'req-1', duration: 100, size: 500 }),
      mockRequest({ id: 'req-2', duration: 200, size: 300 }),
      mockRequest({ id: 'req-3', duration: 150, size: 200 }),
    ];
    const result = computeProviderStats(requests);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].totalSize).toBe(1000);
    expect(result[0].avgTime).toBe(150); // (100+200+150)/3 rounded
  });

  it('should sort results by count descending', () => {
    const requests = [
      mockRequest({ id: 'req-1', provider: 'GA4' }),
      mockRequest({ id: 'req-2', provider: 'GA4' }),
      mockRequest({ id: 'req-3', provider: 'Meta' }),
      mockRequest({ id: 'req-4', provider: 'Meta' }),
      mockRequest({ id: 'req-5', provider: 'Meta' }),
      mockRequest({ id: 'req-6', provider: 'Adobe' }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].name).toBe('Meta');
    expect(result[0].count).toBe(3);
    expect(result[1].name).toBe('GA4');
    expect(result[1].count).toBe(2);
    expect(result[2].name).toBe('Adobe');
    expect(result[2].count).toBe(1);
  });

  it('should count errors when status >= 400', () => {
    const requests = [
      mockRequest({ id: 'req-1', status: 200 }),
      mockRequest({ id: 'req-2', status: 400 }),
      mockRequest({ id: 'req-3', status: 404 }),
      mockRequest({ id: 'req-4', status: 500 }),
      mockRequest({ id: 'req-5', status: 201 }),
    ];
    const result = computeProviderStats(requests);
    expect(result).toHaveLength(1);
    expect(result[0].errorCount).toBe(3);
  });

  it('should not count status < 400 as errors', () => {
    const requests = [
      mockRequest({ id: 'req-1', status: 200 }),
      mockRequest({ id: 'req-2', status: 301 }),
      mockRequest({ id: 'req-3', status: 304 }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].errorCount).toBe(0);
  });

  it('should compute average time from durations', () => {
    const requests = [
      mockRequest({ id: 'req-1', duration: 500 }),
      mockRequest({ id: 'req-2', duration: 1500 }),
      mockRequest({ id: 'req-3', duration: 1000 }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].avgTime).toBe(1000); // (500+1500+1000)/3 rounded
  });

  it('should accumulate total size from request sizes', () => {
    const requests = [
      mockRequest({ id: 'req-1', size: 1200 }),
      mockRequest({ id: 'req-2', size: 800 }),
      mockRequest({ id: 'req-3', size: 2500 }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].totalSize).toBe(4500);
  });

  it('should use provider color from first request', () => {
    const requests = [
      mockRequest({ id: 'req-1', color: '#ff0000' }),
      mockRequest({ id: 'req-2', color: '#00ff00' }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].color).toBe('#ff0000');
  });

  it('should use Unknown for requests without provider', () => {
    const requests = [
      mockRequest({ id: 'req-1', provider: undefined }),
    ];
    const result = computeProviderStats(requests);
    expect(result[0].name).toBe('Unknown');
  });
});

// ─── FORMAT MS ──────────────────────────────────────────────────────────────

describe('formatMs', () => {
  it('should return em dash for 0', () => {
    expect(formatMs(0)).toBe('—');
  });

  it('should return ms suffix for values under 1000', () => {
    expect(formatMs(500)).toBe('500ms');
    expect(formatMs(1)).toBe('1ms');
    expect(formatMs(999)).toBe('999ms');
  });

  it('should return seconds with 1 decimal place for values >= 1000', () => {
    expect(formatMs(1500)).toBe('1.5s');
    expect(formatMs(1000)).toBe('1.0s');
    expect(formatMs(60000)).toBe('60.0s');
    expect(formatMs(2500)).toBe('2.5s');
  });
});