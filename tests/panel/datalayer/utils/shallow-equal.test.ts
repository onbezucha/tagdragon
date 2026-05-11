import { describe, it, expect } from 'vitest';
import { shallowEqual } from '@/panel/datalayer/utils/shallow-equal';

describe('shallowEqual', () => {
  // ─── SHALLOW EQUAL ────────────

  it('returns true for same primitive', () => {
    expect(shallowEqual(42, 42)).toBe(true);
    expect(shallowEqual('hello', 'hello')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(shallowEqual(42, 43)).toBe(false);
    expect(shallowEqual('hello', 'world')).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
  });

  it('returns false for different types', () => {
    expect(shallowEqual(42, '42')).toBe(false);
    expect(shallowEqual(false, 0)).toBe(false);
    expect(shallowEqual(123, [123])).toBe(false);
  });

  it('returns true for null === null', () => {
    expect(shallowEqual(null, null)).toBe(true);
  });

  it('returns false for null vs undefined', () => {
    expect(shallowEqual(null, undefined)).toBe(false);
  });

  it('returns true for same keys with same values', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(shallowEqual({ name: 'test' }, { name: 'test' })).toBe(true);
  });

  it('returns false for same keys with different values', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(shallowEqual({ name: 'test' }, { name: 'other' })).toBe(false);
  });

  it('returns false for different key count', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: 1, b: 2, c: 3 }, { a: 1 })).toBe(false);
  });

  it('returns true for empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it('returns false for nested objects with different refs (shallow check)', () => {
    const nestedA = { a: { b: 1 } };
    const nestedB = { a: { b: 1 } };
    expect(shallowEqual(nestedA, nestedB)).toBe(false);
  });
});
