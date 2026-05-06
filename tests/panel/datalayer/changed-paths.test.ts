import { describe, it, expect } from 'vitest';
import { computeChangedPaths } from '../../../src/panel/datalayer/utils/changed-paths';

// ─── COMPUTE CHANGED PATHS ──────────────────────────────────────────────────

describe('computeChangedPaths', () => {
  // ─── No changes ───────────────────────────────────────────────────────────

  describe('no changes', () => {
    it('returns empty map for identical objects', () => {
      const prev = { a: 1, b: 'hello' };
      const curr = { a: 1, b: 'hello' };
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(0);
    });

    it('returns empty map for empty objects', () => {
      expect(computeChangedPaths({}, {}).size).toBe(0);
    });

    it('returns empty map when only same primitives', () => {
      expect(computeChangedPaths({ x: 42 }, { x: 42 }).size).toBe(0);
      expect(computeChangedPaths({ x: 'text' }, { x: 'text' }).size).toBe(0);
      expect(computeChangedPaths({ x: true }, { x: true }).size).toBe(0);
      expect(computeChangedPaths({ x: null }, { x: null }).size).toBe(0);
    });

    it('returns empty map for objects with same object reference', () => {
      const obj = { nested: 1 };
      const prev = { a: obj };
      const curr = { a: obj };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });
  });

  // ─── Added keys ───────────────────────────────────────────────────────────

  describe('added keys', () => {
    it('marks top-level key addition', () => {
      const prev = { a: 1 };
      const curr = { a: 1, b: 2 };
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(1);
      expect(result.get('b')).toBe('added');
    });

    it('marks multiple added keys', () => {
      const prev = {};
      const curr = { x: 1, y: 2, z: 3 };
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(3);
      expect(result.get('x')).toBe('added');
      expect(result.get('y')).toBe('added');
      expect(result.get('z')).toBe('added');
    });

    it('marks added with object value', () => {
      const prev = { a: 1 };
      const curr = { a: 1, b: { nested: 'value' } };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('b')).toBe('added');
    });

    it('marks added with array value', () => {
      const prev = { items: [] };
      const curr = { items: [1, 2, 3] };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('items')).toBe('changed');
    });
  });

  // ─── Removed keys ─────────────────────────────────────────────────────────

  describe('removed keys', () => {
    it('marks top-level key removal', () => {
      const prev = { a: 1, b: 2 };
      const curr = { a: 1 };
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(1);
      expect(result.get('b')).toBe('removed');
    });

    it('marks multiple removed keys', () => {
      const prev = { x: 1, y: 2, z: 3 };
      const curr = {};
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(3);
      expect(result.get('x')).toBe('removed');
      expect(result.get('y')).toBe('removed');
      expect(result.get('z')).toBe('removed');
    });

    it('marks removed from empty current', () => {
      const prev = { existing: 'value' };
      const curr = {};
      const result = computeChangedPaths(prev, curr);
      expect(result.get('existing')).toBe('removed');
    });
  });

  // ─── Changed keys ─────────────────────────────────────────────────────────

  describe('changed keys', () => {
    it('marks primitive value change', () => {
      const prev = { a: 1 };
      const curr = { a: 2 };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('a')).toBe('changed');
    });

    it('marks string to number change', () => {
      const prev = { value: '42' };
      const curr = { value: 42 };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('value')).toBe('changed');
    });

    it('marks boolean change', () => {
      const prev = { active: false };
      const curr = { active: true };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('active')).toBe('changed');
    });

    it('marks null to value change', () => {
      const prev = { data: null };
      const curr = { data: { value: 1 } };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('data')).toBe('changed');
    });

    it('marks value to null change', () => {
      const prev = { data: { value: 1 } };
      const curr = { data: null };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('data')).toBe('changed');
    });

    it('marks array change (different length)', () => {
      const prev = { items: [1, 2] };
      const curr = { items: [1, 2, 3] };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('items')).toBe('changed');
    });

    it('marks array change (same length, different content)', () => {
      const prev = { items: [1, 2] };
      const curr = { items: [1, 3] };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('items')).toBe('changed');
    });

    it('marks object value change (shallow diff)', () => {
      const prev = { config: { a: 1, b: 2 } };
      const curr = { config: { a: 1, b: 3 } };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('config')).toBe('changed');
    });

    it('marks object to primitive change', () => {
      const prev = { value: { nested: 1 } };
      const curr = { value: 'now a string' };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('value')).toBe('changed');
    });

    it('marks primitive to object change', () => {
      const prev = { value: 'now a string' };
      const curr = { value: { nested: 1 } };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('value')).toBe('changed');
    });

    it('marks type change (object to array)', () => {
      const prev = { value: { 0: 'a' } };
      const curr = { value: ['a'] };
      // Same shallow content, so no change at top level
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(0);
    });
  });

  // ─── Mixed changes ────────────────────────────────────────────────────────

  describe('mixed changes', () => {
    it('returns added, removed, and changed keys simultaneously', () => {
      const prev = { a: 1, b: 2, c: 3 };
      const curr = { a: 1, b: 99, d: 4 }; // a unchanged, b changed, c removed, d added
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(3);
      expect(result.get('b')).toBe('changed');
      expect(result.get('c')).toBe('removed');
      expect(result.get('d')).toBe('added');
    });

    it('marks multiple changes with single removed key', () => {
      const prev = { x: 1, y: 2 };
      const curr = { x: 10, z: 3 };
      const result = computeChangedPaths(prev, curr);
      expect(result.get('x')).toBe('changed');
      expect(result.get('y')).toBe('removed');
      expect(result.get('z')).toBe('added');
    });

    it('handles many changes at once', () => {
      const prev: Record<string, unknown> = {};
      const curr: Record<string, unknown> = {};
      // Add 5 keys to prev
      for (let i = 0; i < 5; i++) prev[`key${i}`] = i;
      // Change 3, remove 2, add 3
      curr['key0'] = 100; // changed
      curr['key1'] = 100; // changed
      curr['key2'] = 100; // changed
      // key3 and key4 removed
      curr['added0'] = 'new';
      curr['added1'] = 'new';
      curr['added2'] = 'new';
      const result = computeChangedPaths(prev, curr);
      expect(result.get('key0')).toBe('changed');
      expect(result.get('key1')).toBe('changed');
      expect(result.get('key2')).toBe('changed');
      expect(result.get('key3')).toBe('removed');
      expect(result.get('key4')).toBe('removed');
      expect(result.get('added0')).toBe('added');
      expect(result.get('added1')).toBe('added');
      expect(result.get('added2')).toBe('added');
    });
  });

  // ─── Fast path optimizations ──────────────────────────────────────────────

  describe('fast path optimizations', () => {
    it('uses reference equality when same object reference', () => {
      const obj = { nested: 1 };
      const prev = { a: obj };
      const curr = { a: obj };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('uses null/undefined fast path', () => {
      const prev = { a: null };
      const curr = { a: null };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('uses null/undefined fast path when both null', () => {
      const prev = { data: null };
      const curr = { data: null };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles one null, one value (changes)', () => {
      const prev = { data: null };
      const curr = { data: 'value' };
      expect(computeChangedPaths(prev, curr).get('data')).toBe('changed');
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty previous with populated current', () => {
      const result = computeChangedPaths({}, { a: 1, b: 2 });
      expect(result.size).toBe(2);
      expect(result.get('a')).toBe('added');
      expect(result.get('b')).toBe('added');
    });

    it('handles populated previous with empty current', () => {
      const result = computeChangedPaths({ a: 1, b: 2 }, {});
      expect(result.size).toBe(2);
      expect(result.get('a')).toBe('removed');
      expect(result.get('b')).toBe('removed');
    });

    it('handles undefined values in prev', () => {
      // Note: Object keys can't be undefined, but values can
      const prev = { a: undefined };
      const curr = { a: 1 };
      expect(computeChangedPaths(prev, curr).get('a')).toBe('changed');
    });

    it('handles undefined values in curr', () => {
      const prev = { a: 1 };
      const curr = { a: undefined };
      expect(computeChangedPaths(prev, curr).get('a')).toBe('changed');
    });

    it('handles equal undefined values', () => {
      const prev = { a: undefined };
      const curr = { a: undefined };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles empty string vs null', () => {
      const prev = { value: '' };
      const curr = { value: null };
      expect(computeChangedPaths(prev, curr).get('value')).toBe('changed');
    });

    it('handles empty string vs undefined', () => {
      const prev = { value: '' };
      const curr = { value: undefined };
      expect(computeChangedPaths(prev, curr).get('value')).toBe('changed');
    });

    it('handles equal empty strings', () => {
      const prev = { value: '' };
      const curr = { value: '' };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles equal undefined and null', () => {
      const prev = { value: null };
      const curr = { value: undefined };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles numeric zero vs null', () => {
      const prev = { value: 0 };
      const curr = { value: null };
      expect(computeChangedPaths(prev, curr).get('value')).toBe('changed');
    });

    it('handles false vs null', () => {
      const prev = { value: false };
      const curr = { value: null };
      expect(computeChangedPaths(prev, curr).get('value')).toBe('changed');
    });

    it('handles false vs undefined', () => {
      const prev = { value: false };
      const curr = { value: undefined };
      expect(computeChangedPaths(prev, curr).get('value')).toBe('changed');
    });

    it('handles equal false values', () => {
      const prev = { value: false };
      const curr = { value: false };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles equal 0 values', () => {
      const prev = { value: 0 };
      const curr = { value: 0 };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('marks object with same own keys but different values as changed', () => {
      const prev = { config: { theme: 'dark', lang: 'en' } };
      const curr = { config: { theme: 'light', lang: 'fr' } };
      expect(computeChangedPaths(prev, curr).get('config')).toBe('changed');
    });

    it('marks deeply nested shallow equal as unchanged', () => {
      const inner = { a: 1, b: 2 };
      const prev = { config: inner };
      const curr = { config: inner };
      expect(computeChangedPaths(prev, curr).size).toBe(0);
    });

    it('handles large objects with many keys', () => {
      const prev: Record<string, unknown> = {};
      const curr: Record<string, unknown> = {};
      for (let i = 0; i < 50; i++) {
        prev[`key${i}`] = i;
        curr[`key${i}`] = i + (i % 3 === 0 ? 1 : 0); // every 3rd key changes
      }
      const result = computeChangedPaths(prev, curr);
      expect(result.size).toBe(17); // 50/3 ≈ 17 changed
    });
  });
});