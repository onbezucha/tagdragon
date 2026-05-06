import { describe, it, expect } from 'vitest';
import { pinterestPixel } from '../../src/providers/pinterest';

describe('Pinterest Pixel Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches ct.pinterest.com/v3/', () => {
      expect(
        pinterestPixel.pattern.test('https://ct.pinterest.com/v3/?event=PageVisit&tid=123')
      ).toBe(true);
    });

    it('matches ct.pinterest.com/user/', () => {
      expect(
        pinterestPixel.pattern.test('https://ct.pinterest.com/user/?event=Lead&cb=12345')
      ).toBe(true);
    });

    it('does NOT match pinterest.com/pin/', () => {
      expect(
        pinterestPixel.pattern.test('https://www.pinterest.com/pin/123456789/')
      ).toBe(false);
    });

    it('does NOT match www.pinterest.com', () => {
      expect(
        pinterestPixel.pattern.test('https://www.pinterest.com/')
      ).toBe(false);
    });

    it('does NOT match api.pinterest.com', () => {
      expect(
        pinterestPixel.pattern.test('https://api.pinterest.com/v5/boards')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts basic URL params (event, tid, cb)', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit&tid=123456&cb=1704067200',
        undefined
      );
      expect(result.Event).toBe('PageVisit');
      expect(result._eventName).toBe('PageVisit');
      expect(result['Tag ID']).toBe('123456');
      expect(result.Timestamp).toBe('1704067200');
    });

    it('sets _eventName from event param', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/user/?event=Checkout',
        undefined
      );
      expect(result._eventName).toBe('Checkout');
    });

    it('parses ed JSON for value, currency, order_id', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=Checkout',
        'ed={"value":29.99,"currency":"USD","order_id":"ORD-123"}'
      );
      expect(result.Value).toBe('29.99');
      expect(result.Currency).toBe('USD');
      expect(result['Order ID']).toBe('ORD-123');
    });

    it('parses ed JSON for search_query and lead_type', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=Search',
        'ed={"search_query":"running+shoes","lead_type":"SignUp"}'
      );
      expect(result['Search Query']).toBe('running shoes');
      expect(result['Lead Type']).toBe('SignUp');
    });

    it('handles ed without optional fields', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=ViewContent',
        'ed={"value":9.99}'
      );
      expect(result.Value).toBe('9.99');
      expect(result.Currency).toBeUndefined();
      expect(result['Order ID']).toBeUndefined();
    });

    it('ignores invalid ed JSON', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'ed=not-json'
      );
      expect(result.Value).toBeUndefined();
      expect(result.Currency).toBeUndefined();
    });

    it('parses pd JSON for np and gtm_version', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'pd={"np":"Pinterest","gtm_version":"2.12.0"}'
      );
      expect(result['Network Provider']).toBe('Pinterest');
      expect(result['GTM Version']).toBe('2.12.0');
    });

    it('handles pd without optional fields', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'pd={"np":"Pinterest"}'
      );
      expect(result['Network Provider']).toBe('Pinterest');
      expect(result['GTM Version']).toBeUndefined();
    });

    it('parses ad JSON for loc, ref, platform, is_eu', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'ad={"loc":"https://example.com","ref":"direct","platform":"web","is_eu":false}'
      );
      expect(result['Page URL']).toBe('https://example.com');
      expect(result.Referrer).toBe('direct');
      expect(result.Platform).toBe('web');
      expect(result['Is EU']).toBe('false');
    });

    it('combines sw and sh into Screen Resolution', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'ad={"sw":"1920","sh":"1080"}'
      );
      expect(result['Screen Resolution']).toBe('1920x1080');
    });

    it('leaves Screen Resolution undefined when sw or sh is missing', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'ad={"sw":"1920"}'
      );
      expect(result['Screen Resolution']).toBeUndefined();
    });

    it('parses dep to extract label after comma', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'dep=gclid,gclid123,session_id,ABC'
      );
      expect(result['Event Type']).toBe('gclid123');
    });

    it('returns undefined for Event Type when dep has no comma', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        'dep=single-value'
      );
      expect(result['Event Type']).toBeUndefined();
    });

    it('returns undefined for Event Type when dep is missing', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=PageVisit',
        undefined
      );
      expect(result['Event Type']).toBeUndefined();
    });

    it('handles multiple JSON params combined', () => {
      const result = pinterestPixel.parseParams(
        'https://ct.pinterest.com/v3/?event=Purchase&tid=ABC&cb=123',
        'ed={"value":100,"currency":"EUR"}&pd={"np":"Pinterest"}&ad={"loc":"https://shop.com"}'
      );
      expect(result.Event).toBe('Purchase');
      expect(result.Value).toBe('100');
      expect(result.Currency).toBe('EUR');
      expect(result['Network Provider']).toBe('Pinterest');
      expect(result['Page URL']).toBe('https://shop.com');
      expect(result['Tag ID']).toBe('ABC');
    });
  });
});
