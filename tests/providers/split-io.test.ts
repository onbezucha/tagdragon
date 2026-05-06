import { describe, it, expect } from 'vitest';
import { splitIo } from '../../src/providers/split-io';

describe('Split Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches events.split.io/api/events', () => {
      expect(splitIo.pattern.test('https://events.split.io/api/events')).toBe(true);
    });

    it('matches events.split.io/api/events with path', () => {
      expect(splitIo.pattern.test('https://events.split.io/api/events/batch')).toBe(true);
    });

    it('matches events.split.io subdomains', () => {
      expect(splitIo.pattern.test('https://eu.events.split.io/api/events')).toBe(true);
    });

    it('does NOT match split.io alone', () => {
      expect(splitIo.pattern.test('https://split.io')).toBe(false);
    });

    it('does NOT match api.split.io (wrong path)', () => {
      expect(splitIo.pattern.test('https://api.split.io')).toBe(false);
    });

    it('does NOT match split.io/events (missing events subdomain)', () => {
      expect(splitIo.pattern.test('https://split.io/events')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Event from eventTypeId', () => {
      const postBody = [{ eventTypeId: 'page_view' }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Event).toBe('page_view');
    });

    it('extracts Key from key field', () => {
      const postBody = [{ key: 'user_123' }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Key).toBe('user_123');
    });

    it('extracts Traffic Type from trafficTypeName', () => {
      const postBody = [{ trafficTypeName: 'user' }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result['Traffic Type']).toBe('user');
    });

    it('extracts Value and converts to string', () => {
      const postBody = [{ value: 1999 }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Value).toBe('1999');
    });

    it('extracts all fields together', () => {
      const postBody = [{
        eventTypeId: 'conversion',
        key: 'user_abc',
        trafficTypeName: 'user',
        value: 49.99,
      }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Event).toBe('conversion');
      expect(result.Key).toBe('user_abc');
      expect(result['Traffic Type']).toBe('user');
      expect(result.Value).toBe('49.99');
    });

    it('sets _eventName to eventTypeId', () => {
      const postBody = [{ eventTypeId: 'test_event' }];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result._eventName).toBe('test_event');
    });

    it('handles array of events (uses first)', () => {
      const postBody = [
        { eventTypeId: 'first_event', key: 'key1' },
        { eventTypeId: 'second_event', key: 'key2' },
      ];
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Event).toBe('first_event');
      expect(result.Key).toBe('key1');
    });

    it('handles single object (not array)', () => {
      const postBody = { eventTypeId: 'single_event', key: 'single_key' };
      const result = splitIo.parseParams('https://events.split.io/api/events', postBody);
      expect(result.Event).toBe('single_event');
      expect(result.Key).toBe('single_key');
    });

    it('returns undefined for missing fields', () => {
      const result = splitIo.parseParams('https://events.split.io/api/events', {});
      expect(result.Event).toBeUndefined();
      expect(result.Key).toBeUndefined();
      expect(result['Traffic Type']).toBeUndefined();
      expect(result.Value).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      const result = splitIo.parseParams('https://events.split.io/api/events', []);
      expect(result.Event).toBeUndefined();
    });
  });
});