import { describe, it, expect } from 'vitest';
import { ensighten } from '../../src/providers/ensighten';

describe('Ensighten', () => {
  describe('pattern', () => {
    const { pattern } = ensighten;

    it('should match nexus.ensighten.com domain', () => {
      expect(pattern.test('https://nexus.ensighten.com/track')).toBe(true);
    });

    it('should match nexus.ensighten.com with path', () => {
      expect(pattern.test('https://nexus.ensighten.com/bootstrap/client')).toBe(true);
    });

    it('should match with subpaths', () => {
      expect(pattern.test('https://nexus.ensighten.com/space/collect')).toBe(true);
    });

    it('should match www subdomain', () => {
      expect(pattern.test('https://www.nexus.ensighten.com/')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://ensighten.com/home')).toBe(false);
      expect(pattern.test('https://www.ensighten.io')).toBe(false);
      expect(pattern.test('https://nexus.ensights.com')).toBe(false);
      expect(pattern.test('https://tag.ensighten.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract bootstrap from URL params', () => {
      const url = 'https://nexus.ensighten.com/track?bootstrap=bs_123';
      const result = ensighten.parseParams(url, null);

      expect(result).toMatchObject({
        Bootstrap: 'bs_123',
      });
    });

    it('should extract client from URL params', () => {
      const url = 'https://nexus.ensighten.com/collect?client=acme_corp';
      const result = ensighten.parseParams(url, null);

      expect(result).toMatchObject({
        Client: 'acme_corp',
      });
    });

    it('should extract pub (Space) from URL params', () => {
      const url = 'https://nexus.ensighten.com/space/track?pub=website_xyz';
      const result = ensighten.parseParams(url, null);

      expect(result).toMatchObject({
        Space: 'website_xyz',
      });
    });

    it('should extract multiple params together', () => {
      const url = 'https://nexus.ensighten.com/bootstrap/client?bootstrap=prod_bootstrap&client=mycompany&pub=main_space';
      const result = ensighten.parseParams(url, null);

      expect(result).toMatchObject({
        Bootstrap: 'prod_bootstrap',
        Client: 'mycompany',
        Space: 'main_space',
      });
    });

    it('should handle minimal params', () => {
      const url = 'https://nexus.ensighten.com/track?client=xyz';
      const result = ensighten.parseParams(url, null);

      expect(result).toMatchObject({
        Client: 'xyz',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://nexus.ensighten.com/bootstrap/client';
      const result = ensighten.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
