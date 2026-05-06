import { describe, it, expect } from 'vitest';
import { omniconvert } from '../../src/providers/omniconvert';

describe('Omniconvert Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches api.omniconvert.com', () => {
      expect(omniconvert.pattern.test('https://api.omniconvert.com')).toBe(true);
    });

    it('matches api.omniconvert.com with path', () => {
      expect(omniconvert.pattern.test('https://api.omniconvert.com/v1/track')).toBe(true);
    });

    it('matches api.omniconvert.com/collect', () => {
      expect(omniconvert.pattern.test('https://api.omniconvert.com/collect')).toBe(true);
    });

    it('does NOT match omniconvert.com alone', () => {
      expect(omniconvert.pattern.test('https://omniconvert.com')).toBe(false);
    });

    it('does NOT match www.omniconvert.com', () => {
      expect(omniconvert.pattern.test('https://www.omniconvert.com')).toBe(false);
    });

    it('does NOT match app.omniconvert.com', () => {
      expect(omniconvert.pattern.test('https://app.omniconvert.com')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Event from event param', () => {
      const url = 'https://api.omniconvert.com/track?event=page_view';
      const result = omniconvert.parseParams(url, {});
      expect(result.Event).toBe('page_view');
    });

    it('extracts Experiment ID from experiment_id param', () => {
      const url = 'https://api.omniconvert.com/track?experiment_id=exp123';
      const result = omniconvert.parseParams(url, {});
      expect(result['Experiment ID']).toBe('exp123');
    });

    it('extracts Variation ID from variation_id param', () => {
      const url = 'https://api.omniconvert.com/track?variation_id=var456';
      const result = omniconvert.parseParams(url, {});
      expect(result['Variation ID']).toBe('var456');
    });

    it('extracts all params together', () => {
      const url = 'https://api.omniconvert.com/track?event=click&experiment_id=abc&variation_id=xyz';
      const result = omniconvert.parseParams(url, {});
      expect(result.Event).toBe('click');
      expect(result['Experiment ID']).toBe('abc');
      expect(result['Variation ID']).toBe('xyz');
    });

    it('sets _eventName to event value', () => {
      const url = 'https://api.omniconvert.com/track?event=conversion';
      const result = omniconvert.parseParams(url, {});
      expect(result._eventName).toBe('conversion');
    });

    it('extracts from POST body params', () => {
      const url = 'https://api.omniconvert.com/track';
      const postBody = { event: 'form_submit', experiment_id: 'exp789', variation_id: 'var101' };
      const result = omniconvert.parseParams(url, postBody);
      expect(result.Event).toBe('form_submit');
      expect(result['Experiment ID']).toBe('exp789');
      expect(result['Variation ID']).toBe('var101');
    });

    it('returns undefined for missing fields', () => {
      const url = 'https://api.omniconvert.com/track';
      const result = omniconvert.parseParams(url, {});
      expect(result.Event).toBeUndefined();
      expect(result['Experiment ID']).toBeUndefined();
      expect(result['Variation ID']).toBeUndefined();
    });
  });
});