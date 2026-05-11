import { describe, it, expect } from 'vitest';
import { getNestedValue } from '@/panel/datalayer/utils/nested-value';

describe('getNestedValue', () => {
  // ─── SIMPLE KEY ──────────────────────────
  it('should return value for simple key', () => {
    const obj = { name: 'test', value: 123 };
    expect(getNestedValue(obj, 'name')).toBe('test');
    expect(getNestedValue(obj, 'value')).toBe(123);
  });

  // ─── DOT NOTATION ────────────────────────
  it('should return nested value for dot notation path', () => {
    const obj = { a: { b: { c: 'deep' } } };
    expect(getNestedValue(obj, 'a.b.c')).toBe('deep');
  });

  it('should return nested object for intermediate path', () => {
    const obj = { a: { b: { c: 'deep' } } };
    expect(getNestedValue(obj, 'a.b')).toEqual({ c: 'deep' });
  });

  // ─── BRACKET NOTATION ────────────────────
  it('should return array element for bracket notation', () => {
    const obj = { items: ['first', 'second', 'third'] };
    expect(getNestedValue(obj, 'items[0]')).toBe('first');
    expect(getNestedValue(obj, 'items[1]')).toBe('second');
    expect(getNestedValue(obj, 'items[2]')).toBe('third');
  });

  it('should return undefined for out of bounds array index', () => {
    const obj = { items: ['first'] };
    expect(getNestedValue(obj, 'items[5]')).toBeUndefined();
  });

  // ─── MIXED NOTATION ──────────────────────
  it('should return nested value in array for mixed notation', () => {
    const obj = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(getNestedValue(obj, 'items[0].name')).toBe('first');
    expect(getNestedValue(obj, 'items[1].name')).toBe('second');
  });

  it('should handle deeply nested mixed notation', () => {
    const obj = { a: [{ b: [{ c: 'deep' }] }] };
    expect(getNestedValue(obj, 'a[0].b[0].c')).toBe('deep');
  });

  // ─── MISSING KEYS ────────────────────────
  it('should return undefined for missing key at root', () => {
    const obj = { name: 'test' };
    expect(getNestedValue(obj, 'missing')).toBeUndefined();
  });

  it('should return undefined for missing nested key', () => {
    const obj = { a: { b: 'exists' } };
    expect(getNestedValue(obj, 'a.missing')).toBeUndefined();
  });

  it('should return undefined for missing parent in path', () => {
    const obj = {};
    expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
  });

  // ─── NULL INTERMEDIATE ───────────────────
  it('should return undefined when encountering null intermediate value', () => {
    const obj = { a: null };
    expect(getNestedValue(obj, 'a')).toBeNull();
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('should return undefined for null at deeper level', () => {
    const obj = { a: { b: null } };
    expect(getNestedValue(obj, 'a.b')).toBeNull();
    expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
  });

  // ─── UNDEFINED INTERMEDIATE ──────────────
  it('should return undefined when encountering undefined intermediate value', () => {
    const obj = { a: undefined };
    expect(getNestedValue(obj, 'a')).toBeUndefined();
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('should return undefined for undefined at deeper level', () => {
    const obj = { a: { b: undefined } };
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
    expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
  });

  // ─── NON-OBJECT INTERMEDIATE ─────────────
  it('should return undefined when traversing through non-object primitive', () => {
    const obj = { a: 'string' };
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('should return undefined when traversing through number', () => {
    const obj = { a: 42 };
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('should return undefined when traversing through boolean', () => {
    const obj = { a: true };
    expect(getNestedValue(obj, 'a.b')).toBeUndefined();
  });

  it('should return undefined when traversing through array index as property', () => {
    const obj = { a: ['x', 'y'] };
    expect(getNestedValue(obj, 'a.name')).toBeUndefined();
  });

  // ─── EMPTY PATH ──────────────────────────
  it('should return undefined for empty string path', () => {
    const obj = { name: 'test' };
    // ''.split('.') returns [''], then it tries obj[''] which is undefined
    expect(getNestedValue(obj, '')).toBeUndefined();
  });

  // ─── EDGE CASES ──────────────────────────
  it('should handle empty object', () => {
    expect(getNestedValue({}, 'name')).toBeUndefined();
    expect(getNestedValue({}, 'a.b.c')).toBeUndefined();
  });

  it('should handle object with only null values', () => {
    const obj = { a: null, b: null };
    expect(getNestedValue(obj, 'a')).toBeNull();
    expect(getNestedValue(obj, 'a.c')).toBeUndefined();
  });

  it('should handle path with consecutive dots', () => {
    const obj = { a: { b: 'value' } };
    expect(getNestedValue(obj, 'a..b')).toBeUndefined();
  });

  it('should handle path with special characters in values', () => {
    const obj = { user: { 'data.name': { email: 'test@example.com' } } };
    expect(getNestedValue(obj, 'user.data\\.name.email')).toBeUndefined();
  });
});