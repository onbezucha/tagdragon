import { describe, it, expect } from 'vitest';
import { headersToObj } from '@/shared/http-utils';

describe('headersToObj', () => {
  it('converts headers array to lowercase-keyed object', () => {
    const result = headersToObj([{ name: 'Content-Type', value: 'text/html' }]);
    expect(result).toEqual({ 'content-type': 'text/html' });
  });

  it('handles missing value (falls back to empty string)', () => {
    const result = headersToObj([{ name: 'X-Empty' }]);
    expect(result).toEqual({ 'x-empty': '' });
  });

  it('returns empty object for undefined input', () => {
    const result = headersToObj(undefined);
    expect(result).toEqual({});
  });

  it('returns empty object for empty array', () => {
    const result = headersToObj([]);
    expect(result).toEqual({});
  });

  it('handles duplicate header names (last wins)', () => {
    const result = headersToObj([
      { name: 'x-a', value: '1' },
      { name: 'X-A', value: '2' }
    ]);
    expect(result).toEqual({ 'x-a': '2' });
  });

  it('handles multiple different headers', () => {
    const result = headersToObj([
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Cache-Control', value: 'no-cache' },
      { name: 'X-Custom', value: 'custom-value' }
    ]);
    expect(result).toEqual({
      'content-type': 'application/json',
      'cache-control': 'no-cache',
      'x-custom': 'custom-value'
    });
  });
});