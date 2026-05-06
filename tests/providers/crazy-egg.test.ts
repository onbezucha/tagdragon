import { describe, it, expect } from 'vitest';
import { crazyEgg } from '../../src/providers/crazy-egg';

describe('Crazy Egg Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches crazyegg.com/pages', () => {
      expect(crazyEgg.pattern.test('https://crazyegg.com/pages')).toBe(true);
    });

    it('matches crazyegg.com/pages with path', () => {
      expect(crazyEgg.pattern.test('https://crazyegg.com/pages/snapshot/123')).toBe(true);
    });

    it('matches script.crazyegg.com', () => {
      expect(crazyEgg.pattern.test('https://script.crazyegg.com/pages/index.js')).toBe(true);
    });

    it('matches script.crazyegg.com variant', () => {
      expect(crazyEgg.pattern.test('https://script.crazyegg.com/javascript')).toBe(true);
    });

    it('does NOT match crazyegg.com alone', () => {
      expect(crazyEgg.pattern.test('https://crazyegg.com')).toBe(false);
    });

    it('does NOT match crazyegg.com/other', () => {
      expect(crazyEgg.pattern.test('https://crazyegg.com/other/path')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Account ID from ceid parameter', () => {
      const url = 'https://crazyegg.com/pages?ceid=123456';
      const result = crazyEgg.parseParams(url, {});
      expect(result['Account ID']).toBe('123456');
    });

    it('extracts Page URL from page_url parameter', () => {
      const url = 'https://crazyegg.com/pages?page_url=https%3A%2F%2Fexample.com%2Fpage';
      const result = crazyEgg.parseParams(url, {});
      expect(result['Page URL']).toBe('https://example.com/page');
    });

    it('extracts both ceid and page_url', () => {
      const url = 'https://crazyegg.com/pages?ceid=789&page_url=https%3A%2F%2Ftest.com%2Fproduct';
      const result = crazyEgg.parseParams(url, {});
      expect(result['Account ID']).toBe('789');
      expect(result['Page URL']).toBe('https://test.com/product');
    });

    it('extracts from POST body params', () => {
      const url = 'https://crazyegg.com/pages';
      const postBody = { ceid: 'abc123', page_url: '/checkout' };
      const result = crazyEgg.parseParams(url, postBody);
      expect(result['Account ID']).toBe('abc123');
      expect(result['Page URL']).toBe('/checkout');
    });

    it('returns undefined for missing fields', () => {
      const url = 'https://crazyegg.com/pages';
      const result = crazyEgg.parseParams(url, {});
      expect(result['Account ID']).toBeUndefined();
      expect(result['Page URL']).toBeUndefined();
    });
  });
});