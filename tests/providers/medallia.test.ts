import { describe, it, expect } from 'vitest';
import { medallia } from '../../src/providers/medallia';

describe('Medallia DXA Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches resources.digital.medallia.com', () => {
      expect(medallia.pattern.test('https://resources.digital.medallia.com/v1/event')).toBe(true);
    });

    it('matches d.medallia.com', () => {
      expect(medallia.pattern.test('https://d.medallia.com/api/tracking')).toBe(true);
    });

    it('matches d.medallia.com with subdomain', () => {
      expect(medallia.pattern.test('https://d.medallia.com/event')).toBe(true);
    });

    it('does NOT match medallia.com alone', () => {
      expect(medallia.pattern.test('https://medallia.com')).toBe(false);
    });

    it('does NOT match other.medallia.com', () => {
      expect(medallia.pattern.test('https://other.medallia.com')).toBe(false);
    });

    it('does NOT match digital.medallia.com without resources prefix', () => {
      expect(medallia.pattern.test('https://digital.medallia.com')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Event from event param', () => {
      const url = 'https://d.medallia.com/api?event=page_view';
      const result = medallia.parseParams(url, {});
      expect(result.Event).toBe('page_view');
    });

    it('extracts Session ID from sessionId param', () => {
      const url = 'https://resources.digital.medallia.com?sessionId=sess789';
      const result = medallia.parseParams(url, {});
      expect(result['Session ID']).toBe('sess789');
    });

    it('extracts Site ID from siteId param', () => {
      const url = 'https://d.medallia.com/api?siteId=site123';
      const result = medallia.parseParams(url, {});
      expect(result['Site ID']).toBe('site123');
    });

    it('extracts all params together', () => {
      const url = 'https://d.medallia.com/api?event=test_event&sessionId=abc&siteId=xyz';
      const result = medallia.parseParams(url, {});
      expect(result.Event).toBe('test_event');
      expect(result['Session ID']).toBe('abc');
      expect(result['Site ID']).toBe('xyz');
    });

    it('sets _eventName to event value', () => {
      const url = 'https://d.medallia.com/api?event=conversion';
      const result = medallia.parseParams(url, {});
      expect(result._eventName).toBe('conversion');
    });

    it('extracts from POST body params', () => {
      const url = 'https://d.medallia.com/api';
      const postBody = { event: 'form_submit', sessionId: 'sess456', siteId: 'site789' };
      const result = medallia.parseParams(url, postBody);
      expect(result.Event).toBe('form_submit');
      expect(result['Session ID']).toBe('sess456');
      expect(result['Site ID']).toBe('site789');
    });

    it('returns undefined for missing fields', () => {
      const url = 'https://d.medallia.com/api';
      const result = medallia.parseParams(url, {});
      expect(result.Event).toBeUndefined();
      expect(result['Session ID']).toBeUndefined();
      expect(result['Site ID']).toBeUndefined();
    });
  });
});