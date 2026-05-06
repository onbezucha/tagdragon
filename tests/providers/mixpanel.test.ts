import { describe, it, expect } from 'vitest';
import { mixpanel } from '../../src/providers/mixpanel';

describe('Mixpanel Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches mixpanel.com/track', () => {
      expect(
        mixpanel.pattern.test('https://api.mixpanel.com/track')
      ).toBe(true);
    });

    it('matches mixpanel.com/engage', () => {
      expect(
        mixpanel.pattern.test('https://api.mixpanel.com/engage')
      ).toBe(true);
    });

    it('matches mixpanel.com/import', () => {
      expect(
        mixpanel.pattern.test('https://api.mixpanel.com/import')
      ).toBe(true);
    });

    it('does NOT match mixpanel.com alone', () => {
      expect(
        mixpanel.pattern.test('https://mixpanel.com')
      ).toBe(false);
    });

    it('does NOT match mixpanel.com/blog', () => {
      expect(
        mixpanel.pattern.test('https://mixpanel.com/blog')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('decodes base64 data param and extracts event name, distinct_id, token', () => {
      const data = btoa(
        JSON.stringify([
          {
            event: 'Page View',
            properties: {
              distinct_id: 'user1',
              token: 'abc123',
              '$browser': 'Chrome',
              page_url: 'https://example.com',
            },
          },
        ])
      );
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?data=' + data,
        undefined
      );
      expect(result.Event).toBe('Page View');
      expect(result['Distinct ID']).toBe('user1');
      expect(result.Token).toBe('abc123');
    });

    it('converts properties to titleCase with $ prefix removed', () => {
      const data = btoa(
        JSON.stringify([
          {
            event: 'test',
            properties: {
              distinct_id: 'user1',
              token: 'abc123',
              '$browser': 'Chrome',
              '$os': 'iOS',
              '$device': 'iPhone',
            },
          },
        ])
      );
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?data=' + data,
        undefined
      );
      expect(result.Browser).toBe('Chrome');
      expect(result.Os).toBe('iOS');
      expect(result.Device).toBe('iPhone');
    });

    it('excludes distinct_id and token from pass-through properties', () => {
      const data = btoa(
        JSON.stringify([
          {
            event: 'test',
            properties: {
              distinct_id: 'user1',
              token: 'abc123',
              custom_field: 'value',
            },
          },
        ])
      );
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?data=' + data,
        undefined
      );
      expect(result['Distinct ID']).toBe('user1');
      expect(result.Token).toBe('abc123');
      expect(result['Custom Field']).toBe('value');
      expect(result['distinct_id']).toBeUndefined();
      expect(result['token']).toBeUndefined();
    });

    it('falls back to URL event param when no data', () => {
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?event=button_click',
        undefined
      );
      expect(result.Event).toBe('button_click');
      expect(result._eventName).toBe('button_click');
    });

    it('uses decoded event over URL event param', () => {
      const data = btoa(
        JSON.stringify([
          {
            event: 'purchase_complete',
            properties: {
              distinct_id: 'user1',
              token: 'abc123',
            },
          },
        ])
      );
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?event=fallback_event&data=' + data,
        undefined
      );
      expect(result.Event).toBe('purchase_complete');
      expect(result._eventName).toBe('purchase_complete');
    });

    it('extracts _eventName from decoded event or URL param', () => {
      const data = btoa(
        JSON.stringify([
          {
            event: 'form_submit',
            properties: {
              distinct_id: 'user1',
              token: 'abc123',
            },
          },
        ])
      );
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/engage?data=' + data,
        undefined
      );
      expect(result._eventName).toBe('form_submit');
    });

    it('returns _eventName from URL when no data param', () => {
      const result = mixpanel.parseParams(
        'https://api.mixpanel.com/track?event=login',
        undefined
      );
      expect(result._eventName).toBe('login');
    });
  });
});