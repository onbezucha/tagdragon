import { describe, it, expect } from 'vitest';
import { tiktokPixel } from '../../src/providers/tiktok';

// ═══ Pattern matching ═══

describe('pattern matching', () => {
  it('matches analytics.tiktok.com/api/v1', () => {
    expect(tiktokPixel.pattern.test('https://analytics.tiktok.com/api/v1/track')).toBe(true);
  });

  it('matches analytics.tiktok.com/api/v2', () => {
    expect(tiktokPixel.pattern.test('https://analytics.tiktok.com/api/v2/events')).toBe(true);
  });

  it('does not match www.tiktok.com', () => {
    expect(tiktokPixel.pattern.test('https://www.tiktok.com/@user/video/123')).toBe(false);
  });

  it('does not match tiktok.com/@user', () => {
    expect(tiktokPixel.pattern.test('https://tiktok.com/@user')).toBe(false);
  });
});

// ═══ parseParams ═══

describe('parseParams', () => {
  it('extracts event and pixel_code from POST body JSON', () => {
    const url = 'https://example.com';
    const postBody = {
      event: 'PageView',
      pixel_code: 'PIXEL123',
      timestamp: '2024-01-01T00:00:00Z',
      properties: {
        value: '29.99',
        currency: 'USD',
      },
      context: {
        user: {
          ttclid: 'CLICkID123',
        },
      },
    };

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result['Event']).toBe('PageView');
    expect(result['Pixel Code']).toBe('PIXEL123');
    expect(result['Timestamp']).toBe('2024-01-01T00:00:00Z');
    expect(result['Value']).toBe('29.99');
    expect(result['Currency']).toBe('USD');
    expect(result['Click ID']).toBe('CLICkID123');
  });

  it('extracts event and pixel_code from URL params when POST body is empty', () => {
    const url = 'https://example.com?event=Click&pixel_code=PIXEL456';
    const postBody = {};

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result['Event']).toBe('Click');
    expect(result['Pixel Code']).toBe('PIXEL456');
  });

  it('passes through extra properties with titleCase', () => {
    const url = 'https://example.com';
    const postBody = {
      event: 'ViewContent',
      properties: {
        url: 'https://shop.com/product',
        value: '49.99',
        currency: 'USD',
        content_id: 'SKU123',
        content_type: 'product',
        content_name: 'Widget',
        order_id: 'ORD789',
        search_string: 'widget',
        custom_field: 'customValue',
        another_prop: 42,
      },
    };

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result['Custom Field']).toBe('customValue');
    expect(result['Another Prop']).toBe('42');
  });

  it('sets _eventName from POST body event', () => {
    const url = 'https://example.com';
    const postBody = { event: 'AddToCart' };

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result._eventName).toBe('AddToCart');
  });

  it('sets _eventName from URL event param when POST body has no event', () => {
    const url = 'https://example.com?event=CompletePayment';
    const postBody = {};

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result._eventName).toBe('CompletePayment');
  });

  it('extracts context.user and context.page fields', () => {
    const url = 'https://example.com';
    const postBody = {
      context: {
        user: {
          external_id: 'USER123',
          ttp: 'TTP_COOKIE_456',
          locale: 'en-US',
        },
        page: {
          url: 'https://shop.com/checkout',
          referrer: 'https://google.com',
        },
      },
    };

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result['User ID']).toBe('USER123');
    expect(result['TT Cookie ID']).toBe('TTP_COOKIE_456');
    expect(result['Locale']).toBe('en-US');
    expect(result['URL']).toBe('https://shop.com/checkout');
    expect(result['Referrer']).toBe('https://google.com');
  });

  it('handles null and undefined values gracefully', () => {
    const url = 'https://example.com';
    const postBody = {
      event: null,
      properties: {
        url: null,
      },
    };

    const result = tiktokPixel.parseParams(url, JSON.stringify(postBody));

    expect(result['Event']).toBeUndefined();
    expect(result['URL']).toBeUndefined();
  });
});