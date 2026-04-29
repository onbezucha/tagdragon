import { describe, it, expect } from 'vitest';
import { matchProvider, PROVIDERS } from '../../src/providers/index';

describe('matchProvider', () => {
  // ═══ Basic matching ══════════════════════════════════════════════════════

  describe('basic matching', () => {
    it('matches GA4', () => {
      const provider = matchProvider(
        'https://www.google-analytics.com/g/collect?v=2&tid=G-ABC'
      );
      expect(provider?.name).toBe('GA4');
    });

    it('matches Meta Pixel', () => {
      const provider = matchProvider(
        'https://www.facebook.com/tr?id=123456&ev=PageView'
      );
      expect(provider?.name).toBe('Meta Pixel');
    });

    it('matches Meta Pixel with trailing slash', () => {
      const provider = matchProvider(
        'https://www.facebook.com/tr/?id=123456&ev=PageView'
      );
      expect(provider?.name).toBe('Meta Pixel');
    });

    it('returns null for unknown URL', () => {
      const result = matchProvider('https://www.example.com/page.html');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = matchProvider('');
      expect(result).toBeNull();
    });

    it('returns null for malformed URL', () => {
      const result = matchProvider('not-a-url');
      expect(result).toBeNull();
    });
  });

  // ═══ Ordering conflicts ══════════════════════════════════════════════════

  describe('ordering conflicts', () => {
    it('resolves: Tealium EventStream before Tealium', () => {
      const eventStream = matchProvider(
        'https://collect.tealiumiq.com/event/tealium_event'
      );
      expect(eventStream?.name).toBe('Tealium EventStream');
    });

    it('resolves: Tealium matches its own URL patterns', () => {
      const regular = matchProvider(
        'https://collect.tealiumiq.com/data/i.gif'
      );
      expect(regular?.name).toBe('Tealium');
    });

    it('resolves: Comscore before Scorecard', () => {
      const cs = matchProvider(
        'https://sb.scorecardresearch.com/b?c1=2&c2=123456'
      );
      expect(cs?.name).toBe('Comscore');
    });

    it('resolves: Scorecard matches /p path', () => {
      const sc = matchProvider(
        'https://scorecardresearch.com/p?c1=2&c2=123456'
      );
      expect(sc?.name).toBe('Scorecard');
    });
  });

  // ═══ Registry integrity ══════════════════════════════════════════════════

  describe('registry integrity', () => {
    it('every provider has a unique name', () => {
      const names = PROVIDERS.map((p) => p.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it('every provider has a non-empty pattern', () => {
      for (const p of PROVIDERS) {
        expect(p.pattern.source.length).toBeGreaterThan(0);
      }
    });

    it('every provider has a parseParams function', () => {
      for (const p of PROVIDERS) {
        expect(typeof p.parseParams).toBe('function');
      }
    });

    it('every provider has a color starting with #', () => {
      for (const p of PROVIDERS) {
        expect(p.color.startsWith('#')).toBe(true);
      }
    });

    it('has more than 60 providers registered', () => {
      expect(PROVIDERS.length).toBeGreaterThan(60);
    });
  });
});
