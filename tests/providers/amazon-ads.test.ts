import { describe, it, expect } from 'vitest';
import { amazonAds } from '../../src/providers/amazon-ads';

describe('Amazon Ads', () => {
  describe('pattern', () => {
    const { pattern } = amazonAds;

    it('should match amazon-adsystem.com/e/cm endpoint', () => {
      expect(pattern.test('https://amazon-adsystem.com/e/cm')).toBe(true);
    });

    it('should match amazon-adsystem.com/e/cm with params', () => {
      expect(pattern.test('https://amazon-adsystem.com/e/cm?o=adc')).toBe(true);
    });

    it('should match amazon-adsystem.com/aax2 endpoint', () => {
      expect(pattern.test('https://amazon-adsystem.com/aax2/track')).toBe(true);
    });

    it('should match amazon-adsystem.com/aax2 with query string', () => {
      expect(pattern.test('https://amazon-adsystem.com/aax2/post?r=123')).toBe(true);
    });

    it('should match with www subdomain', () => {
      expect(pattern.test('https://www.amazon-adsystem.com/e/cm')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://amazon.com/products')).toBe(false);
      expect(pattern.test('https://advertising.amazon.com')).toBe(false);
      expect(pattern.test('https://ads.amazon.com')).toBe(false);
      expect(pattern.test('https://amazon-adsystem.co.uk/e/cm')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract o (Event) from URL params', () => {
      const url = 'https://amazon-adsystem.com/e/cm?o=adc&pt=homepage';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'adc',
        _eventName: 'adc',
      });
    });

    it('should extract pt (Page Type) from URL params', () => {
      const url = 'https://amazon-adsystem.com/e/cm?pt=detail_page';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        'Page Type': 'detail_page',
      });
    });

    it('should extract slot from URL params', () => {
      const url = 'https://amazon-adsystem.com/aax2/track?slot=right_sidebar';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        Slot: 'right_sidebar',
      });
    });

    it('should extract ref_ from URL params', () => {
      const url = 'https://amazon-adsystem.com/e/cm?ref_=abc123';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        Ref: 'abc123',
      });
    });

    it('should extract adId from URL params', () => {
      const url = 'https://amazon-adsystem.com/aax2/post?adId=ad_xyz789';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        'Ad ID': 'ad_xyz789',
      });
    });

    it('should set _eventName to o (Event) value', () => {
      const url = 'https://amazon-adsystem.com/e/cm?o=purchase';
      const result = amazonAds.parseParams(url, null);

      expect(result._eventName).toBe('purchase');
    });

    it('should extract multiple params together', () => {
      const url = 'https://amazon-adsystem.com/e/cm?o=view&pt=product&slot=main_banner&ref_=ref123&adId=amz_456';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'view',
        'Page Type': 'product',
        Slot: 'main_banner',
        Ref: 'ref123',
        'Ad ID': 'amz_456',
        _eventName: 'view',
      });
    });

    it('should handle aax2 endpoint params', () => {
      const url = 'https://amazon-adsystem.com/aax2/track?o=event&pt=category&slot=banner';
      const result = amazonAds.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'event',
        'Page Type': 'category',
        Slot: 'banner',
        _eventName: 'event',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://amazon-adsystem.com/e/cm';
      const result = amazonAds.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
