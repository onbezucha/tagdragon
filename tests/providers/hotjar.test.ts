import { describe, it, expect } from 'vitest';
import { hotjar } from '../../src/providers/hotjar';

describe('Hotjar Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches hotjar.com/h.js', () => {
      expect(hotjar.pattern.test('https://script.hotjar.com/h.js')).toBe(true);
    });

    it('matches hotjar.com/hjboot', () => {
      expect(hotjar.pattern.test('https://hotjar.com/hjboot')).toBe(true);
    });

    it('matches hotjar.com/hj.', () => {
      expect(hotjar.pattern.test('https://hotjar.com/hj.integrations')).toBe(true);
    });

    it('matches hotjar.com/api/v endpoint', () => {
      expect(hotjar.pattern.test('https://hotjar.com/api/v2/events')).toBe(true);
    });

    it('does NOT match hotjar.com alone', () => {
      expect(hotjar.pattern.test('https://hotjar.com')).toBe(false);
    });

    it('does NOT match hotjar.com/other', () => {
      expect(hotjar.pattern.test('https://hotjar.com/other/path')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Site ID from hjid parameter', () => {
      const url = 'https://hotjar.com/h.js?hjid=12345&hjsv=9';
      const result = hotjar.parseParams(url, {});
      expect(result['Site ID']).toBe('12345');
    });

    it('extracts Site ID from siteId parameter alias', () => {
      const url = 'https://hotjar.com/hjboot?siteId=67890';
      const result = hotjar.parseParams(url, {});
      expect(result['Site ID']).toBe('67890');
    });

    it('extracts Request Type from URL path', () => {
      const url = 'https://hotjar.com/h.js?hjid=123';
      const result = hotjar.parseParams(url, {});
      expect(result['Request Type']).toBe('h.js');
    });

    it('extracts hjboot as Request Type', () => {
      const url = 'https://hotjar.com/hjboot?hjid=456';
      const result = hotjar.parseParams(url, {});
      expect(result['Request Type']).toBe('hjboot');
    });

    it('sets _eventName to Request Type', () => {
      const url = 'https://hotjar.com/api/v2/events?hjid=789';
      const result = hotjar.parseParams(url, {});
      expect(result._eventName).toBe('api');
    });

    it('returns undefined for missing Site ID', () => {
      const url = 'https://hotjar.com/h.js';
      const result = hotjar.parseParams(url, {});
      expect(result['Site ID']).toBeUndefined();
    });

    it('returns undefined for missing Request Type', () => {
      const url = 'https://hotjar.com/';
      const result = hotjar.parseParams(url, {});
      expect(result['Request Type']).toBeUndefined();
    });
  });
});