import { describe, it, expect } from 'vitest';
import { demandbase } from '../../src/providers/demandbase';

describe('Demandbase', () => {
  describe('pattern', () => {
    const { pattern } = demandbase;

    it('should match tag.demandbase.com domain', () => {
      expect(pattern.test('https://tag.demandbase.com/tracker')).toBe(true);
    });

    it('should match tag.demandbase.com with path', () => {
      expect(pattern.test('https://tag.demandbase.com/analytics/collect')).toBe(true);
    });

    it('should match api.demandbase.com domain', () => {
      expect(pattern.test('https://api.demandbase.com/identify')).toBe(true);
    });

    it('should match api.demandbase.com with endpoint', () => {
      expect(pattern.test('https://api.demandbase.com/v1/enrich')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://demandbase.com/home')).toBe(false);
      expect(pattern.test('https://www.demandbase.io')).toBe(false);
      expect(pattern.test('https://tracker.demandbase.co')).toBe(false);
      expect(pattern.test('https://demandbase-analytics.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract company_id from URL params', () => {
      const url = 'https://tag.demandbase.com/track?company_id=comp_12345';
      const result = demandbase.parseParams(url, null);

      expect(result).toMatchObject({
        'Company ID': 'comp_12345',
      });
    });

    it('should extract company_name from URL params', () => {
      const url = 'https://api.demandbase.com/identify?company_name=Acme%20Corp';
      const result = demandbase.parseParams(url, null);

      expect(result).toMatchObject({
        Company: 'Acme Corp',
      });
    });

    it('should extract key from URL params', () => {
      const url = 'https://tag.demandbase.com/collect?key=abc123xyz';
      const result = demandbase.parseParams(url, null);

      expect(result).toMatchObject({
        Key: 'abc123xyz',
      });
    });

    it('should extract page_type from URL params', () => {
      const url = 'https://tag.demandbase.com/track?page_type=product';
      const result = demandbase.parseParams(url, null);

      expect(result).toMatchObject({
        'Page Type': 'product',
      });
    });

    it('should extract multiple params together', () => {
      const url = 'https://api.demandbase.com/enrich?company_id=acme_999&company_name=Acme%20Industries&key=secret_key&page_type=homepage';
      const result = demandbase.parseParams(url, null);

      expect(result).toMatchObject({
        'Company ID': 'acme_999',
        Company: 'Acme Industries',
        Key: 'secret_key',
        'Page Type': 'homepage',
      });
    });

    it('should handle minimal params', () => {
      const url = 'https://tag.demandbase.com/track?company_id=xyz';
      const result = demandbase.parseParams(url, null);

      expect(result).toEqual({
        'Company ID': 'xyz',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://api.demandbase.com/identify';
      const result = demandbase.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
