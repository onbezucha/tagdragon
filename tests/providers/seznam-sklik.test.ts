import { describe, it, expect } from 'vitest';
import { seznamSklik } from '../../src/providers/seznam-sklik';

describe('Sklik', () => {
  describe('pattern', () => {
    const { pattern } = seznamSklik;

    it('should match c.seznam.cz/retargeting endpoint', () => {
      expect(pattern.test('https://c.seznam.cz/retargeting')).toBe(true);
    });

    it('should match c.seznam.cz/retargeting with params', () => {
      expect(pattern.test('https://c.seznam.cz/retargeting?ids=abc')).toBe(true);
    });

    it('should match h.seznam.cz domain', () => {
      expect(pattern.test('https://h.seznam.cz/')).toBe(true);
    });

    it('should match h.seznam.cz with path', () => {
      expect(pattern.test('https://h.seznam.cz/pixel')).toBe(true);
    });

    it('should NOT match h.seznam.cz/sid path', () => {
      expect(pattern.test('https://h.seznam.cz/sid/123')).toBe(false);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://seznam.cz/home')).toBe(false);
      expect(pattern.test('https://www.seznam.cz')).toBe(false);
      expect(pattern.test('https://sklik.seznam.cz')).toBe(false);
      expect(pattern.test('https://retargeting.seznam.cz')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract ids and parse JSON to udid', () => {
      const url = 'https://c.seznam.cz/retargeting?ids=%7B%22udid%22%3A%22user_def_123%22%7D';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        'User ID': 'user_def_123',
      });
    });

    it('should extract id from URL params', () => {
      const url = 'https://h.seznam.cz/pixel?id=account_789';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        ID: 'account_789',
      });
    });

    it('should extract value from URL params', () => {
      const url = 'https://c.seznam.cz/retargeting?value=99.99';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        Value: '99.99',
      });
    });

    it('should extract and decode url from URL params', () => {
      const url = 'https://h.seznam.cz/track?url=https%3A%2F%2Fexample.com%2Fpage';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        'Page URL': 'https://example.com/page',
      });
    });

    it('should extract consent from URL params', () => {
      const url = 'https://c.seznam.cz/retargeting?consent=1';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        Consent: '1',
      });
    });

    it('should extract type from URL path', () => {
      const url = 'https://h.seznam.cz/type/custom_type';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        Type: 'type/custom_type',
      });
    });

    it('should set _eventName to Type value from path', () => {
      const url = 'https://h.seznam.cz/type/Purchase';
      const result = seznamSklik.parseParams(url, null);

      expect(result._eventName).toBe('type/Purchase');
    });

    it('should extract multiple params including parsed ids', () => {
      const url = 'https://c.seznam.cz/retargeting?ids=%7B%22udid%22%3A%22xyz%22%7D&id=acc&value=50&url=https%3A%2F%2Ftest.com&consent=1&type=conversion';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        ID: 'acc',
        Value: '50',
        'Page URL': 'https://test.com',
        Consent: '1',
        'User ID': 'xyz',
        Type: 'retargeting',
        _eventName: 'retargeting',
      });
    });

    it('should handle h.seznam.cz without explicit type path', () => {
      const url = 'https://h.seznam.cz/pixel?id=123';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        ID: '123',
        Type: 'pixel',
      });
    });

    it('should return object with Type from path when no query params', () => {
      const url = 'https://c.seznam.cz/retargeting';
      const result = seznamSklik.parseParams(url, null);

      expect(result).toMatchObject({
        Type: 'retargeting',
        _eventName: 'retargeting',
      });
    });
  });
});