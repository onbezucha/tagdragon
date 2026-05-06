import { describe, it, expect } from 'vitest';
import { glassbox } from '../../src/providers/glassbox';

describe('Glassbox Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches glassbox.com/record', () => {
      expect(glassbox.pattern.test('https://glassbox.com/record')).toBe(true);
    });

    it('matches glassbox.com/collector', () => {
      expect(glassbox.pattern.test('https://glassbox.com/collector')).toBe(true);
    });

    it('matches glassbox.com/api', () => {
      expect(glassbox.pattern.test('https://glassbox.com/api/v1/events')).toBe(true);
    });

    it('matches glassbox.com/data', () => {
      expect(glassbox.pattern.test('https://glassbox.com/data/sessions')).toBe(true);
    });

    it('matches glassbox.com/gb', () => {
      expect(glassbox.pattern.test('https://glassbox.com/gb/tracking')).toBe(true);
    });

    it('matches gbtr.glassbox.com', () => {
      expect(glassbox.pattern.test('https://gbtr.glassbox.com/api')).toBe(true);
    });

    it('matches gbtr.glassbox.com variant', () => {
      expect(glassbox.pattern.test('https://gbtr.glassbox.com/collect')).toBe(true);
    });

    it('does NOT match glassbox.com alone', () => {
      expect(glassbox.pattern.test('https://glassbox.com')).toBe(false);
    });

    it('does NOT match glassbox.com/about', () => {
      expect(glassbox.pattern.test('https://glassbox.com/about')).toBe(false);
    });

    it('does NOT match glassbox.com/other', () => {
      expect(glassbox.pattern.test('https://glassbox.com/other')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Session ID from sessionId param', () => {
      const url = 'https://glassbox.com/record?sessionId=sess123';
      const result = glassbox.parseParams(url, {});
      expect(result['Session ID']).toBe('sess123');
    });

    it('extracts Customer ID from customerId param', () => {
      const url = 'https://glassbox.com/collector?customerId=cust456';
      const result = glassbox.parseParams(url, {});
      expect(result['Customer ID']).toBe('cust456');
    });

    it('extracts Page URL from pageUrl param', () => {
      const url = 'https://glassbox.com/api?pageUrl=https%3A%2F%2Fexample.com';
      const result = glassbox.parseParams(url, {});
      expect(result['Page URL']).toBe('https://example.com');
    });

    it('extracts all params together', () => {
      const url = 'https://glassbox.com/record?sessionId=sess&customerId=cust&pageUrl=/home';
      const result = glassbox.parseParams(url, {});
      expect(result['Session ID']).toBe('sess');
      expect(result['Customer ID']).toBe('cust');
      expect(result['Page URL']).toBe('/home');
    });

    it('extracts from POST body params', () => {
      const url = 'https://glassbox.com/record';
      const postBody = { sessionId: 'bodySess', customerId: 'bodyCust', pageUrl: '/products' };
      const result = glassbox.parseParams(url, postBody);
      expect(result['Session ID']).toBe('bodySess');
      expect(result['Customer ID']).toBe('bodyCust');
      expect(result['Page URL']).toBe('/products');
    });

    it('returns undefined for missing fields', () => {
      const url = 'https://glassbox.com/record';
      const result = glassbox.parseParams(url, {});
      expect(result['Session ID']).toBeUndefined();
      expect(result['Customer ID']).toBeUndefined();
      expect(result['Page URL']).toBeUndefined();
    });
  });
});