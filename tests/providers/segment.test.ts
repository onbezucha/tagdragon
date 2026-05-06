import { describe, it, expect } from 'vitest';
import { segment } from '../../src/providers/segment';

describe('Segment Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches api.segment.io/v1/t/', () => {
      expect(
        segment.pattern.test('https://api.segment.io/v1/t/abc123key')
      ).toBe(true);
    });

    it('matches api.segment.io/v1/p/', () => {
      expect(
        segment.pattern.test('https://api.segment.io/v1/p/abc123key')
      ).toBe(true);
    });

    it('matches segmentapis.com/v1/t/', () => {
      expect(
        segment.pattern.test('https://segmentapis.com/v1/t/abc123key')
      ).toBe(true);
    });

    it('matches cdn.segment.com/v1/t/', () => {
      expect(
        segment.pattern.test('https://cdn.segment.com/v1/t/abc123key')
      ).toBe(true);
    });

    it('matches cdn.segment.com/v1/i/', () => {
      expect(
        segment.pattern.test('https://cdn.segment.com/v1/i/abc123key')
      ).toBe(true);
    });

    it('matches cdn.segment.com/v1/g/', () => {
      expect(
        segment.pattern.test('https://cdn.segment.com/v1/g/abc123key')
      ).toBe(true);
    });

    it('matches cdn.segment.com/v1/a/', () => {
      expect(
        segment.pattern.test('https://cdn.segment.com/v1/a/abc123key')
      ).toBe(true);
    });

    it('does NOT match cdn.segment.com/v1/analytics.js', () => {
      expect(
        segment.pattern.test('https://cdn.segment.com/v1/analytics.js')
      ).toBe(false);
    });

    it('does NOT match segment.com/pricing', () => {
      expect(segment.pattern.test('https://segment.com/pricing')).toBe(false);
    });

    it('does NOT match segment.com (no path)', () => {
      expect(segment.pattern.test('https://segment.com')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts basic event parameters', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Button Clicked',
        userId: 'user_123',
        anonymousId: 'anon_456',
        messageId: 'msg_789',
        timestamp: '2024-01-01T12:00:00.000Z',
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result.Type).toBe('track');
      expect(result.Event).toBe('Button Clicked');
      expect(result['User ID']).toBe('user_123');
      expect(result['Anonymous ID']).toBe('anon_456');
      expect(result['Message ID']).toBe('msg_789');
      expect(result.Timestamp).toBe('2024-01-01T12:00:00.000Z');
    });

    it('extracts context.page.url and context.page.title', () => {
      const postBody = JSON.stringify({
        type: 'page',
        event: 'Page Viewed',
        context: {
          page: {
            url: 'https://example.com/products',
            title: 'Our Products',
          },
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['Page URL']).toBe('https://example.com/products');
      expect(result['Page Title']).toBe('Our Products');
    });

    it('extracts context.page.referrer', () => {
      const postBody = JSON.stringify({
        type: 'page',
        context: {
          page: {
            referrer: 'https://google.com',
          },
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/p/writekey123',
        postBody
      );

      expect(result.Referrer).toBe('https://google.com');
    });

    it('extracts context.campaign fields', () => {
      const postBody = JSON.stringify({
        type: 'track',
        context: {
          campaign: {
            source: 'google',
            medium: 'cpc',
            name: 'spring_sale',
          },
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['Campaign Source']).toBe('google');
      expect(result['Campaign Medium']).toBe('cpc');
      expect(result['Campaign Name']).toBe('spring_sale');
    });

    it('extracts context.userAgent and context.ip', () => {
      const postBody = JSON.stringify({
        type: 'track',
        context: {
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1',
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['User Agent']).toBe('Mozilla/5.0');
      expect(result.IP).toBe('192.168.1.1');
    });

    it('passes through properties with titleCase', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Order Completed',
        properties: {
          order_id: 'order_123',
          total_amount: 99.99,
          product_name: 'Widget',
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['Order Id']).toBe('order_123');
      expect(result['Total Amount']).toBe('99.99');
      expect(result['Product Name']).toBe('Widget');
    });

    it('passes through traits with " (trait)" suffix', () => {
      const postBody = JSON.stringify({
        type: 'identify',
        traits: {
          email: 'test@example.com',
          first_name: 'John',
          plan_tier: 'premium',
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/i/writekey123',
        postBody
      );

      expect(result['Email (trait)']).toBe('test@example.com');
      expect(result['First Name (trait)']).toBe('John');
      expect(result['Plan Tier (trait)']).toBe('premium');
    });

    it('formats nested property values as JSON', () => {
      const postBody = JSON.stringify({
        type: 'track',
        properties: {
          items: [
            { id: 'prod_1', quantity: 2 },
            { id: 'prod_2', quantity: 1 },
          ],
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result.Items).toContain('prod_1');
      expect(result.Items).toContain('quantity');
    });

    it('masks write key when longer than 12 characters', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/verylongwritekey12345',
        postBody
      );

      expect(result['Write Key']).toBe('verylong...');
    });

    it('shows full write key when 12 characters or less', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/shortkey1234',
        postBody
      );

      expect(result['Write Key']).toBe('shortkey1234');
    });

    it('shows full write key at exactly 12 characters', () => {
      const postBody = JSON.stringify({ type: 'track' });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/exactly12ch',
        postBody
      );

      expect(result['Write Key']).toBe('exactly12ch');
    });

    it('extracts disabled destinations from integrations where value is false', () => {
      const postBody = JSON.stringify({
        type: 'track',
        integrations: {
          'Google Analytics': true,
          Amplitude: false,
          Mixpanel: false,
          Salesforce: true,
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['Disabled Destinations']).toBe('Amplitude, Mixpanel');
    });

    it('does not include Disabled Destinations when none are disabled', () => {
      const postBody = JSON.stringify({
        type: 'track',
        integrations: {
          'Google Analytics': true,
          Amplitude: true,
        },
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result['Disabled Destinations']).toBeUndefined();
    });

    it('sets _eventName from body.event', () => {
      const postBody = JSON.stringify({
        type: 'track',
        event: 'Add to Cart',
      });

      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        postBody
      );

      expect(result._eventName).toBe('Add to Cart');
    });

    it('handles object postBody (not JSON string)', () => {
      const postBody = {
        type: 'page',
        event: 'Product Page Viewed',
        context: {
          page: {
            url: 'https://shop.example.com/item/123',
          },
        },
      };

      const result = segment.parseParams(
        'https://api.segment.io/v1/p/writekey123',
        postBody
      );

      expect(result.Type).toBe('page');
      expect(result.Event).toBe('Product Page Viewed');
      expect(result['Page URL']).toBe('https://shop.example.com/item/123');
    });

    it('handles undefined postBody gracefully', () => {
      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        undefined
      );

      expect(result.Type).toBeUndefined();
      expect(result.Event).toBeUndefined();
      // writekey123 is 11 chars, so it's NOT masked (threshold is >12 chars)
      expect(result['Write Key']).toBe('writekey123');
    });

    it('handles empty string postBody gracefully', () => {
      const result = segment.parseParams(
        'https://api.segment.io/v1/t/writekey123',
        ''
      );

      expect(result.Type).toBeUndefined();
      expect(result.Event).toBeUndefined();
    });
  });
});