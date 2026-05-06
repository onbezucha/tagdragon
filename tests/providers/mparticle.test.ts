import { describe, it, expect } from 'vitest';
import { mparticle } from '../../src/providers/mparticle';

describe('mParticle Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches nativesdks.mparticle.com/v2 endpoint', () => {
      expect(
        mparticle.pattern.test('https://nativesdks.mparticle.com/v2/events?key=api-key-123')
      ).toBe(true);
    });

    it('matches api.mparticle.com/v2 endpoint', () => {
      expect(
        mparticle.pattern.test('https://api.mparticle.com/v2/events?key=api-key-456')
      ).toBe(true);
    });

    it('matches v2 with batch endpoint', () => {
      expect(
        mparticle.pattern.test('https://api.mparticle.com/v2/batch?key=test-key')
      ).toBe(true);
    });

    it('does NOT match older v1 endpoints', () => {
      expect(
        mparticle.pattern.test('https://api.mparticle.com/v1/events?key=old-key')
      ).toBe(false);
    });

    it('does NOT match unrelated analytics URLs', () => {
      expect(
        mparticle.pattern.test('https://www.google-analytics.com/collect?v=2')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts event name from events[0].data.event_name', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'navigation',
            data: {
              event_name: 'page_view'
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result.Event).toBe('page_view');
    });

    it('extracts event_type from events[0].event_type', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'commerce_event',
            data: {
              event_name: 'purchase'
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['Event Type']).toBe('commerce_event');
    });

    it('extracts User ID from user_identities.customerid', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {
              event_name: 'test'
            }
          }
        ],
        user_identities: {
          customerid: 'user-abc-123'
        }
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['User ID']).toBe('user-abc-123');
    });

    it('extracts Environment from body.environment', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {}
          }
        ],
        environment: 'development'
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result.Environment).toBe('development');
    });

    it('extracts API Key from URL parameter', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {}
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=my-api-key',
        postBody
      );
      expect(result['API Key']).toBe('my-api-key');
    });

    it('extracts custom_attributes with title-cased keys', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'custom_event',
            data: {
              event_name: 'button_click',
              custom_attributes: {
                button_name: 'Submit',
                click_count: 5
              }
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['Button Name']).toBe('Submit');
      expect(result['Click Count']).toBe('5');
    });

    it('extracts user_attributes with "(user)" suffix', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {}
          }
        ],
        user_attributes: {
          email: 'user@example.com',
          loyalty_tier: 'gold'
        }
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['Email (user)']).toBe('user@example.com');
      expect(result['Loyalty Tier (user)']).toBe('gold');
    });

    it('extracts product_action and action type', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'commerce_event',
            data: {
              event_name: 'purchase',
              product_action: {
                action: 'purchase',
                products: [
                  {
                    id: 'SKU123',
                    name: 'Widget',
                    quantity: 2,
                    price: 19.99
                  }
                ]
              }
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['Product Action']).toBe('purchase');
      expect(result.Products).toBe(
        '[\n  {\n    "id": "SKU123",\n    "name": "Widget",\n    "quantity": 2,\n    "price": 19.99\n  }\n]'
      );
    });

    it('extracts SDK Version from body.sdk', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {}
          }
        ],
        sdk: 'iOS/8.0.0'
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['SDK Version']).toBe('iOS/8.0.0');
    });

    it('extracts Batch ID from body.batch_id', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown',
            data: {}
          }
        ],
        batch_id: 'batch-uuid-789'
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result['Batch ID']).toBe('batch-uuid-789');
    });

    it('sets _eventName from data.event_name', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'custom_event',
            data: {
              event_name: 'signup_complete'
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result._eventName).toBe('signup_complete');
    });

    it('returns undefined for missing event data', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'unknown'
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result.Event).toBeUndefined();
      expect(result._eventName).toBeUndefined();
    });

    it('handles empty events array gracefully', () => {
      const postBody = JSON.stringify({
        events: [],
        environment: 'production'
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result.Environment).toBe('production');
      expect(result.Event).toBeUndefined();
    });

    it('handles empty custom_attributes gracefully', () => {
      const postBody = JSON.stringify({
        events: [
          {
            event_type: 'custom_event',
            data: {
              event_name: 'test',
              custom_attributes: {}
            }
          }
        ]
      });
      const result = mparticle.parseParams(
        'https://api.mparticle.com/v2/events?key=key123',
        postBody
      );
      expect(result.Event).toBe('test');
    });
  });
});