import { describe, it, expect } from 'vitest';
import { lytics } from '../../src/providers/lytics';

describe('Lytics', () => {
  describe('pattern', () => {
    const { pattern } = lytics;

    it('should match c.lytics.io domain', () => {
      expect(pattern.test('https://c.lytics.io/collect')).toBe(true);
    });

    it('should match c.lytics.io with path', () => {
      expect(pattern.test('https://c.lytics.io/api/event/track')).toBe(true);
    });

    it('should match c.lytics.io subdomain variants', () => {
      expect(pattern.test('https://c.lytics.io/v2/collect')).toBe(true);
      expect(pattern.test('https://c.lytics.io/lio/track')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://lytics.io/home')).toBe(false);
      expect(pattern.test('https://www.lytics.com')).toBe(false);
      expect(pattern.test('https://analytics.lytics.io')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract event from URL params', () => {
      const url = 'https://c.lytics.io/collect?event=page_view';
      const result = lytics.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'page_view',
        _eventName: 'page_view',
      });
    });

    it('should extract uid (User ID) from URL params', () => {
      const url = 'https://c.lytics.io/track?uid=user_abc123';
      const result = lytics.parseParams(url, null);

      expect(result).toMatchObject({
        'User ID': 'user_abc123',
      });
    });

    it('should extract url from URL params', () => {
      const url = 'https://c.lytics.io/collect?event=pageview&url=https%3A%2F%2Fexample.com%2Fpage';
      const result = lytics.parseParams(url, null);

      expect(result).toMatchObject({
        URL: 'https://example.com/page',
      });
    });

    it('should extract cid (Client ID) from URL params', () => {
      const url = 'https://c.lytics.io/event?cid=client_xyz_789';
      const result = lytics.parseParams(url, null);

      expect(result).toMatchObject({
        'Client ID': 'client_xyz_789',
      });
    });

    it('should extract multiple params together', () => {
      const url = 'https://c.lytics.io/collect?event=signup&uid=user_123&cid=acme_corp&url=https%3A%2F%2Fapp.example.com';
      const result = lytics.parseParams(url, null);

      expect(result).toMatchObject({
        Event: 'signup',
        'User ID': 'user_123',
        'Client ID': 'acme_corp',
        URL: 'https://app.example.com',
        _eventName: 'signup',
      });
    });

    it('should set _eventName to event value', () => {
      const url = 'https://c.lytics.io/track?event=conversion';
      const result = lytics.parseParams(url, null);

      expect(result._eventName).toBe('conversion');
    });

    it('should return empty object when no params present', () => {
      const url = 'https://c.lytics.io/collect';
      const result = lytics.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
