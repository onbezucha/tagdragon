import { describe, it, expect } from 'vitest';
import { parseAdobeLibraryUrl } from '@/panel/components/adobe-env-switcher';

describe('parseAdobeLibraryUrl', () => {
  // ─── LAUNCH-EN PATTERNS (New Adobe Tags) ───────────────────────────────────

  describe('launch-EN{hash}.min.js (Adobe Tags)', () => {
    it('should parse production environment from launch-EN URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'prod',
        type: 'Adobe Tags',
      });
    });

    it('should parse development environment from launch-EN URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123-development.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'dev',
        type: 'Adobe Tags',
      });
    });

    it('should parse staging environment from launch-EN URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123-staging.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'acc',
        type: 'Adobe Tags',
      });
    });

    it('should handle various hash formats', () => {
      const shortHash = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENa1b2c3.min.js'
      );
      expect(shortHash.libraryId).toBe('a1b2c3');
      expect(shortHash.environment).toBe('prod');
      expect(shortHash.type).toBe('Adobe Tags');

      const longHash = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabcdef1234567890fedcba.min.js'
      );
      expect(longHash.libraryId).toBe('abcdef1234567890fedcba');
      expect(longHash.environment).toBe('prod');
      expect(longHash.type).toBe('Adobe Tags');
    });
  });

  // ─── LEGACY LAUNCH PATTERNS ────────────────────────────────────────────────

  describe('launch-{hash}.min.js (Launch legacy)', () => {
    it('should parse production environment from legacy launch URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-abc123.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'prod',
        type: 'Launch (legacy)',
      });
    });

    it('should parse development environment from legacy launch URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-abc123-development.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'dev',
        type: 'Launch (legacy)',
      });
    });

    it('should parse staging environment from legacy launch URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-abc123-staging.min.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'acc',
        type: 'Launch (legacy)',
      });
    });

    it('should identify as Launch (legacy) not Adobe Tags', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-xyz789.min.js'
      );
      expect(result.type).toBe('Launch (legacy)');
    });
  });

  // ─── DTM PATTERNS ──────────────────────────────────────────────────────────

  describe('satellite-{hash}.js (DTM legacy)', () => {
    it('should parse DTM library URL as production', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/satellite-abc123.js'
      );
      expect(result).toEqual({
        libraryId: 'abc123',
        environment: 'prod',
        type: 'DTM (legacy)',
      });
    });

    it('should identify type as DTM (legacy)', () => {
      // Note: satelliteMatch regex only accepts hex chars [a-f0-9], so use hex hash
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/satellite-abc123.js'
      );
      expect(result.type).toBe('DTM (legacy)');
    });

    it('should handle various DTM hash formats', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/satellite-a1b2c3d4e5f6.js'
      );
      expect(result.libraryId).toBe('a1b2c3d4e5f6');
      expect(result.type).toBe('DTM (legacy)');
    });
  });

  // ─── NON-MATCHING URLS ─────────────────────────────────────────────────────

  describe('non-matching URLs', () => {
    it('should return empty libraryId for unrecognized URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://example.com/script.js'
      );
      expect(result.libraryId).toBe('');
    });

    it('should return prod environment for unrecognized URL', () => {
      const result = parseAdobeLibraryUrl(
        'https://example.com/script.js'
      );
      expect(result.environment).toBe('prod');
    });

    it('should return empty libraryId for empty string', () => {
      const result = parseAdobeLibraryUrl('');
      expect(result.libraryId).toBe('');
      expect(result.environment).toBe('prod');
      expect(result.type).toBe('Launch (legacy)');
    });

    it('should not match URLs with .min.js but wrong prefix', () => {
      const result = parseAdobeLibraryUrl(
        'https://cdn.example.com/analytics-abc123.min.js'
      );
      expect(result.libraryId).toBe('');
    });
  });

  // ─── URL WITH QUERY PARAMETERS ─────────────────────────────────────────────

  describe('URLs with query parameters', () => {
    it('should handle URL with query string after .js (still matches .min.js)', () => {
      // The regex matches '.min.js' literally - query params after still match
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123.min.js?_cb=12345'
      );
      expect(result.libraryId).toBe('abc123');
      expect(result.type).toBe('Adobe Tags');
    });

    it('should handle URL with subpath before filename', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/abc123/launch-ENdef456.min.js'
      );
      expect(result).toEqual({
        libraryId: 'def456',
        environment: 'prod',
        type: 'Adobe Tags',
      });
    });

    it('should handle deep subpath', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/extensions/launch-ENabc123.min.js'
      );
      expect(result.libraryId).toBe('abc123');
      expect(result.type).toBe('Adobe Tags');
    });
  });

  // ─── ENVIRONMENT MAPPING ───────────────────────────────────────────────────

  describe('environment mapping', () => {
    it('should map production rawEnv to prod', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123.min.js'
      );
      expect(result.environment).toBe('prod');
    });

    it('should map development rawEnv to dev', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123-development.min.js'
      );
      expect(result.environment).toBe('dev');
    });

    it('should map staging rawEnv to acc', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123-staging.min.js'
      );
      expect(result.environment).toBe('acc');
    });
  });

  // ─── TYPE IDENTIFICATION ───────────────────────────────────────────────────

  describe('type identification', () => {
    it('should identify DTM type for satellite URLs', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/satellite-abc123.js'
      );
      expect(result.type).toBe('DTM (legacy)');
    });

    it('should identify Adobe Tags type for launch-EN URLs', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-ENabc123.min.js'
      );
      expect(result.type).toBe('Adobe Tags');
    });

    it('should identify Launch (legacy) type for launch- without EN', () => {
      const result = parseAdobeLibraryUrl(
        'https://assets.adobedtm.com/launch-abc123.min.js'
      );
      expect(result.type).toBe('Launch (legacy)');
    });
  });
});