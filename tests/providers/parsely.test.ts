import { describe, it, expect } from 'vitest';
import { parsely } from '../../src/providers/parsely';

describe('Parse.ly Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches srv.pixel.parsely.com', () => {
      expect(
        parsely.pattern.test('https://srv.pixel.parsely.com/pixel?id=abc123&url=https%3A%2F%2Fexample.com')
      ).toBe(true);
    });

    it('matches p.parsely.com/pixel', () => {
      expect(
        parsely.pattern.test(
          'https://p.parsely.com/pixel?url=https%3A%2F%2Fblog.example.com%2Farticle'
        )
      ).toBe(true);
    });

    it('does NOT match p.parsely.com without /pixel path', () => {
      expect(
        parsely.pattern.test('https://p.parsely.com/other/path')
      ).toBe(false);
    });

    it('does NOT match unrelated domains', () => {
      expect(
        parsely.pattern.test('https://google-analytics.com/collect')
      ).toBe(false);
    });

    it('does NOT match parsely.com without pixel subdomain', () => {
      expect(
        parsely.pattern.test('https://parsely.com/tracker')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts url', () => {
      const result = parsely.parseParams(
        'https://srv.pixel.parsely.com/pixel?url=https%3A%2F%2Fexample.com%2Farticle&action=pageview',
        {}
      );
      expect(result['Page URL']).toBe('https://example.com/article');
    });

    it('extracts urlref (Referrer)', () => {
      const result = parsely.parseParams(
        'https://srv.pixel.parsely.com/pixel?url=https%3A%2F%2Fexample.com&urlref=https%3A%2F%2Fgoogle.com',
        {}
      );
      expect(result.Referrer).toBe('https://google.com');
    });

    it('extracts action and uses it as _eventName', () => {
      const result = parsely.parseParams(
        'https://p.parsely.com/pixel?url=https%3A%2F%2Fexample.com&action=click',
        {}
      );
      expect(result.Action).toBe('click');
      expect(result._eventName).toBe('click');
    });

    it('extracts id (Site ID)', () => {
      const result = parsely.parseParams(
        'https://srv.pixel.parsely.com/pixel?id=site-abc123&url=https%3A%2F%2Fexample.com',
        {}
      );
      expect(result['Site ID']).toBe('site-abc123');
    });

    it('extracts ts (Timestamp)', () => {
      const result = parsely.parseParams(
        'https://srv.pixel.parsely.com/pixel?url=https%3A%2F%2Fexample.com&ts=1704067200',
        {}
      );
      expect(result.Timestamp).toBe('1704067200');
    });

    it('extracts all core fields together', () => {
      const result = parsely.parseParams(
        'https://p.parsely.com/pixel?url=https%3A%2F%2Fexample.com&urlref=https%3A%2F%2Ftwitter.com&action=heart&ts=1704067200',
        {}
      );
      expect(result['Page URL']).toBe('https://example.com');
      expect(result.Referrer).toBe('https://twitter.com');
      expect(result.Action).toBe('heart');
      expect(result.Timestamp).toBe('1704067200');
    });
  });
});