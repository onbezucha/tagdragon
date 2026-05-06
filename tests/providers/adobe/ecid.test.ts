import { describe, it, expect } from 'vitest';
import { adobeECID } from '../../../src/providers/adobe/ecid';

describe('Adobe ECID Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches demdex.net/id with query string', () => {
      expect(
        adobeECID.pattern.test(
          'https://dpm.demdex.net/id?d_mid=123456&d_orgid=ORG123'
        )
      ).toBe(true);
    });

    it('matches demdex.net/id with multiple parameters', () => {
      expect(
        adobeECID.pattern.test(
          'https://dpm.demdex.net/id?d_mid=mid-123&d_ver=v1.5&d_orgid=adobeCorp'
        )
      ).toBe(true);
    });

    it('matches demdex.net/id without path segments', () => {
      expect(
        adobeECID.pattern.test(
          'https://company.demdex.net/id?d_mid=mid-789'
        )
      ).toBe(true);
    });

    it('does NOT match demdex.net/ibs (AAM, not ECID)', () => {
      expect(
        adobeECID.pattern.test('https://dpm.demdex.net/ibs:dpid=1&dpuuid=user123')
      ).toBe(false);
    });

    it('does NOT match demdex.net/event (AAM event, not ECID)', () => {
      expect(
        adobeECID.pattern.test('https://dpm.demdex.net/event?d_mid=mid-456')
      ).toBe(false);
    });

    it('does NOT match demdex.net without /id path', () => {
      expect(
        adobeECID.pattern.test('https://dpm.demdex.net/')
      ).toBe(false);
    });

    it('does NOT match demdex.net alone', () => {
      expect(
        adobeECID.pattern.test('https://dpm.demdex.net')
      ).toBe(false);
    });

    it('does NOT match other demdex.net paths', () => {
      expect(
        adobeECID.pattern.test('https://dpm.demdex.net/other/path')
      ).toBe(false);
    });

    it('does NOT match unrelated URLs', () => {
      expect(
        adobeECID.pattern.test('https://example.com/page?param=value')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts MID (d_mid) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_mid=mid-123-abc',
        undefined
      );
      expect(result.MID).toBe('mid-123-abc');
    });

    it('extracts Org ID (d_orgid) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_orgid=ORG123456',
        undefined
      );
      expect(result['Org ID']).toBe('ORG123456');
    });

    it('extracts Version (d_ver) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_ver=1.5',
        undefined
      );
      expect(result.Version).toBe('1.5');
    });

    it('extracts Response (d_rtbd) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_rtbd=json',
        undefined
      );
      expect(result.Response).toBe('json');
    });

    it('extracts Blob (d_blob) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_blob=eyJhbGciOiJIUzI1NiJ9',
        undefined
      );
      expect(result.Blob).toBe('eyJhbGciOiJIUzI1NiJ9');
    });

    it('extracts Device Co-op (dpv) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?dpv=1',
        undefined
      );
      expect(result['Device Co-op']).toBe('1');
    });

    it('extracts Platform (d_ptype) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_ptype=web',
        undefined
      );
      expect(result.Platform).toBe('web');
    });

    it('extracts Region (dcs_region) from query parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?dcs_region=6',
        undefined
      );
      expect(result.Region).toBe('6');
    });

    it('extracts all parameters from complete request', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_mid=mid-456&d_orgid=ORG789&d_ver=1.6&d_rtbd=json&d_blob=abc123&dpv=1&d_ptype=mobile&dcs_region=7',
        undefined
      );
      expect(result.MID).toBe('mid-456');
      expect(result['Org ID']).toBe('ORG789');
      expect(result.Version).toBe('1.6');
      expect(result.Response).toBe('json');
      expect(result.Blob).toBe('abc123');
      expect(result['Device Co-op']).toBe('1');
      expect(result.Platform).toBe('mobile');
      expect(result.Region).toBe('7');
    });

    it('handles POST body with urlencoded parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id',
        'd_mid=post-mid-123&d_orgid=POSTORG'
      );
      expect(result.MID).toBe('post-mid-123');
      expect(result['Org ID']).toBe('POSTORG');
    });

    it('returns undefined for missing parameters', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id?d_mid=mid-only',
        undefined
      );
      expect(result.MID).toBe('mid-only');
      expect(result['Org ID']).toBeUndefined();
      expect(result.Version).toBeUndefined();
      expect(result.Response).toBeUndefined();
      expect(result.Blob).toBeUndefined();
      expect(result['Device Co-op']).toBeUndefined();
      expect(result.Platform).toBeUndefined();
      expect(result.Region).toBeUndefined();
    });

    it('works with HAR format post body', () => {
      const result = adobeECID.parseParams(
        'https://dpm.demdex.net/id',
        { text: 'd_mid=har-mid-789&d_orgid=HARORG' }
      );
      expect(result.MID).toBe('har-mid-789');
      expect(result['Org ID']).toBe('HARORG');
    });
  });
});