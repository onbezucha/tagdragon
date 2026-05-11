import { describe, it, expect } from 'vitest';
import { getParams, extractPath } from '../../src/providers/url-parser';

describe('getParams', () => {
  // ═══ URL query string ═════════════════════════════════════════════════════

  describe('URL query string parsing', () => {
    it('parses basic query string', () => {
      const result = getParams('https://example.com/track?a=1&b=hello');
      expect(result).toEqual({ a: '1', b: 'hello' });
    });

    it('parses empty query string', () => {
      const result = getParams('https://example.com/track');
      expect(result).toEqual({});
    });

    it('parses URL-encoded values', () => {
      const result = getParams('https://example.com/track?name=John%20Doe&email=test%40example.com');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('test@example.com');
    });

    it('handles last value for duplicate keys', () => {
      const result = getParams('https://example.com/track?key=first&key=second');
      expect(result.key).toBe('second');
    });
  });

  // ═══ POST body parsing ═══════════════════════════════════════════════════

  describe('POST body parsing', () => {
    it('merges POST body over URL params', () => {
      const result = getParams(
        'https://example.com/track?page=home',
        'page=override&extra=yes'
      );
      expect(result.page).toBe('override');
      expect(result.extra).toBe('yes');
    });

    it('handles object postBody by converting to URL-encoded', () => {
      const result = getParams(
        'https://example.com/track',
        { key1: 'value1', key2: 'value2' }
      );
      expect(result.key1).toBe('value1');
      expect(result.key2).toBe('value2');
    });

    it('handles HAR format postBody with text', () => {
      const result = getParams(
        'https://example.com/track',
        { text: 'event=test&source=ga', mimeType: 'application/x-www-form-urlencoded' }
      );
      expect(result.event).toBe('test');
      expect(result.source).toBe('ga');
    });

    it('handles empty post body', () => {
      const result = getParams('https://example.com/track?a=1', undefined);
      expect(result).toEqual({ a: '1' });
    });

    it('handles empty string post body', () => {
      const result = getParams('https://example.com/track?a=1', '');
      expect(result).toEqual({ a: '1' });
    });

    it('handles null post body', () => {
      const result = getParams('https://example.com/track?a=1', null);
      expect(result).toEqual({ a: '1' });
    });
  });

  // ═══ JSON POST body fallback ════════════════════════════════════════════

  describe('JSON POST body fallback', () => {
    it('stringifies nested objects in JSON POST body', () => {
      const result = getParams(
        'https://api.segment.io/v1/t/abc123',
        JSON.stringify({ type: 'track', event: 'page_view', properties: { page: '/home' } })
      );
      expect(result.type).toBe('track');
      expect(result.event).toBe('page_view');
      expect(result.properties).toBe('{"page":"/home"}');
      // NOT '[object Object]'
      expect(result.properties).not.toBe('[object Object]');
    });

    it('stringifies arrays in JSON POST body', () => {
      const result = getParams(
        'https://api.segment.io/v1/t/abc123',
        JSON.stringify({ events: [{ type: 'page_view' }], integrations: { Amplitude: false, Mixpanel: true } })
      );
      expect(result.events).toBe('[{"type":"page_view"}]');
      expect(result.events).not.toBe('[object Object]');
      expect(result.integrations).toBe('{"Amplitude":false,"Mixpanel":true}');
      expect(result.integrations).not.toBe('[object Object]');
    });

    it('preserves string values from JSON POST body', () => {
      const result = getParams(
        'https://api.segment.io/v1/t/abc123',
        JSON.stringify({ userId: 'user-123', anonymousId: 'anon-456' })
      );
      expect(result.userId).toBe('user-123');
      expect(result.anonymousId).toBe('anon-456');
    });

    it('stringifies numeric and boolean values from JSON POST body', () => {
      const result = getParams(
        'https://example.com/track',
        JSON.stringify({ count: 42, enabled: true, ratio: 3.14 })
      );
      expect(result.count).toBe('42');
      expect(result.enabled).toBe('true');
      expect(result.ratio).toBe('3.14');
    });

    it('skips null values in JSON POST body', () => {
      const result = getParams(
        'https://example.com/track',
        JSON.stringify({ userId: null, name: 'test' })
      );
      expect(result.userId).toBeUndefined();
      expect(result.name).toBe('test');
    });
  });

  // ═══ Edge cases ══════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('returns empty object for invalid URL with no post body', () => {
      const result = getParams('not-a-url');
      expect(result).toEqual({});
    });

    it('returns empty object for empty string URL', () => {
      const result = getParams('');
      expect(result).toEqual({});
    });
  });
});

describe('extractPath', () => {
  it('extracts first capture group', () => {
    expect(extractPath('/g/collect?v=2', /\/g\/(\w+)/)).toBe('collect');
  });

  it('returns undefined for no match', () => {
    expect(extractPath('/other/path', /\/g\/(\w+)/)).toBeUndefined();
  });

  it('extracts numeric capture group', () => {
    expect(extractPath('/v18.0/123456/events', /\/v[\d.]+\/(\d+)/)).toBe('123456');
  });
});
