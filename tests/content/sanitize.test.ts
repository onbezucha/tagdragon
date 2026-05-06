// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { sanitize } from '@/content/sanitize';

describe('sanitize', () => {
  describe('primitives', () => {
    it('passes through null', () => {
      expect(sanitize(null)).toBe(null);
    });

    it('passes through undefined', () => {
      expect(sanitize(undefined)).toBe(undefined);
    });

    it('passes through string', () => {
      expect(sanitize('hello')).toBe('hello');
    });

    it('passes through number', () => {
      expect(sanitize(42)).toBe(42);
    });

    it('passes through boolean', () => {
      expect(sanitize(true)).toBe(true);
    });
  });

  describe('non-cloneable', () => {
    it('converts function to "[function]"', () => {
      expect(sanitize(() => {})).toBe('[function]');
    });

    it('converts symbol to string', () => {
      expect(sanitize(Symbol('x'))).toBe('Symbol(x)');
    });

    it('converts bigint to string', () => {
      expect(sanitize(42n)).toBe('42');
    });
  });

  describe('depth limit', () => {
    it('returns "[max depth]" at depth > 15', () => {
      expect(sanitize({}, 16)).toBe('[max depth]');
    });
  });

  describe('arrays', () => {
    it('sanitizes array elements', () => {
      expect(sanitize([1, () => {}, 'a'])).toEqual([1, '[function]', 'a']);
    });

    it('handles nested arrays', () => {
      expect(sanitize([[1, 2]])).toEqual([[1, 2]]);
    });
  });

  describe('objects', () => {
    it('sanitizes object values', () => {
      expect(sanitize({ a: 1, b: () => {} })).toEqual({ a: 1, b: '[function]' });
    });

    it('handles nested objects', () => {
      expect(sanitize({ outer: { inner: 'val' } })).toEqual({ outer: { inner: 'val' } });
    });
  });

  describe('circular references', () => {
    it('replaces circular refs with "[circular]"', () => {
      const obj: any = {};
      obj.self = obj;
      expect(sanitize(obj)).toEqual({ self: '[circular]' });
    });
  });

  describe('DOM nodes', () => {
    it('converts Element to "[Element]"', () => {
      const el = document.createElement('div');
      expect(sanitize(el)).toBe('[Element]');
    });

    it('converts Node to "[Node]"', () => {
      const text = document.createTextNode('x');
      expect(sanitize(text)).toBe('[Node]');
    });
  });

  describe('error handling', () => {
    it('converts property access errors to "[error]"', () => {
      const objWithErrorGetter = Object.create(null);
      Object.defineProperty(objWithErrorGetter, 'bad', {
        get() {
          throw new Error('Access denied');
        },
        enumerable: true,
      });
      expect(sanitize(objWithErrorGetter)).toEqual({ bad: '[error]' });
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      expect(sanitize([])).toEqual([]);
    });

    it('handles empty object', () => {
      expect(sanitize({})).toEqual({});
    });

    it('handles mixed nested structure', () => {
      const input = { a: [1, { b: () => {} }, null], c: { d: 42n } };
      expect(sanitize(input)).toEqual({ a: [1, { b: '[function]' }, null], c: { d: '42' } });
    });
  });
});
