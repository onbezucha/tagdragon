import { describe, it, expect } from 'vitest';
import { merkury } from '../../src/providers/merkury';

describe('Merkury', () => {
  describe('pattern', () => {
    const { pattern } = merkury;

    it('should match d.merkury.com domain', () => {
      expect(pattern.test('https://d.merkury.com/track')).toBe(true);
    });

    it('should match d.merkury.com with path', () => {
      expect(pattern.test('https://d.merkury.com/analytics/event')).toBe(true);
    });

    it('should match with query params', () => {
      expect(pattern.test('https://d.merkury.com/pixel?event=view')).toBe(true);
    });

    it('should match www subdomain', () => {
      expect(pattern.test('https://www.d.merkury.com/collect')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://merkury.com/home')).toBe(false);
      expect(pattern.test('https://www.merkury.io')).toBe(false);
      expect(pattern.test('https://d.merkury.co')).toBe(false);
      expect(pattern.test('https://tag.merkury.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract event from URL params', () => {
      const url = 'https://d.merkury.com/track?event=pageview';
      const result = merkury.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'pageview',
        _eventName: 'pageview',
      });
    });

    it('should extract mid (Merkury ID) from URL params', () => {
      const url = 'https://d.merkury.com/collect?mid= merk_abc123';
      const result = merkury.parseParams(url, null);

      expect(result).toMatchObject({
        'Merkury ID': ' merk_abc123',
      });
    });

    it('should extract sv (Segment) from URL params', () => {
      const url = 'https://d.merkury.com/track?sv=segment_vip';
      const result = merkury.parseParams(url, null);

      expect(result).toMatchObject({
        Segment: 'segment_vip',
      });
    });

    it('should set _eventName to event value', () => {
      const url = 'https://d.merkury.com/pixel?event=conversion';
      const result = merkury.parseParams(url, null);

      expect(result._eventName).toBe('conversion');
    });

    it('should extract multiple params together', () => {
      const url = 'https://d.merkury.com/track?event=signup&mid=user_xyz&sv=premium_users';
      const result = merkury.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'signup',
        'Merkury ID': 'user_xyz',
        Segment: 'premium_users',
        _eventName: 'signup',
      });
    });

    it('should handle minimal params', () => {
      const url = 'https://d.merkury.com/track?event=pageview';
      const result = merkury.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'pageview',
        _eventName: 'pageview',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://d.merkury.com/collect';
      const result = merkury.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});