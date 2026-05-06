import { describe, it, expect } from 'vitest';
import { braze } from '../../src/providers/braze';

describe('Braze', () => {
  describe('pattern', () => {
    const { pattern } = braze;

    it('should match Braze SDK domain with region code', () => {
      expect(pattern.test('https://sdk.iad-01.braze.com/endpoint')).toBe(true);
    });

    it('should match Braze SDK domain with different region', () => {
      expect(pattern.test('https://sdk.fra-02.braze.com/tracking')).toBe(true);
    });

    it('should match dev.appboy.com domain', () => {
      expect(pattern.test('https://dev.appboy.com/v2/track')).toBe(true);
    });

    it('should match sdk.braze.com direct domain', () => {
      expect(pattern.test('https://sdk.braze.com/i.gif')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://google.com/analytics')).toBe(false);
      expect(pattern.test('https://braze.com/marketing')).toBe(false);
      expect(pattern.test('https://www.iad-braze.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract app_id, session_id, and sdk_version from URL params', () => {
      const url = 'https://sdk.iad-01.braze.com/v3/data?app_id=abc123&session_id=session_xyz&sdk_version=4.0.1';
      const result = braze.parseParams(url, null);

      expect(result).toMatchObject({
        'App ID': 'abc123',
        'Session ID': 'session_xyz',
        'SDK Version': '4.0.1',
      });
    });

    it('should extract external_user_id from URL params', () => {
      const url = 'https://sdk.braze.com/track?external_user_id=user_456';
      const result = braze.parseParams(url, null);

      expect(result).toMatchObject({
        'User ID': 'user_456',
      });
    });

    it('should extract event name from POST JSON body', () => {
      const url = 'https://sdk.iad-01.braze.com/v2/track';
      const postBody = {
        events: [
          {
            name: 'Purchase',
            properties: {
              amount: 99.99,
              currency: 'USD',
            },
          },
        ],
      };
      const result = braze.parseParams(url, postBody);

      expect(result).toMatchObject({
        Event: 'Purchase',
        '_eventName': 'Purchase',
      });
    });

    it('should pass through ep.* properties from event properties', () => {
      const url = 'https://sdk.braze.com/track';
      const postBody = {
        events: [
          {
            name: 'ViewProduct',
            properties: {
              ep_product_id: 'prod_123',
              ep_category: 'Electronics',
              ep_price: 299.99,
            },
          },
        ],
      };
      const result = braze.parseParams(url, postBody);

      expect(result).toMatchObject({
        'ep.product_id': 'prod_123',
        'ep.category': 'Electronics',
        'ep.price': '299.99',
      });
    });

    it('should extract _eventName from eventName field', () => {
      const url = 'https://sdk.fra-01.braze.com/v3/track';
      const postBody = {
        events: [
          {
            name: 'CustomEvent',
            properties: {},
          },
        ],
      };
      const result = braze.parseParams(url, postBody);

      expect(result._eventName).toBe('CustomEvent');
    });

    it('should handle URL params and POST body together', () => {
      const url = 'https://sdk.iad-01.braze.com/v2/track?app_id=myapp&sdk_version=3.5.0';
      const postBody = {
        events: [
          {
            name: 'SignUp',
            properties: {
              ep_source: 'web',
            },
          },
        ],
      };
      const result = braze.parseParams(url, postBody);

      expect(result).toMatchObject({
        'App ID': 'myapp',
        'SDK Version': '3.5.0',
        Event: 'SignUp',
        'ep.source': 'web',
        _eventName: 'SignUp',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://sdk.braze.com/v2/track';
      const result = braze.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
