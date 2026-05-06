import { describe, it, expect } from 'vitest';
import { optimizely } from '../../src/providers/optimizely';

describe('Optimizely Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches optimizely.com/log/ endpoint', () => {
      expect(optimizely.pattern.test('https://cdn.optimizely.com/log/')).toBe(true);
    });

    it('matches app.optimizely.com/log/', () => {
      expect(optimizely.pattern.test('https://app.optimizely.com/log/event')).toBe(true);
    });

    it('matchescdn.optimizely.com/log/', () => {
      expect(optimizely.pattern.test('https://cdn.optimizely.com/log/tracking')).toBe(true);
    });

    it('does NOT match optimizely.com alone', () => {
      expect(optimizely.pattern.test('https://optimizely.com')).toBe(false);
    });

    it('does NOT match optimizely.com/docs', () => {
      expect(optimizely.pattern.test('https://optimizely.com/docs')).toBe(false);
    });

    it('does NOT match optimizely.com/events without log', () => {
      expect(optimizely.pattern.test('https://optimizely.com/events')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts URL params', () => {
      const url = 'https://log.optimizely.com/log?userId=usr123&accountId=acc456&projectId=proj789&experimentId=exp111&variationId=var222&eventName=click&revenue=1999';
      const result = optimizely.parseParams(url, {});
      expect(result['User ID']).toBe('usr123');
      expect(result['Account ID']).toBe('acc456');
      expect(result['Project ID']).toBe('proj789');
      expect(result['Experiment ID']).toBe('exp111');
      expect(result['Variation ID']).toBe('var222');
      expect(result.Event).toBe('click');
      expect(result.Revenue).toBe('1999');
    });

    it('extracts Variations from snapshots[0].decisions', () => {
      const postBody = {
        snapshots: [
          {
            decisions: [
              { variationId: 'v1', variationName: 'Control' },
              { variationId: 'v2', variationName: 'Variant A' },
            ],
          },
        ],
      };
      const result = optimizely.parseParams('https://log.optimizely.com/log', postBody);
      expect(result.Variations).toBe('Control, Variant A');
    });

    it('extracts Body Events from snapshots[0].events', () => {
      const postBody = {
        snapshots: [
          {
            events: [
              { eventName: 'purchase' },
              { eventName: 'signup' },
            ],
          },
        ],
      };
      const result = optimizely.parseParams('https://log.optimizely.com/log', postBody);
      expect(result['Body Events']).toBe('purchase, signup');
    });

    it('extracts clientVersion from body', () => {
      const postBody = {
        clientVersion: '3.2.1',
        snapshots: [],
      };
      const result = optimizely.parseParams('https://log.optimizely.com/log', postBody);
      expect(result['Client Version']).toBe('3.2.1');
    });

    it('extracts visitorId from body', () => {
      const postBody = {
        visitorId: 'visitor_abc',
        snapshots: [],
      };
      const result = optimizely.parseParams('https://log.optimizely.com/log', postBody);
      expect(result['Visitor ID']).toBe('visitor_abc');
    });

    it('sets _eventName to eventName from URL params', () => {
      const url = 'https://log.optimizely.com/log?eventName=page_view';
      const result = optimizely.parseParams(url, {});
      expect(result._eventName).toBe('page_view');
    });

    it('returns undefined for missing params', () => {
      const result = optimizely.parseParams('https://log.optimizely.com/log', {});
      expect(result['User ID']).toBeUndefined();
      expect(result['Account ID']).toBeUndefined();
      expect(result.Variations).toBeUndefined();
    });

    it('handles empty snapshots array', () => {
      const postBody = { snapshots: [] };
      const result = optimizely.parseParams('https://log.optimizely.com/log', postBody);
      expect(result.Variations).toBeUndefined();
      expect(result['Body Events']).toBeUndefined();
    });
  });
});