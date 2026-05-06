import { describe, it, expect } from 'vitest';
import { comscore } from '../../src/providers/comscore';

describe('Comscore Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches scorecardresearch.com/b endpoint', () => {
      expect(
        comscore.pattern.test('https://sb.scorecardresearch.com/b?c1=1&c2=1234567')
      ).toBe(true);
    });

    it('matches scorecardresearch.com/p endpoint', () => {
      expect(
        comscore.pattern.test(
          'https://sb.scorecardresearch.com/p?c1=2&c2=client-id-abc&cv=5'
        )
      ).toBe(true);
    });

    it('matches sb.scorecardresearch.com', () => {
      expect(
        comscore.pattern.test('https://sb.scorecardresearch.com/b?c1=1&c2=1234567')
      ).toBe(true);
    });

    it('does NOT match scorecardresearch.com without sb subdomain', () => {
      expect(
        comscore.pattern.test('https://scorecardresearch.com/other')
      ).toBe(false);
    });

    it('does NOT match unrelated domains', () => {
      expect(
        comscore.pattern.test('https://google-analytics.com/collect')
      ).toBe(false);
    });

    it('matches /b or /p path segments', () => {
      expect(
        comscore.pattern.test('https://sb.scorecardresearch.com/batch')
      ).toBe(true);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts c1 (Type) and uses it as _eventName', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=view&c2=1234567',
        {}
      );
      expect(result.Type).toBe('view');
      expect(result._eventName).toBe('view');
    });

    it('extracts c2 (Client ID)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=client-abc-123',
        {}
      );
      expect(result['Client ID']).toBe('client-abc-123');
    });

    it('extracts cv (Version)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/p?c1=1&c2=1234567&cv=5',
        {}
      );
      expect(result.Version).toBe('5');
    });

    it('extracts c7 (Page URL)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&c7=https%3A%2F%2Fexample.com%2Fpage',
        {}
      );
      expect(result['Page URL']).toBe('https://example.com/page');
    });

    it('extracts c8 (Page Title)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&c8=Home%20Page',
        {}
      );
      expect(result['Page Title']).toBe('Home Page');
    });

    it('extracts c9 (Referrer)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&c9=https%3A%2F%2Fgoogle.com',
        {}
      );
      expect(result.Referrer).toBe('https://google.com');
    });

    it('extracts ns__t (Timestamp)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&ns__t=1704067200000',
        {}
      );
      expect(result.Timestamp).toBe('1704067200000');
    });

    it('extracts GDPR params', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&gdpr=1&gdpr_purps=1&gdpr_li=Y&gdpr_pcc=US',
        {}
      );
      expect(result.GDPR).toBe('1');
      expect(result['GDPR Purposes']).toBe('1');
      expect(result['GDPR LI']).toBe('Y');
      expect(result['GDPR Country']).toBe('US');
    });

    it('passes through extra c* params (c3, c5, c10, etc.)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&c3=segment-a&c5=custom-value&c10=extra',
        {}
      );
      expect(result.Type).toBe('1');
      expect(result['Client ID']).toBe('123');
      expect(result.c3).toBe('segment-a');
      expect(result.c5).toBe('custom-value');
      expect(result.c10).toBe('extra');
    });

    it('extracts cs_* params (cs_cmp_id, cs_fpid, cs_cfg)', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&cs_cmp_id=cmp-abc&cs_fpid=fp-id-123&cs_cfg=strict',
        {}
      );
      expect(result['Campaign ID']).toBe('cmp-abc');
      expect(result['Fingerprint ID']).toBe('fp-id-123');
      expect(result.Config).toBe('strict');
    });

    it('does not pass through non-c* unknown params', () => {
      const result = comscore.parseParams(
        'https://sb.scorecardresearch.com/b?c1=1&c2=123&unknown_param=value',
        {}
      );
      expect(result.unknown_param).toBeUndefined();
    });
  });
});