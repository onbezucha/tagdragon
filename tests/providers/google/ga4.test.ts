import { describe, it, expect } from 'vitest';
import { ga4 } from '../../../src/providers/google/ga4';

describe('GA4 Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches google-analytics.com/g/collect', () => {
      expect(
        ga4.pattern.test(
          'https://www.google-analytics.com/g/collect?v=2&tid=G-ABC123'
        )
      ).toBe(true);
    });

    it('matches analytics.google.com/g/collect', () => {
      expect(
        ga4.pattern.test(
          'https://analytics.google.com/g/collect?v=2&tid=G-XYZ'
        )
      ).toBe(true);
    });

    it('matches server-side GTM custom domain (/g/collect?v=2)', () => {
      expect(
        ga4.pattern.test(
          'https://custom.example.com/g/collect?v=2&tid=G-TEST'
        )
      ).toBe(true);
    });

    it('does NOT match Universal Analytics (v=1)', () => {
      expect(
        ga4.pattern.test(
          'https://www.google-analytics.com/collect?v=1&tid=UA-123-456'
        )
      ).toBe(false);
    });

    it('does NOT match unrelated Google URLs', () => {
      expect(
        ga4.pattern.test('https://www.google.com/search?q=test')
      ).toBe(false);
    });

    it('does NOT match GA4 URL without v=2 on custom domain', () => {
      expect(
        ga4.pattern.test('https://custom.example.com/g/collect?tid=G-TEST')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts event name and measurement ID from URL', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&tid=G-ABC',
        undefined
      );
      expect(result.Event).toBe('page_view');
      expect(result['Measurement ID']).toBe('G-ABC');
    });

    it('extracts params from POST body', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect',
        'en=purchase&tid=G-ABC&cu=CZK'
      );
      expect(result.Event).toBe('purchase');
      expect(result.Currency).toBe('CZK');
    });

    it('extracts dynamic event parameters (ep.*)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=view_item&ep.item_name=Shoes',
        undefined
      );
      expect(result['ep.item_name']).toBe('Shoes');
    });

    it('extracts numeric event parameters (epn.*)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=purchase&epn.value=99.99',
        undefined
      );
      expect(result['epn.value']).toBe('99.99');
    });

    it('extracts user properties (up.*)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=login&up.customer_type=premium',
        undefined
      );
      expect(result['up.customer_type']).toBe('premium');
    });

    it('extracts session info', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&sid=1234567890&sct=42&seg=1',
        undefined
      );
      expect(result['Session ID']).toBe('1234567890');
      expect(result['Session Count']).toBe('42');
      expect(result['Session Engaged']).toBe('1');
    });

    it('extracts engagement time in ms', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=user_engagement&_et=5000',
        undefined
      );
      expect(result.Engagement).toBe('5000ms');
    });

    it('returns undefined engagement for zero _et', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&_et=0',
        undefined
      );
      expect(result.Engagement).toBeUndefined();
    });

    it('extracts client ID and user ID', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&cid=12345.6789&uid=user42',
        undefined
      );
      expect(result['Client ID']).toBe('12345.6789');
      expect(result['User ID']).toBe('user42');
    });

    it('extracts page info (dl preferred over dp)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&dl=https://example.com/home&dp=/fallback',
        undefined
      );
      expect(result.Page).toBe('https://example.com/home');
    });

    it('falls back to dp when dl is missing', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&dp=/fallback',
        undefined
      );
      expect(result.Page).toBe('/fallback');
    });

    it('extracts campaign attribution IDs', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&gclid=CjwKCA&gbraid=Gb123&wbraid=Wb456&srsltid=abc123',
        undefined
      );
      expect(result.gclid).toBe('CjwKCA');
      expect(result.gbraid).toBe('Gb123');
      expect(result.wbraid).toBe('Wb456');
      expect(result.srsltid).toBe('abc123');
    });

    it('extracts consent parameters', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&gcs=G1&gcd=13A&npa=1',
        undefined
      );
      expect(result['Consent State']).toBe('G1');
      expect(result['Consent Defaults']).toBe('13A');
      expect(result['Non-personalized Ads']).toBe('1');
    });

    it('extracts product-scoped parameters (pr*)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=view_item&pr1id=SKU123&pr1nm=Product+Name',
        undefined
      );
      expect(result.pr1id).toBe('SKU123');
      expect(result.pr1nm).toBe('Product Name');
    });

    it('does not include empty/undefined campaign IDs', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&tid=G-ABC',
        undefined
      );
      expect(result.gclid).toBeUndefined();
      expect(result.dclid).toBeUndefined();
      expect(result.gbraid).toBeUndefined();
      expect(result.wbraid).toBeUndefined();
    });
  });
});
