import { describe, it, expect } from 'vitest';
import { twitterPixel } from '../../src/providers/twitter-pixel';

describe('X (Twitter) Pixel', () => {
  describe('pattern', () => {
    const { pattern } = twitterPixel;

    it('should match analytics.twitter.com/i/adsct', () => {
      expect(pattern.test('https://analytics.twitter.com/i/adsct?p=123')).toBe(true);
    });

    it('should match t.co/i/adsct', () => {
      expect(pattern.test('https://t.co/i/adsct?p=456')).toBe(true);
    });

    it('should match with additional query params', () => {
      expect(pattern.test('https://analytics.twitter.com/i/adsct?twclid=abc123')).toBe(true);
    });

    it('should match both pixel URL variants with paths', () => {
      expect(pattern.test('https://t.co/i/adsct/tracking')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://twitter.com/home')).toBe(false);
      expect(pattern.test('https://ads.twitter.com/campaign')).toBe(false);
      expect(pattern.test('https://analytics.twitter.com/metrics')).toBe(false);
      expect(pattern.test('https://t.co/shortlink')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract event type from events JSON array', () => {
      const url = 'https://analytics.twitter.com/i/adsct?events=%5B%5B%22pageview%22%2C%7B%22event_id%22%3A%22evt_123%22%7D%5D%5D';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'pageview',
        _eventName: 'pageview',
      });
    });

    it('should extract p_id (Pixel ID) from URL params', () => {
      const url = 'https://t.co/i/adsct?p_id=123456789&type=tw';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Pixel ID': '123456789',
      });
    });

    it('should extract type and version from URL params', () => {
      const url = 'https://analytics.twitter.com/i/adsct?type=j&version=2.4.0';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Pixel Type': 'j',
        'Pixel Version': '2.4.0',
      });
    });

    it('should extract integration from URL params', () => {
      const url = 'https://t.co/i/adsct?integration=woocommerce&p_id=123';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Integration: 'woocommerce',
      });
    });

    it('should extract document href and title', () => {
      const url = 'https://analytics.twitter.com/i/adsct?tw_document_href=https%3A%2F%2Fexample.com&tw_document_title=Home';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Page URL': 'https://example.com',
        'Page Title': 'Home',
      });
    });

    it('should extract partner pt from URL params', () => {
      const url = 'https://t.co/i/adsct?pt=Twitter&txn_id=order_999';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Partner: 'Twitter',
        'Transaction ID': 'order_999',
      });
    });

    it('should extract sale amount and order quantity', () => {
      const url = 'https://analytics.twitter.com/i/adsct?tw_sale_amount=99.99&tw_order_quantity=2';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Sale Amount': '99.99',
        'Order Quantity': '2',
      });
    });

    it('should extract hashed PII fields', () => {
      const url = 'https://t.co/i/adsct?em=abc123hash&ph=def456hash&fn=ghi789hash&ln=jkl012hash';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Email (hashed)': 'abc123hash',
        'Phone (hashed)': 'def456hash',
        'First Name (hashed)': 'ghi789hash',
        'Last Name (hashed)': 'jkl012hash',
      });
    });

    it('should parse events JSON array and extract eventType for _eventName', () => {
      const url = 'https://analytics.twitter.com/i/adsct?events=%5B%5B%22purchase%22%2C%7B%7D%5D%5D&p_id=123';
      const result = twitterPixel.parseParams(url, null);

      expect(result._eventName).toBe('purchase');
    });

    it('should extract all params together', () => {
      const url = 'https://analytics.twitter.com/i/adsct?events=%5B%5B%22pageview%22%2C%7B%22event_id%22%3A%22view_123%22%7D%5D%5D&p_id=999&type=j&version=2.0&integration=shopify&pt=Partner';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'pageview',
        'Pixel ID': '999',
        'Pixel Type': 'j',
        'Pixel Version': '2.0',
        Integration: 'shopify',
        Partner: 'Partner',
        _eventName: 'pageview',
      });
    });

    it('should return object with empty _eventName when no params present', () => {
      const url = 'https://analytics.twitter.com/i/adsct';
      const result = twitterPixel.parseParams(url, null);

      expect(result).toMatchObject({
        _eventName: '',
      });
    });
  });
});