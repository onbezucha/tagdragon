import { describe, it, expect } from 'vitest';
import { metaPixel } from '../../../src/providers/meta/pixel';

describe('Meta Pixel Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches facebook.com/tr?id=', () => {
      expect(
        metaPixel.pattern.test('https://www.facebook.com/tr?id=123456')
      ).toBe(true);
    });

    it('matches facebook.com/tr/?id= (with trailing slash)', () => {
      expect(
        metaPixel.pattern.test('https://www.facebook.com/tr/?id=123456')
      ).toBe(true);
    });

    it('does NOT match facebook.com/', () => {
      expect(metaPixel.pattern.test('https://www.facebook.com/')).toBe(false);
    });

    it('does NOT match facebook.com/tracking', () => {
      expect(
        metaPixel.pattern.test('https://www.facebook.com/tracking')
      ).toBe(false);
    });

    it('does NOT match www.facebook.com/feed', () => {
      expect(
        metaPixel.pattern.test('https://www.facebook.com/feed')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts basic event parameters', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&ev=PageView&dl=https://example.com',
        undefined
      );
      expect(result.Event).toBe('PageView');
      expect(result['Pixel ID']).toBe('123456');
      expect(result['Page URL']).toBe('https://example.com');
    });

    it('sets _eventName from ev param', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&ev=ViewContent',
        undefined
      );
      expect(result._eventName).toBe('ViewContent');
    });

    it('formats cd[contents] as JSON pretty-print', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456',
        'cd[contents]={"id":"prod1","quantity":2}'
      );
      expect(result.Contents).toBe('{\n  "id": "prod1",\n  "quantity": 2\n}');
    });

    it('keeps cd[contents] as raw string if not valid JSON', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456',
        'cd[contents]=not-json'
      );
      expect(result.Contents).toBe('not-json');
    });

    it('combines sw and sh into Screen Resolution', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&sw=1920&sh=1080',
        undefined
      );
      expect(result['Screen Resolution']).toBe('1920 × 1080');
    });

    it('formats plt (page load time) as milliseconds', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&plt=1234.4',
        undefined
      );
      expect(result['Page Load Time']).toBe('1234ms');
    });

    it('leaves Screen Resolution undefined when sw is missing', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&sh=1080',
        undefined
      );
      expect(result['Screen Resolution']).toBeUndefined();
    });

    it('collects expv2[*] experiment flags', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&expv2[a]=variantA&expv2[b]=variantB',
        undefined
      );
      expect(result.Experiments).toBe('variantA, variantB');
    });

    it('passes through unknown cd[*] params', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456',
        'cd[custom_field]=customValue'
      );
      expect(result['custom_field']).toBe('customValue');
    });

    it('does not pass through known cd[*] params as separate keys', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456',
        'cd[content_ids]=ABC123'
      );
      expect(result['content_ids']).toBeUndefined();
      expect(result['Content IDs']).toBe('ABC123');
    });

    it('formats it (init time) as ISO timestamp', () => {
      const timestamp = 1704067200000;
      const result = metaPixel.parseParams(
        `https://www.facebook.com/tr?id=123456&it=${timestamp}`,
        undefined
      );
      expect(result['Init Time']).toBe('2024-01-01T00:00:00.000Z');
    });

    it('extracts conversion value and currency', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&cd[value]=29.99&cd[currency]=USD',
        undefined
      );
      expect(result.Value).toBe('29.99');
      expect(result.Currency).toBe('USD');
    });

    it('extracts FBP and FBC cookies', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&fbp=fb.1.123456.789&fbc=fb.1.123456.789',
        undefined
      );
      expect(result.FBP).toBe('fb.1.123456.789');
      expect(result.FBC).toBe('fb.1.123456.789');
    });

    it('extracts content details', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456',
        'cd[content_name]=Product+Name&cd[content_type]=product&cd[num_items]=3'
      );
      expect(result['Content Name']).toBe('Product Name');
      expect(result['Content Type']).toBe('product');
      expect(result['Num Items']).toBe('3');
    });

    it('extracts consent parameters', () => {
      const result = metaPixel.parseParams(
        'https://www.facebook.com/tr?id=123456&cdl=consent_data&cf=marketing',
        undefined
      );
      expect(result['Consent Data Layer']).toBe('consent_data');
      expect(result['Consent Flag']).toBe('marketing');
    });
  });
});