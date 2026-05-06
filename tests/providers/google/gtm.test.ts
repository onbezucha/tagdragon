import { describe, it, expect } from 'vitest';
import { gtm } from '../../../src/providers/google/gtm';

describe('GTM Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches gtm.js script', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/gtm.js?id=GTM-ABC123')
      ).toBe(true);
    });

    it('matches gtag/js with GTM container ID', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/gtag/js?id=GTM-K12345&l=dataLayer')
      ).toBe(true);
    });

    it('matches gtm.js with preview parameters', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/gtm.js?gtm_auth=abc123&gtm_preview=env-1&gtm_cookies_win=x')
      ).toBe(true);
    });

    it('matches a? endpoint (GTM spyglass)', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/a?id=GTM-XYZ&gtm_auth=auth123&gtm_preview=preview45')
      ).toBe(true);
    });

    it('does NOT match gtag/js with G- measurement ID', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/gtag/js?id=G-ABC123')
      ).toBe(false);
    });

    it('does NOT match gtag/js with AW- conversion ID', () => {
      expect(
        gtm.pattern.test('https://www.googletagmanager.com/gtag/js?id=AW-123456789')
      ).toBe(false);
    });

    it('does NOT match unrelated Google URLs', () => {
      expect(
        gtm.pattern.test('https://www.google.com/analytics/collect?v=2&tid=G-ABC')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Container ID from URL parameter', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js?id=GTM-MYCONTAINER',
        undefined
      );
      expect(result['Container ID']).toBe('GTM-MYCONTAINER');
    });

    it('extracts preview authentication parameter', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js?id=GTM-TEST&gtm_auth=abc123456789',
        undefined
      );
      expect(result['Preview Auth']).toBe('abc123456789');
    });

    it('extracts preview environment parameter', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js?id=GTM-TEST&gtm_preview=env-2',
        undefined
      );
      expect(result['Preview Env']).toBe('env-2');
    });

    it('extracts preview cookies win parameter', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js?id=GTM-TEST&gtm_cookies_win=x',
        undefined
      );
      expect(result['Preview Cookies']).toBe('x');
    });

    it('extracts all preview parameters together', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/a?id=GTM-PREVIEW&gtm_auth=auth123&gtm_preview=env-5&gtm_cookies_win=ck',
        undefined
      );
      expect(result['Container ID']).toBe('GTM-PREVIEW');
      expect(result['Preview Auth']).toBe('auth123');
      expect(result['Preview Env']).toBe('env-5');
      expect(result['Preview Cookies']).toBe('ck');
    });

    it('returns undefined for missing preview parameters', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js?id=GTM-SIMPLE',
        undefined
      );
      expect(result['Container ID']).toBe('GTM-SIMPLE');
      expect(result['Preview Auth']).toBeUndefined();
      expect(result['Preview Env']).toBeUndefined();
      expect(result['Preview Cookies']).toBeUndefined();
    });

    it('extracts Container ID from POST body', () => {
      const result = gtm.parseParams(
        'https://www.googletagmanager.com/gtm.js',
        'id=GTM-POST&gtm_auth=auth'
      );
      expect(result['Container ID']).toBe('GTM-POST');
      expect(result['Preview Auth']).toBe('auth');
    });
  });
});