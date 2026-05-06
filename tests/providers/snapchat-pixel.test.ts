import { describe, it, expect } from 'vitest';
import { snapchatPixel } from '../../src/providers/snapchat-pixel';

describe('Snapchat Pixel Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches tr.snapchat.com', () => {
      expect(
        snapchatPixel.pattern.test('https://tr.snapchat.com/ads pixel/123')
      ).toBe(true);
    });

    it('matches tr.snapchat.com with subpath', () => {
      expect(
        snapchatPixel.pattern.test('https://tr.snapchat.com/ads pixel/abc123/event')
      ).toBe(true);
    });

    it('matches snapkit.com/v1/advertising', () => {
      expect(
        snapchatPixel.pattern.test('https://snapkit.com/v1/advertising?pixel_id=ABC')
      ).toBe(true);
    });

    it('does NOT match snapchat.com', () => {
      expect(
        snapchatPixel.pattern.test('https://www.snapchat.com/')
      ).toBe(false);
    });

    it('does NOT match www.snapchat.com', () => {
      expect(
        snapchatPixel.pattern.test('https://www.snapchat.com/explore')
      ).toBe(false);
    });

    it('does NOT match tr.snapkit.com', () => {
      expect(
        snapchatPixel.pattern.test('https://tr.snapkit.com/ads pixel/123')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts event_type, pixel_id, value, currency from POST JSON', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"PURCHASE","pixel_id":"ABC123","value":49.99,"currency":"USD"}'
      );
      expect(result.Event).toBe('PURCHASE');
      expect(result['Pixel ID']).toBe('ABC123');
      expect(result.Value).toBe('49.99');
      expect(result.Currency).toBe('USD');
    });

    it('extracts transaction_id', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"PURCHASE","pixel_id":"ABC","transaction_id":"TXN-456"}'
      );
      expect(result['Transaction ID']).toBe('TXN-456');
    });

    it('extracts item_ids and stringifies array', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"VIEW_ITEM","item_ids":["SKU001","SKU002"]}'
      );
      expect(result['Item IDs']).toBe('["SKU001","SKU002"]');
    });

    it('extracts item_category and number_items', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"ADD_TO_CART","item_category":"electronics","number_items":3}'
      );
      expect(result['Item Category']).toBe('electronics');
      expect(result['Number Items']).toBe('3');
    });

    it('extracts price', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"VIEW_ITEM","price":19.99}'
      );
      expect(result.Price).toBe('19.99');
    });

    it('extracts user_email_sha256 and user_phone_sha256', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"SIGNUP","user_email_sha256":"abc123","user_phone_sha256":"def456"}'
      );
      expect(result['Email (SHA256)']).toBe('abc123');
      expect(result['Phone (SHA256)']).toBe('def456');
    });

    it('extracts page_url and page_title', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"PAGE_VIEW","page_url":"https://example.com/product","page_title":"Product"}'
      );
      expect(result['Page URL']).toBe('https://example.com/product');
      expect(result['Page Title']).toBe('Product');
    });

    it('extracts UTM parameters', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"summer-sale"}'
      );
      expect(result['UTM Source']).toBe('google');
      expect(result['UTM Medium']).toBe('cpc');
      expect(result['UTM Campaign']).toBe('summer-sale');
    });

    it('sets _eventName from body.event_type only', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        '{"event_type":"COMPLETE_REGISTRATION"}'
      );
      expect(result._eventName).toBe('COMPLETE_REGISTRATION');
    });

    it('extracts event_type and pixel_id from URL params', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123?event_type=VIEW_ITEM&pixel_id=XYZ',
        undefined
      );
      expect(result.Event).toBe('VIEW_ITEM');
      expect(result['Pixel ID']).toBe('XYZ');
    });

    it('extracts value from URL params', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123?event_type=PURCHASE&value=25.00&currency=EUR',
        undefined
      );
      expect(result.Event).toBe('PURCHASE');
      expect(result.Value).toBe('25.00');
      expect(result.Currency).toBe('EUR');
    });

    it('extracts user_email from URL params', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123?event_type=SIGNUP&user_email=sha256hash',
        undefined
      );
      expect(result['Email (SHA256)']).toBe('sha256hash');
    });

    it('body takes precedence over URL params', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123?event_type=PAGE_VIEW&value=10',
        '{"event_type":"PURCHASE","value":100}'
      );
      expect(result.Event).toBe('PURCHASE');
      expect(result.Value).toBe('100');
    });

    it('handles postBody as JSON string', () => {
      const postBody = JSON.stringify({
        event_type: 'ADD_TO_WISHLIST',
        pixel_id: 'PIXEL123',
        value: 15.99,
        currency: 'GBP'
      });
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        postBody
      );
      expect(result.Event).toBe('ADD_TO_WISHLIST');
      expect(result['Pixel ID']).toBe('PIXEL123');
      expect(result.Value).toBe('15.99');
      expect(result.Currency).toBe('GBP');
    });

    it('handles empty postBody', () => {
      const result = snapchatPixel.parseParams(
        'https://tr.snapchat.com/ads pixel/123',
        undefined
      );
      expect(result.Event).toBeUndefined();
      expect(result['Pixel ID']).toBeUndefined();
    });
  });
});
