import { describe, it, expect } from 'vitest';
import { redditPixel } from '../../src/providers/reddit-pixel';

describe('Reddit Pixel', () => {
  describe('pattern', () => {
    const { pattern } = redditPixel;

    it('should match reddit.com/rp.gif endpoint', () => {
      expect(pattern.test('https://reddit.com/rp.gif?d=1')).toBe(true);
    });

    it('should match reddit.com/rp.gif with parameters', () => {
      expect(pattern.test('https://reddit.com/rp.gif?event=PageVisit&uid=abc')).toBe(true);
    });

    it('should match www.reddit.com/rp.gif', () => {
      expect(pattern.test('https://www.reddit.com/rp.gif')).toBe(true);
    });

    it('should match with different TLDs if applicable', () => {
      expect(pattern.test('https://reddit.com/rp.gif')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://reddit.com/home')).toBe(false);
      expect(pattern.test('https://reddit.com/r/pixels')).toBe(false);
      expect(pattern.test('https://www.reddit.com/gifs')).toBe(false);
      expect(pattern.test('https://pixel.reddit.com/track')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract id (Account ID) from URL params', () => {
      const url = 'https://reddit.com/rp.gif?id=account_123';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Account ID': 'account_123',
      });
    });

    it('should extract event from URL params', () => {
      const url = 'https://reddit.com/rp.gif?event=SignUp';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'SignUp',
      });
    });

    it('should extract m.customEventName from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.customEventName=PurchaseComplete';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Custom Event Name': 'PurchaseComplete',
      });
    });

    it('should extract m.itemCount from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.itemCount=5';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Item Count': '5',
      });
    });

    it('should extract m.value from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.value=9999';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Value: '9999',
      });
    });

    it('should extract m.valueDecimal from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.valueDecimal=49.99';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Value (Decimal)': '49.99',
      });
    });

    it('should extract m.currency from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.currency=USD';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Currency: 'USD',
      });
    });

    it('should extract m.products from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.products=%5B%7B%22id%22%3A%22SKU123%22%7D%5D';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        Products: '[{"id":"SKU123"}]',
      });
    });

    it('should extract m.conversionId from URL params', () => {
      const url = 'https://reddit.com/rp.gif?m.conversionId=conv_abc';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Conversion ID': 'conv_abc',
      });
    });

    it('should prefer m.customEventName for _eventName when available', () => {
      const url = 'https://reddit.com/rp.gif?event=base_event&m.customEventName=SpecialEvent';
      const result = redditPixel.parseParams(url, null);

      expect(result._eventName).toBe('SpecialEvent');
    });

    it('should fall back to event for _eventName when m.customEventName not present', () => {
      const url = 'https://reddit.com/rp.gif?event=PageView';
      const result = redditPixel.parseParams(url, null);

      expect(result._eventName).toBe('PageView');
    });

    it('should extract multiple m.* params together', () => {
      const url = 'https://reddit.com/rp.gif?m.itemCount=2&m.value=1999&m.currency=EUR&m.conversionId=x123';
      const result = redditPixel.parseParams(url, null);

      expect(result).toMatchObject({
        'Item Count': '2',
        Value: '1999',
        Currency: 'EUR',
        'Conversion ID': 'x123',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://reddit.com/rp.gif';
      const result = redditPixel.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
