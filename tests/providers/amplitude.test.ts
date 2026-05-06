import { describe, it, expect } from 'vitest';
import { amplitude } from '../../src/providers/amplitude';

describe('Amplitude Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches amplitude.com/2/httpapi', () => {
      expect(
        amplitude.pattern.test('https://api.amplitude.com/2/httpapi')
      ).toBe(true);
    });

    it('matches amplitude.com/batch', () => {
      expect(
        amplitude.pattern.test('https://api.amplitude.com/batch')
      ).toBe(true);
    });

    it('does NOT match amplitude.com alone', () => {
      expect(
        amplitude.pattern.test('https://amplitude.com')
      ).toBe(false);
    });

    it('does NOT match amplitude.com/docs', () => {
      expect(
        amplitude.pattern.test('https://amplitude.com/docs')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts from events[0] in POST body', () => {
      const postBody = {
        api_key: 'test-api-key',
        events: [
          {
            event_type: 'test_event',
            user_id: 'user123',
            device_id: 'device456',
            session_id: '789',
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Event).toBe('test_event');
      expect(result['User ID']).toBe('user123');
      expect(result['Device ID']).toBe('device456');
      expect(result['Session ID']).toBe('789');
      expect(result['API Key']).toBe('test-api-key');
    });

    it('extracts event_properties with ep. prefix', () => {
      const postBody = {
        events: [
          {
            event_type: 'purchase',
            event_properties: {
              amount: 99.99,
              currency: 'USD',
              product_id: 'SKU-123',
            },
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result['ep.amount']).toBe('99.99');
      expect(result['ep.currency']).toBe('USD');
      expect(result['ep.product_id']).toBe('SKU-123');
    });

    it('extracts user_properties with up. prefix', () => {
      const postBody = {
        events: [
          {
            event_type: 'login',
            user_properties: {
              plan: 'premium',
              signup_date: '2024-01-01',
            },
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result['up.plan']).toBe('premium');
      expect(result['up.signup_date']).toBe('2024-01-01');
    });

    it('converts unix timestamp to ISO string', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
            time: 1704067200000,
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Time).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns undefined time when missing', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Time).toBeUndefined();
    });

    it('joins os_name and os_version for OS field', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
            os_name: 'iOS',
            os_version: '17.2',
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.OS).toBe('iOS 17.2');
    });

    it('joins device_brand and device_model for Device field', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
            device_brand: 'Apple',
            device_model: 'iPhone 15',
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Device).toBe('Apple iPhone 15');
    });

    it('stringifies groups object', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
            groups: {
              'org_name': 'Acme Corp',
              'plan': 'enterprise',
            },
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Groups).toBe('{"org_name":"Acme Corp","plan":"enterprise"}');
    });

    it('extracts _eventName from event_type', () => {
      const postBody = {
        events: [
          {
            event_type: 'purchase_complete',
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result._eventName).toBe('purchase_complete');
    });

    it('extracts additional event fields', () => {
      const postBody = {
        events: [
          {
            event_type: 'test',
            platform: 'iOS',
            version_name: '2.0.0',
            country: 'US',
            region: 'California',
            city: 'San Francisco',
            ip: '192.168.1.1',
            language: 'en-US',
            revenue: 49.99,
          },
        ],
      };
      const result = amplitude.parseParams(
        'https://api.amplitude.com/2/httpapi',
        postBody
      );
      expect(result.Platform).toBe('iOS');
      expect(result['App Version']).toBe('2.0.0');
      expect(result.Country).toBe('US');
      expect(result.Region).toBe('California');
      expect(result.City).toBe('San Francisco');
      expect(result.IP).toBe('192.168.1.1');
      expect(result.Language).toBe('en-US');
      expect(result.Revenue).toBe('49.99');
    });
  });
});