import { describe, it, expect } from 'vitest';
import { indicative } from '../../src/providers/indicative';

describe('Indicative', () => {
  describe('pattern', () => {
    const { pattern } = indicative;

    it('should match api.indicative.com/event endpoint', () => {
      expect(pattern.test('https://api.indicative.com/service/event')).toBe(true);
    });

    it('should match api.indicative.com/event with path', () => {
      expect(pattern.test('https://api.indicative.com/service/event/v2')).toBe(true);
    });

    it('should match with query params', () => {
      expect(pattern.test('https://api.indicative.com/service/event?param=value')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://indicative.com/home')).toBe(false);
      expect(pattern.test('https://www.api.indicative.com/service')).toBe(false);
      expect(pattern.test('https://analytics.indicative.com/event')).toBe(false);
      expect(pattern.test('https://indicative.com/service/event')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract eventName from POST JSON body', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'Purchase',
        uniqueId: 'user_123',
        apiKey: 'abc_key_xyz',
        properties: {
          amount: 149.99,
          currency: 'EUR',
        },
      };
      const result = indicative.parseParams(url, postBody);

      expect(result).toMatchObject({
        Event: 'Purchase',
        _eventName: 'Purchase',
      });
    });

    it('should extract uniqueId (User ID) from POST JSON body', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'Login',
        uniqueId: 'visitor_456',
        apiKey: 'key_789',
        properties: {},
      };
      const result = indicative.parseParams(url, postBody);

      expect(result).toMatchObject({
        'User ID': 'visitor_456',
      });
    });

    it('should extract apiKey from POST JSON body', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'SignUp',
        uniqueId: 'new_user',
        apiKey: 'my_api_key_123',
        properties: {},
      };
      const result = indicative.parseParams(url, postBody);

      expect(result).toMatchObject({
        'API Key': 'my_api_key_123',
      });
    });

    it('should pass through properties with titleCase transformation', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'ViewProduct',
        uniqueId: 'user_1',
        apiKey: 'key',
        properties: {
          productName: 'Wireless Headphones',
          product_id: 'prod_123',
          itemCount: 3,
          totalPrice: 299.99,
        },
      };
      const result = indicative.parseParams(url, postBody);

      expect(result['Product Name']).toBe('Wireless Headphones');
      expect(result['Product Id']).toBe('prod_123');
      expect(result['Item Count']).toBe('3');
      expect(result['Total Price']).toBe('299.99');
    });

    it('should set _eventName to eventName field', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'CustomEvent',
        uniqueId: 'user',
        apiKey: 'key',
        properties: {},
      };
      const result = indicative.parseParams(url, postBody);

      expect(result._eventName).toBe('CustomEvent');
    });

    it('should handle empty properties object', () => {
      const url = 'https://api.indicative.com/service/event';
      const postBody = {
        eventName: 'PageView',
        uniqueId: 'anon_123',
        apiKey: 'key',
        properties: {},
      };
      const result = indicative.parseParams(url, postBody);

      expect(result).toMatchObject({
        Event: 'PageView',
        'User ID': 'anon_123',
        'API Key': 'key',
        _eventName: 'PageView',
      });
    });

    it('should return empty object when no body provided', () => {
      const url = 'https://api.indicative.com/service/event';
      const result = indicative.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
