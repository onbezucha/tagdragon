import { describe, it, expect } from 'vitest';

import {
  parsePostBodyJson,
  titleCase,
  formatJsonValue,
  maskKey,
} from '@/providers/parse-helpers';

// ═══════════════════════════════════════════════════════════════
// PARSE POST BODY JSON
// ═══════════════════════════════════════════════════════════════

describe('parsePostBodyJson', () => {
  it('returns {} for null', () => {
    expect(parsePostBodyJson(null)).toEqual({});
  });

  it('returns {} for undefined', () => {
    expect(parsePostBodyJson(undefined)).toEqual({});
  });

  it('returns {} for empty string', () => {
    expect(parsePostBodyJson('')).toEqual({});
  });

  it('parses valid JSON string to object', () => {
    const jsonString = '{"event": "pageview", "page": "/home"}';
    expect(parsePostBodyJson(jsonString)).toEqual({ event: 'pageview', page: '/home' });
  });

  it('returns {} for invalid JSON string', () => {
    const invalidJson = 'not valid json {';
    expect(parsePostBodyJson(invalidJson)).toEqual({});
  });

  it('returns object directly when passed a plain object', () => {
    const obj = { event: 'click', target: 'button' };
    expect(parsePostBodyJson(obj)).toBe(obj);
  });

  it('handles HAR format with .text field', () => {
    const harBody = { text: '{"transaction_id": "ABC123"}' };
    expect(parsePostBodyJson(harBody)).toEqual({ transaction_id: 'ABC123' });
  });

  it('handles HAR format with .raw[0].bytes (base64)', () => {
    // "test" in base64 is "dGVzdA=="
    const harBody = { raw: [{ bytes: 'dGVzdA==' }] };
    expect(parsePostBodyJson(harBody)).toEqual({});
  });

  it('returns {} for HAR with empty text and no raw', () => {
    const harBody = { text: '', raw: [] };
    expect(parsePostBodyJson(harBody)).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════
// TITLE CASE
// ═══════════════════════════════════════════════════════════════

describe('titleCase', () => {
  it('converts snake_case to Title Case', () => {
    expect(titleCase('order_id')).toBe('Order Id');
  });

  it('converts camelCase to Title Case', () => {
    expect(titleCase('productName')).toBe('Product Name');
  });

  it('handles mixed separators', () => {
    expect(titleCase('a-b.c/d')).toBe('A B C D');
  });

  it('handles empty string', () => {
    expect(titleCase('')).toBe('');
  });

  it('capitalizes single word', () => {
    expect(titleCase('simple')).toBe('Simple');
  });

  it('preserves already Title Cased string', () => {
    expect(titleCase('already Title')).toBe('Already Title');
  });

  it('splits on camelCase boundaries', () => {
    expect(titleCase('XMLParser')).toBe('X M L Parser');
  });
});

// ═══════════════════════════════════════════════════════════════
// FORMAT JSON VALUE
// ═══════════════════════════════════════════════════════════════

describe('formatJsonValue', () => {
  it('returns undefined for null', () => {
    expect(formatJsonValue(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(formatJsonValue(undefined)).toBeUndefined();
  });

  it('returns string unchanged', () => {
    expect(formatJsonValue('hello world')).toBe('hello world');
  });

  it('converts number to string', () => {
    expect(formatJsonValue(42)).toBe('42');
  });

  it('converts boolean to string', () => {
    expect(formatJsonValue(true)).toBe('true');
    expect(formatJsonValue(false)).toBe('false');
  });

  it('pretty-prints object', () => {
    const obj = { key: 'value', count: 1 };
    const result = formatJsonValue(obj);
    expect(result).toContain('"key": "value"');
    expect(result).toContain('"count": 1');
  });

  it('pretty-prints array', () => {
    const arr = [1, 2, 3];
    const result = formatJsonValue(arr);
    expect(result).toContain('[');
    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
  });

  it('falls back to String for circular reference', () => {
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;
    const result = formatJsonValue(circular);
    expect(result).toBe('[object Object]');
  });
});

// ═══════════════════════════════════════════════════════════════
// MASK KEY
// ═══════════════════════════════════════════════════════════════

describe('maskKey', () => {
  it('returns undefined for undefined', () => {
    expect(maskKey(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(maskKey('')).toBeUndefined();
  });

  it('returns key unchanged when length is 12 or less', () => {
    expect(maskKey('short_key')).toBe('short_key');
  });

  it('returns key unchanged when length is exactly 12', () => {
    expect(maskKey('123456789012')).toBe('123456789012');
  });

  it('masks long key with first 8 chars and "..."', () => {
    // 'very_long_api_key_12345' (24 chars) → first 8 chars 'very_lon' + '...'
    expect(maskKey('very_long_api_key_12345')).toBe('very_lon...');
  });

  it('returns key unchanged when length is 13 or less', () => {
    // 'abcdefghijk' is 11 chars (≤ 12), so unchanged per maskKey logic
    // This tests the boundary: only keys > 12 chars get masked
    expect(maskKey('abcdefghijk')).toBe('abcdefghijk');
  });
});