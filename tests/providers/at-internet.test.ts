import { describe, it, expect } from 'vitest';
import { atInternet } from '../../src/providers/at-internet';

describe('AT Internet Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches ati-host.net', () => {
      expect(
        atInternet.pattern.test(
          'https://www.ati-host.net/hit.xiti?p=home&x2=sitename'
        )
      ).toBe(true);
    });

    it('matches .xiti.com', () => {
      expect(
        atInternet.pattern.test(
          'https://logs.xiti.com/hit.xiti?p=page&s2=section'
        )
      ).toBe(true);
    });

    it('matches www.xiti.com subdomain', () => {
      expect(
        atInternet.pattern.test(
          'https://www.xiti.com/hit.redir?p=article'
        )
      ).toBe(true);
    });

    it('does NOT match unrelated analytics domains', () => {
      expect(
        atInternet.pattern.test('https://google-analytics.com/collect')
      ).toBe(false);
    });

    it('does NOT match non-xiti subdomains', () => {
      expect(
        atInternet.pattern.test('https://analytics.example.com/hit')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts x2 (Site Name)', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?x2=mywebsite',
        {}
      );
      expect(result['Site Name']).toBe('mywebsite');
    });

    it('extracts s2 (Level 2)', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?s2=products&p=category',
        {}
      );
      expect(result['Level 2']).toBe('products');
    });

    it('extracts p (Page)', () => {
      const result = atInternet.parseParams(
        'https://logs.xiti.com/hit.xiti?p=homepage&x2=mysite',
        {}
      );
      expect(result.Page).toBe('homepage');
    });

    it('extracts xtor (Campaign)', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?xtor=ABC-123&p=home',
        {}
      );
      expect(result.Campaign).toBe('ABC-123');
    });

    it('extracts type (Hit Type) and uses it as _eventName', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?type=click&p=button',
        {}
      );
      expect(result['Hit Type']).toBe('click');
      expect(result._eventName).toBe('click');
    });

    it('extracts clic, ref, idclient, uid', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?clic=1&ref=https://google.com&idclient=visitor-99&uid=user-456',
        {}
      );
      expect(result.Click).toBe('1');
      expect(result.Referrer).toBe('https://google.com');
      expect(result['Visitor ID']).toBe('visitor-99');
      expect(result['User ID']).toBe('user-456');
    });

    it('passes through unknown params', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?x2=mysite&custom_param=value&product_id=SKU-001',
        {}
      );
      expect(result['Site Name']).toBe('mysite');
      expect(result.custom_param).toBe('value');
      expect(result.product_id).toBe('SKU-001');
    });

    it('returns empty string for empty values', () => {
      const result = atInternet.parseParams(
        'https://www.ati-host.net/hit.xiti?x2=mysite&clic=',
        {}
      );
      expect(result['Site Name']).toBe('mysite');
      expect(result.Click).toBe('');
    });
  });
});