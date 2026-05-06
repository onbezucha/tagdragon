import { describe, it, expect } from 'vitest';
import { deepDiff } from '../../../src/panel/datalayer/utils/diff-renderer';
import type { DiffEntry } from '@/types/datalayer';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function entriesEqual(a: DiffEntry, b: DiffEntry): boolean {
  return a.key === b.key && a.path === b.path && a.type === b.type;
}

// ─── DEEP DIFF ──────────────────────────────────────────────────────────────

describe('deepDiff', () => {
  // ─── No changes ───────────────────────────────────────────────────────────

  describe('no changes', () => {
    it('returns empty array when both objects are identical', () => {
      const prev = { a: 1, b: 'hello' };
      const curr = { a: 1, b: 'hello' };
      expect(deepDiff(prev, curr)).toEqual([]);
    });

    it('returns empty array for empty objects', () => {
      expect(deepDiff({}, {})).toEqual([]);
    });

    it('returns empty array when only primitive values match', () => {
      expect(deepDiff({ value: 42 }, { value: 42 })).toEqual([]);
      expect(deepDiff({ value: 'text' }, { value: 'text' })).toEqual([]);
      expect(deepDiff({ value: true }, { value: true })).toEqual([]);
      expect(deepDiff({ value: null }, { value: null })).toEqual([]);
    });
  });

  // ─── Added keys ───────────────────────────────────────────────────────────

  describe('added keys', () => {
    it('detects top-level key addition', () => {
      const prev = { a: 1 };
      const curr = { a: 1, b: 2 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].key).toBe('b');
      expect(result[0].path).toBe('b');
      expect(result[0].newValue).toBe(2);
    });

    it('detects nested key addition', () => {
      const prev = { a: { x: 1 } };
      const curr = { a: { x: 1, y: 2 } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].key).toBe('y');
      expect(result[0].path).toBe('a.y');
    });

    it('detects multiple added keys', () => {
      const prev = {};
      const curr = { a: 1, b: 2 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(2);
      expect(result.every(e => e.type === 'added')).toBe(true);
    });

    it('reports added nested object value', () => {
      const prev = { a: 1 };
      const curr = { a: 1, b: { nested: 'value' } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].path).toBe('b');
      expect(result[0].newValue).toEqual({ nested: 'value' });
    });
  });

  // ─── Removed keys ─────────────────────────────────────────────────────────

  describe('removed keys', () => {
    it('detects top-level key removal', () => {
      const prev = { a: 1, b: 2 };
      const curr = { a: 1 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('removed');
      expect(result[0].key).toBe('b');
      expect(result[0].path).toBe('b');
      expect(result[0].oldValue).toBe(2);
    });

    it('detects nested key removal', () => {
      const prev = { a: { x: 1, y: 2 } };
      const curr = { a: { x: 1 } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('removed');
      expect(result[0].path).toBe('a.y');
    });
  });

  // ─── Changed values ───────────────────────────────────────────────────────

  describe('changed values', () => {
    it('detects primitive value change', () => {
      const prev = { a: 1 };
      const curr = { a: 2 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
      expect(result[0].path).toBe('a');
      expect(result[0].oldValue).toBe(1);
      expect(result[0].newValue).toBe(2);
    });

    it('detects string value change', () => {
      const prev = { name: 'Alice' };
      const curr = { name: 'Bob' };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
      expect(result[0].oldValue).toBe('Alice');
      expect(result[0].newValue).toBe('Bob');
    });

    it('detects boolean value change', () => {
      const prev = { active: true };
      const curr = { active: false };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });

    it('detects null to value change', () => {
      const prev = { a: null };
      const curr = { a: 5 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });

    it('detects nested primitive change', () => {
      const prev = { ecommerce: { total: 100 } };
      const curr = { ecommerce: { total: 200 } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
      expect(result[0].path).toBe('ecommerce.total');
    });

    it('detects both added and removed keys in same diff', () => {
      const prev = { a: 1 };
      const curr = { b: 2 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(2);
      const removed = result.find(e => e.type === 'removed');
      const added = result.find(e => e.type === 'added');
      expect(removed?.key).toBe('a');
      expect(added?.key).toBe('b');
    });
  });

  // ─── Array diffing ────────────────────────────────────────────────────────

  describe('array diffing', () => {
    it('detects element added at end of array', () => {
      const prev = { items: [1, 2] };
      const curr = { items: [1, 2, 3] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].path).toBe('items[2]');
      expect(result[0].key).toBe('2');
      expect(result[0].newValue).toBe(3);
    });

    it('detects element removed from array', () => {
      const prev = { items: [1, 2, 3] };
      const curr = { items: [1, 2] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('removed');
      expect(result[0].path).toBe('items[2]');
      expect(result[0].oldValue).toBe(3);
    });

    it('detects array element change', () => {
      const prev = { items: [1, 5] };
      const curr = { items: [1, 10] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
      expect(result[0].path).toBe('items[1]');
      expect(result[0].oldValue).toBe(5);
      expect(result[0].newValue).toBe(10);
    });

    it('detects multiple array changes', () => {
      const prev = { items: [1, 2] };
      const curr = { items: [10, 20, 30] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(3);
      // Index 0: changed 1 -> 10
      // Index 1: changed 2 -> 20
      // Index 2: added 30
      expect(result.filter(e => e.type === 'changed')).toHaveLength(2);
      expect(result.filter(e => e.type === 'added')).toHaveLength(1);
    });

    it('handles nested array of objects', () => {
      const prev = { products: [{ id: 'A', price: 100 }] };
      const curr = { products: [{ id: 'A', price: 150 }] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
      expect(result[0].path).toBe('products[0].price');
    });

    it('reports added array element with object value', () => {
      const prev = { products: [] };
      const curr = { products: [{ id: 'SKU-123', name: 'Widget' }] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].path).toBe('products[0]');
    });
  });

  // ─── Deep nesting ─────────────────────────────────────────────────────────

  describe('deep nesting', () => {
    it('handles deeply nested object changes', () => {
      const prev = { a: { b: { c: { d: 1 } } } };
      const curr = { a: { b: { c: { d: 2 } } } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('a.b.c.d');
    });

    it('handles mixed additions and changes at multiple levels', () => {
      const prev = { level: { nested: { value: 1 } } };
      const curr = { level: { nested: { value: 2, added: 'new' } } };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(2);
      const changed = result.find(e => e.type === 'changed');
      const added = result.find(e => e.type === 'added');
      expect(changed?.path).toBe('level.nested.value');
      expect(added?.path).toBe('level.nested.added');
    });
  });

  // ─── Max entries ─────────────────────────────────────────────────────────

  describe('maxEntries', () => {
    it('respects maxEntries default of 100', () => {
      const prev = {};
      const curr = {};
      // Generate many changes
      for (let i = 0; i < 150; i++) {
        (prev as Record<string, unknown>)[`key${i}`] = i;
      }
      for (let i = 0; i < 150; i++) {
        (curr as Record<string, unknown>)[`key${i}`] = i + 1;
      }
      const result = deepDiff(prev, curr);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('respects custom maxEntries parameter', () => {
      const prev = { a: 1, b: 2, c: 3 };
      const curr = { a: 10, b: 20, c: 30 };
      const result = deepDiff(prev, curr, 2);
      expect(result.length).toBe(2);
    });

    it('does not exceed maxEntries with nested changes', () => {
      const prev: Record<string, unknown> = { items: [1, 2, 3, 4, 5] };
      const curr: Record<string, unknown> = { items: [10, 20, 30, 40, 50] };
      const result = deepDiff(prev, curr, 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles null values', () => {
      const prev = { value: null };
      const curr = { value: 'something' };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });

    it('handles undefined values', () => {
      const prev = { value: undefined };
      const curr = { value: 1 };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });

    it('handles array inside object', () => {
      const prev = { data: [1, 2] };
      const curr = { data: [1, 3] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });

    it('handles object containing array', () => {
      const prev = { tags: ['a', 'b'] };
      const curr = { tags: ['a', 'b', 'c'] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
    });

    it('reports multiple changes at same path as separate entries', () => {
      const prev = { items: [1] };
      const curr = { items: [2, 3] };
      const result = deepDiff(prev, curr);
      // Index 0 changed (1->2), index 1 added (3)
      expect(result).toHaveLength(2);
    });

    it('handles empty previous and current', () => {
      expect(deepDiff({}, {})).toEqual([]);
    });

    it('handles object with many keys', () => {
      const prev: Record<string, unknown> = {};
      const curr: Record<string, unknown> = {};
      for (let i = 0; i < 20; i++) {
        prev[`key${i}`] = i;
        curr[`key${i}`] = i + 1;
      }
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(20);
    });

    it('handles array with null elements', () => {
      const prev = { items: [1, null, 3] };
      const curr = { items: [1, 2, 3] };
      const result = deepDiff(prev, curr);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changed');
    });
  });
});