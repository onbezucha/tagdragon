import { describe, it, expect } from 'vitest';
import { sixsense } from '../../src/providers/sixsense';

describe('6Sense', () => {
  describe('pattern', () => {
    const { pattern } = sixsense;

    it('should match j.6sc.co domain', () => {
      expect(pattern.test('https://j.6sc.co/track')).toBe(true);
    });

    it('should match j.6sc.co with path', () => {
      expect(pattern.test('https://j.6sc.co/analytics/event')).toBe(true);
    });

    it('should match b.6sc.co domain', () => {
      expect(pattern.test('https://b.6sc.co/collect')).toBe(true);
    });

    it('should match b.6sc.co with endpoint', () => {
      expect(pattern.test('https://b.6sc.co/api/v2/track')).toBe(true);
    });

    it('should NOT match unrelated domains', () => {
      expect(pattern.test('https://6sc.co/home')).toBe(false);
      expect(pattern.test('https://www.6sense.com')).toBe(false);
      expect(pattern.test('https://6sense.io/tracking')).toBe(false);
      expect(pattern.test('https://j.6sc.com')).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('should extract company_id from URL params', () => {
      const url = 'https://j.6sc.co/track?company_id=company_abc123';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        'Company ID': 'company_abc123',
      });
    });

    it('should extract domain from URL params', () => {
      const url = 'https://b.6sc.co/identify?domain=example.com';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        Domain: 'example.com',
      });
    });

    it('should extract token from URL params', () => {
      const url = 'https://j.6sc.co/track?token=xyz_token_789';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        Token: 'xyz_token_789',
      });
    });

    it('should extract ipaddr from URL params', () => {
      const url = 'https://b.6sc.co/collect?ipaddr=192.168.1.100';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        IP: '192.168.1.100',
      });
    });

    it('should extract multiple params together', () => {
      const url = 'https://j.6sc.co/track?company_id=acme_corp&domain=acme.com&token=auth_xyz&ipaddr=10.0.0.1';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        'Company ID': 'acme_corp',
        Domain: 'acme.com',
        Token: 'auth_xyz',
        IP: '10.0.0.1',
      });
    });

    it('should handle partial params', () => {
      const url = 'https://b.6sc.co/identify?company_id=xyz&domain=test.com';
      const result = sixsense.parseParams(url, null);

      expect(result).toMatchObject({
        'Company ID': 'xyz',
        Domain: 'test.com',
      });
    });

    it('should return empty object when no params present', () => {
      const url = 'https://j.6sc.co/track';
      const result = sixsense.parseParams(url, null);

      expect(result).toEqual({});
    });
  });
});
