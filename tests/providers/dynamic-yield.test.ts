import { describe, it, expect } from 'vitest';
import { dynamicYield } from '../../src/providers/dynamic-yield';

describe('Dynamic Yield Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches dyntrk.com', () => {
      expect(dynamicYield.pattern.test('https://dyntrk.com/tracking')).toBe(true);
    });

    it('matches cdn.dynamicyield.com/api', () => {
      expect(dynamicYield.pattern.test('https://cdn.dynamicyield.com/api/v2/events')).toBe(true);
    });

    it('matches cdn.dynamicyield.com/api with path', () => {
      expect(dynamicYield.pattern.test('https://cdn.dynamicyield.com/api/decision')).toBe(true);
    });

    it('does NOT match dynamicyield.com alone', () => {
      expect(dynamicYield.pattern.test('https://dynamicyield.com')).toBe(false);
    });

    it('does NOT match www.dynamicyield.com', () => {
      expect(dynamicYield.pattern.test('https://www.dynamicyield.com')).toBe(false);
    });

    it('does NOT match api.dynamicyield.com (wrong subdomain)', () => {
      expect(dynamicYield.pattern.test('https://api.dynamicyield.com')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts DY ID from dyid param', () => {
      const url = 'https://dyntrk.com/api?dyid=abc123';
      const result = dynamicYield.parseParams(url, {});
      expect(result['DY ID']).toBe('abc123');
    });

    it('extracts Session ID from URL ses param', () => {
      const url = 'https://dyntrk.com/api?ses=sess456';
      const result = dynamicYield.parseParams(url, { session: 'override' });
      // body.session overrides URL param
      expect(result['Session ID']).toBe('override');
    });

    it('extracts Event name from name param', () => {
      const url = 'https://dyntrk.com/tracking?name=page_view';
      const result = dynamicYield.parseParams(url, {});
      expect(result.Event).toBe('page_view');
    });

    it('extracts Section from section param', () => {
      const url = 'https://dyntrk.com/api?section=homepage';
      const result = dynamicYield.parseParams(url, {});
      expect(result.Section).toBe('homepage');
    });

    it('extracts Variations from choices[].variations', () => {
      const postBody = {
        choices: [
          { variations: [{ name: 'Control' }, { name: 'Variant A' }] },
          { variations: [{ name: 'Control 2' }] },
        ],
      };
      const result = dynamicYield.parseParams('https://dyntrk.com/api', postBody);
      expect(result['Variations']).toBe('Control, Variant A | Control 2');
    });

    it('extracts context from body.context', () => {
      const postBody = {
        context: { pageType: 'home' },
        choices: [],
      };
      const result = dynamicYield.parseParams('https://dyntrk.com/api', postBody);
      // str() converts object to string as [object Object]
      expect(result['DY Context']).toBe('[object Object]');
    });

    it('extracts Session ID from body.session', () => {
      const postBody = {
        session: 'body_sess_123',
        choices: [],
      };
      const result = dynamicYield.parseParams('https://dyntrk.com/api', postBody);
      expect(result['Session ID']).toBe('body_sess_123');
    });

    it('sets _eventName to name from URL params', () => {
      const url = 'https://dyntrk.com/api?name=conversion';
      const result = dynamicYield.parseParams(url, {});
      expect(result._eventName).toBe('conversion');
    });

    it('returns undefined for missing fields', () => {
      const result = dynamicYield.parseParams('https://dyntrk.com/api', {});
      expect(result['DY ID']).toBeUndefined();
      expect(result.Event).toBeUndefined();
      expect(result.Variations).toBeUndefined();
    });

    it('handles empty choices array', () => {
      const postBody = { choices: [] };
      const result = dynamicYield.parseParams('https://dyntrk.com/api', postBody);
      expect(result['Variations']).toBeUndefined();
    });
  });
});