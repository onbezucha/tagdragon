import { describe, it, expect } from 'vitest';
import { fullstory } from '../../src/providers/fullstory';

describe('FullStory Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches fullstory.com/rec endpoint', () => {
      expect(fullstory.pattern.test('https://fullstory.com/rec/abc123')).toBe(true);
    });

    it('matches rs.fullstory.com domain', () => {
      expect(fullstory.pattern.test('https://rs.fullstory.com/s/script.js')).toBe(true);
    });

    it('matches rs.fullstory.com with path', () => {
      expect(fullstory.pattern.test('https://rs.fullstory.com/api/v2/events')).toBe(true);
    });

    it('does NOT match fullstory.com alone', () => {
      expect(fullstory.pattern.test('https://fullstory.com')).toBe(false);
    });

    it('does NOT match fullstory.com/home', () => {
      expect(fullstory.pattern.test('https://fullstory.com/home')).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts User ID from uid param', () => {
      const url = 'https://fullstory.com/rec/org123?uid=user456';
      const result = fullstory.parseParams(url, {});
      expect(result['User ID']).toBe('user456');
    });

    it('extracts Display Name from displayName param', () => {
      const url = 'https://fullstory.com/rec/org123?displayName=John%20Doe';
      const result = fullstory.parseParams(url, {});
      expect(result['Display Name']).toBe('John Doe');
    });

    it('extracts Email from email param', () => {
      const url = 'https://fullstory.com/rec/org123?email=john%40example.com';
      const result = fullstory.parseParams(url, {});
      expect(result.Email).toBe('john@example.com');
    });

    it('extracts Org ID from URL path', () => {
      const url = 'https://fullstory.com/rec/abc-org-123';
      const result = fullstory.parseParams(url, {});
      expect(result['Org ID']).toBe('abc-org-123');
    });

    it('extracts Session ID from session/ pattern', () => {
      const url = 'https://fullstory.com/rec/org?session/sess12345';
      const result = fullstory.parseParams(url, {});
      expect(result['Session ID']).toBe('sess12345');
    });

    it('extracts Session ID from session: pattern', () => {
      const url = 'https://fullstory.com/rec/org?session:sess67890';
      const result = fullstory.parseParams(url, {});
      expect(result['Session ID']).toBe('sess67890');
    });

    it('extracts from POST body params', () => {
      const url = 'https://fullstory.com/rec/org123';
      const postBody = { uid: 'user789', displayName: 'Jane Doe', email: 'jane@test.com' };
      const result = fullstory.parseParams(url, postBody);
      expect(result['User ID']).toBe('user789');
      expect(result['Display Name']).toBe('Jane Doe');
      expect(result.Email).toBe('jane@test.com');
    });

    it('returns undefined for missing params (Org ID may still match URL path)', () => {
      const url = 'https://fullstory.com/rec/org';
      const result = fullstory.parseParams(url, {});
      expect(result['User ID']).toBeUndefined();
      expect(result['Display Name']).toBeUndefined();
      expect(result.Email).toBeUndefined();
      // Org ID extracts from URL path even without params
      expect(result['Session ID']).toBeUndefined();
    });
  });
});