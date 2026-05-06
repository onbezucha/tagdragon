import { describe, it, expect, vi } from 'vitest';
import { SizeTrackingMap } from '@/devtools/panel-bridge';

function createTestMap(maxSize: number): SizeTrackingMap<string, { data: string }> {
  return new SizeTrackingMap(
    (v) => v.data.length,
    maxSize
  );
}

describe('SizeTrackingMap', () => {
  describe('Constructor & basics', () => {
    it('starts empty', () => {
      const map = createTestMap(100);
      expect(map.size).toBe(0);
      expect(map.sizeEstimate).toBe(0);
    });

    it('set and get', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      expect(map.get('a')).toEqual({ data: 'hello' });
    });

    it('has returns true for existing key', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      expect(map.has('a')).toBe(true);
    });

    it('has returns false for missing key', () => {
      const map = createTestMap(100);
      expect(map.has('z')).toBe(false);
    });

    it('delete removes entry', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      map.delete('a');
      expect(map.get('a')).toBeUndefined();
    });

    it('clear removes all entries', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      map.set('b', { data: 'world' });
      map.set('c', { data: 'test' });
      map.clear();
      expect(map.size).toBe(0);
    });
  });

  describe('Size tracking', () => {
    it('tracks sizeEstimate on set', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      expect(map.sizeEstimate).toBe(5);
    });

    it('updates sizeEstimate on delete', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      expect(map.sizeEstimate).toBe(5);
      map.delete('a');
      expect(map.sizeEstimate).toBe(0);
    });

    it('updates sizeEstimate on clear', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'hello' });
      map.set('b', { data: 'world' });
      map.clear();
      expect(map.sizeEstimate).toBe(0);
    });

    it('updates sizeEstimate when overwriting existing key', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'big_value' });
      expect(map.sizeEstimate).toBe(9);
      map.set('a', { data: 'sm' });
      expect(map.sizeEstimate).toBe(2);
    });
  });

  describe('Auto-eviction', () => {
    it('evicts oldest entry when over budget', () => {
      const map = createTestMap(100);
      map.set('a', { data: '123456789012345678901234567890123456789012345678901234567890' }); // 60 bytes
      map.set('b', { data: '123456789012345678901234567890123456789012345678901234567890' }); // 60 bytes
      map.set('c', { data: '123456789012345678901234567890123456789012345678901234567890' }); // 60 bytes
      // After third set, only c should remain (a and b evicted)
      expect(map.has('a')).toBe(false);
      expect(map.has('b')).toBe(false);
      expect(map.has('c')).toBe(true);
    });

    it('evicts multiple entries if needed', () => {
      const map = createTestMap(100);
      map.set('a', { data: '12345678901234567890123456789012345678901234567890' }); // 50 bytes
      map.set('b', { data: '12345678901234567890123456789012345678901234567890' }); // 50 bytes
      map.set('c', { data: '12345678901234567890123456789012345678901234567890' }); // 50 bytes
      map.set('d', { data: '12345678901234567890123456789012345678901234567890' }); // 50 bytes
      map.set('e', { data: '12345678901234567890123456789012345678901234567890' }); // 50 bytes
      // After eviction, oldest entries are removed but newest (e) and one other remain
      expect(map.size).toBeLessThanOrEqual(2);
      expect(map.has('e')).toBe(true);
    });

    it('does not evict when under budget', () => {
      const map = createTestMap(1000);
      map.set('a', { data: '1234567890' }); // 10 bytes
      expect(map.size).toBe(1);
      expect(map.has('a')).toBe(true);
    });
  });

  describe('Iteration', () => {
    it('keys() returns iterator', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'x' });
      map.set('b', { data: 'y' });
      map.set('c', { data: 'z' });
      expect([...map.keys()]).toEqual(['a', 'b', 'c']);
    });

    it('values() returns iterator', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'x' });
      map.set('b', { data: 'y' });
      map.set('c', { data: 'z' });
      expect([...map.values()]).toEqual([
        { data: 'x' },
        { data: 'y' },
        { data: 'z' },
      ]);
    });

    it('entries() returns iterator', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'x' });
      map.set('b', { data: 'y' });
      expect([...map.entries()]).toEqual([
        ['a', { data: 'x' }],
        ['b', { data: 'y' }],
      ]);
    });

    it('forEach iterates all entries', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'x' });
      map.set('b', { data: 'y' });
      let count = 0;
      map.forEach((value, key) => {
        count++;
      });
      expect(count).toBe(2);
    });

    it('Symbol.iterator works', () => {
      const map = createTestMap(100);
      map.set('a', { data: 'x' });
      map.set('b', { data: 'y' });
      const entries: [string, { data: string }][] = [];
      for (const [k, v] of map) {
        entries.push([k, v]);
      }
      expect(entries).toEqual([
        ['a', { data: 'x' }],
        ['b', { data: 'y' }],
      ]);
    });
  });

  describe('estimateSize helper', () => {
    it('estimateSize function is called correctly', () => {
      const estimateSize = vi.fn((v: { data: string }) => v.data.length);
      const map = new SizeTrackingMap<string, { data: string }>(estimateSize, 100);
      map.set('a', { data: 'hello' });
      expect(estimateSize).toHaveBeenCalledWith({ data: 'hello' });
      expect(estimateSize).toHaveBeenCalledTimes(1);
    });
  });
});
