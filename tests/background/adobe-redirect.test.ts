import { describe, it, expect } from 'vitest';
import { validateRedirectUrls } from '@/background/redirect-utils';

// ─── Test URLs ──────────────────────────────────────────────────────────────

const VALID_FROM_URL = 'https://assets.adobedtm.com/launch-ENabc123.min.js';
const VALID_TO_URL = 'https://assets.adobedtm.com/launch-ENdef456-development.min.js';

// Invalid toUrl values
const TO_URL_HTTP = 'http://assets.adobedtm.com/something.js';
const TO_URL_EVIL_HOST = 'https://evil.com/malicious.js';
const TO_URL_NOT_PARSEABLE = 'not-a-url';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('validateRedirectUrls', () => {
  describe('valid redirects', () => {
    it('accepts valid HTTPS redirect with allowed hostname', () => {
      const result = validateRedirectUrls(VALID_FROM_URL, VALID_TO_URL);
      expect(result).toBeNull();
    });

    it('accepts redirect to the alternate allowed hostname (ostrk.org)', () => {
      const toUrl = 'https://assets.adobedtm.com.ostrk.org/launch-ENabc123.min.js';
      const result = validateRedirectUrls(VALID_FROM_URL, toUrl);
      expect(result).toBeNull();
    });
  });

  describe('invalid toUrl (redirect target)', () => {
    it('rejects non-HTTPS redirect target (http://)', () => {
      const result = validateRedirectUrls(VALID_FROM_URL, TO_URL_HTTP);
      expect(result).toBe('Only HTTPS redirect targets are allowed');
    });

    it('rejects disallowed hostname (e.g. evil.com)', () => {
      const result = validateRedirectUrls(VALID_FROM_URL, TO_URL_EVIL_HOST);
      expect(result).toBe('Invalid redirect target hostname');
    });

    it('rejects invalid toUrl (not parseable)', () => {
      const result = validateRedirectUrls(VALID_FROM_URL, TO_URL_NOT_PARSEABLE);
      expect(result).toBe('Invalid redirect URL');
    });
  });

  describe('invalid fromUrl (source)', () => {
    it('rejects non-HTTPS fromUrl (http://)', () => {
      const fromUrl = 'http://assets.adobedtm.com/launch-ENabc123.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Only HTTPS source URLs are allowed');
    });

    it('rejects invalid fromUrl (not parseable)', () => {
      const result = validateRedirectUrls(TO_URL_NOT_PARSEABLE, VALID_TO_URL);
      expect(result).toBe('Invalid source URL');
    });
  });

  describe('declarativeNetRequest special characters in fromUrl', () => {
    it('rejects fromUrl with special characters: *', () => {
      const fromUrl = 'https://assets.adobedtm.com/launch-EN*.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Source URL contains invalid characters (*, ^, |, ?, \\)');
    });

    it('rejects fromUrl with special characters: ^', () => {
      const fromUrl = 'https://assets.adobedtm.com/launch-EN^.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Source URL contains invalid characters (*, ^, |, ?, \\)');
    });

    it('rejects fromUrl with special characters: |', () => {
      const fromUrl = 'https://assets.adobedtm.com/launch-EN|.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Source URL contains invalid characters (*, ^, |, ?, \\)');
    });

    it('rejects fromUrl with special characters: ?', () => {
      const fromUrl = 'https://assets.adobedtm.com/launch-EN?.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Source URL contains invalid characters (*, ^, |, ?, \\)');
    });

    it('rejects fromUrl with special characters: \\', () => {
      const fromUrl = 'https://assets.adobedtm.com/launch-EN\\.min.js';
      const result = validateRedirectUrls(fromUrl, VALID_TO_URL);
      expect(result).toBe('Source URL contains invalid characters (*, ^, |, ?, \\)');
    });
  });
});