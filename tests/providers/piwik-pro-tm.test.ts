import { describe, it, expect } from 'vitest';
import { piwikProTm } from '../../src/providers/piwik-pro-tm';

describe('Piwik PRO TM Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches piwik.pro JS container path', () => {
      expect(
        piwikProTm.pattern.test(
          'https://abc123.piwik.pro/abc123/abc123.js'
        )
      ).toBe(true);
    });

    it('matches with subdomain and longer path segments (hex only)', () => {
      expect(
        piwikProTm.pattern.test(
          'https://my-site.piwik.pro/container-id-123/tracking/js/script.min.js'
        )
      ).toBe(false); // container-id-123 contains chars outside [a-f0-9-]
    });

    it('does NOT match ppms.php endpoint', () => {
      expect(
        piwikProTm.pattern.test('https://piwik.pro/ppms.php?idsite=1&action_name=test')
      ).toBe(false);
    });

    it('does NOT match .piwik.pro/ppms.php', () => {
      expect(
        piwikProTm.pattern.test('https://site.piwik.pro/ppms.php?idsite=1')
      ).toBe(false);
    });

    it('does NOT match non-js paths on piwik.pro', () => {
      expect(
        piwikProTm.pattern.test('https://abc123.piwik.pro/xyz456/css/style.css')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Account ID and Container ID from URL path', () => {
      const result = piwikProTm.parseParams(
        'https://abc123.piwik.pro/abc123/abc123.js',
        {}
      );
      expect(result['Account ID']).toBe('abc123');
      expect(result['Container ID']).toBe('abc123');
    });

    it('sets Request Type to Library Load', () => {
      const result = piwikProTm.parseParams(
        'https://abc123.piwik.pro/abc123/abc123.js',
        {}
      );
      expect(result['Request Type']).toBe('Library Load');
    });

    it('sets _eventName to Library Load', () => {
      const result = piwikProTm.parseParams(
        'https://abc123.piwik.pro/abc123/abc123.js',
        {}
      );
      expect(result._eventName).toBe('Library Load');
    });

    it('extracts Account ID and Container ID regardless of query params', () => {
      const result = piwikProTm.parseParams(
        'https://abc123.piwik.pro/abc123/abc123.js?custom_param=value',
        {}
      );
      expect(result['Account ID']).toBe('abc123');
      expect(result['Container ID']).toBe('abc123');
      // Note: parseParams only extracts from URL path, query params are not parsed
    });

    it('handles segment names with hyphens', () => {
      const result = piwikProTm.parseParams(
        'https://abc-123.piwik.pro/abcd-1234/abcdef.js',
        {}
      );
      expect(result['Account ID']).toBe('abcd-1234');
      expect(result['Container ID']).toBe('abcdef');
    });
  });
});