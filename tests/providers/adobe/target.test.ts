import { describe, it, expect } from 'vitest';
import { adobeTarget } from '../../../src/providers/adobe/target';

describe('Adobe Target Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches tt.omtrdc.net domain', () => {
      expect(
        adobeTarget.pattern.test(
          'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME&mbox=hero-banner'
        )
      ).toBe(true);
    });

    it('does NOT match CNAME aliases (target.company.com)', () => {
      expect(
        adobeTarget.pattern.test('https://target.company.com/rest/v1/delivery?client=ACME&mbox=homepage')
      ).toBe(false);
    });

    it('matches .tt.omtrdc.net subdomains', () => {
      expect(
        adobeTarget.pattern.test(
          'https://emea.tt.omtrdc.net/rest/v1/delivery?client=EMEA'
        )
      ).toBe(true);
    });

    it('does NOT match omtrdc.net without tt. prefix', () => {
      expect(
        adobeTarget.pattern.test('https://company.omtrdc.net/rest/v1/delivery?client=TEST')
      ).toBe(false);
    });

    it('does NOT match sc.omtrdc.net (Analytics, not Target)', () => {
      expect(
        adobeTarget.pattern.test('https://company.sc.omtrdc.net/b/ss/rs/0/hit1.gif')
      ).toBe(false);
    });

    it('does NOT match unrelated adobe URLs', () => {
      expect(
        adobeTarget.pattern.test('https://www.adobe.com/target.html')
      ).toBe(false);
    });

    it('does NOT match arbitrary URLs', () => {
      expect(
        adobeTarget.pattern.test('https://example.com/page?param=value')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts client code from URL query parameter', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME&mbox=hero',
        undefined
      );
      expect(result['Client Code']).toBe('ACME');
    });

    it('extracts client code from body when URL client param missing', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?mbox=test',
        JSON.stringify({ client: 'BODYPROXY', request: {} })
      );
      expect(result['Client Code']).toBe('BODYPROXY');
    });

    it('extracts request ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { requestId: 'req-123-abc' } })
      );
      expect(result['Request ID']).toBe('req-123-abc');
    });

    it('extracts session ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ sessionId: 'sess-456-def' })
      );
      expect(result['Session ID']).toBe('sess-456-def');
    });

    it('extracts TNT ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { id: { tntId: 'tnt-789-ghi' } } })
      );
      expect(result['TNT ID']).toBe('tnt-789-ghi');
    });

    it('extracts marketing cloud visitor ID (MCID) from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { id: { marketingCloudVisitorId: 'mid-111-222' } } })
      );
      expect(result.MCID).toBe('mid-111-222');
    });

    it('extracts third party ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { id: { thirdPartyId: 'tpid-333-444' } } })
      );
      expect(result['Third Party ID']).toBe('tpid-333-444');
    });

    it('extracts customer ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { id: { customerId: 'cust-555-666' } } })
      );
      expect(result['Customer ID']).toBe('cust-555-666');
    });

    it('extracts execute mbox names and count', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({
          request: {
            execute: {
              mboxes: [
                { name: 'hero-banner' },
                { name: 'product-recommendations' },
              ],
            },
          },
        })
      );
      expect(result['Execute Mboxes (2)']).toBe('hero-banner, product-recommendations');
    });

    it('extracts execute mbox parameters when present', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({
          request: {
            execute: {
              mboxes: [
                {
                  name: 'hero-banner',
                  parameters: { userId: 'user123', category: 'electronics' },
                },
              ],
            },
          },
        })
      );
      expect(result['Execute: hero-banner']).toBe('userId=user123, category=electronics');
    });

    it('extracts prefetch mbox names and count', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({
          request: {
            prefetch: {
              mboxes: [
                { name: 'footer-promo' },
                { name: 'sidebar-widget' },
                { name: 'newsletter-popup' },
              ],
            },
          },
        })
      );
      expect(result['Prefetch Mboxes (3)']).toBe('footer-promo, sidebar-widget, newsletter-popup');
    });

    it('extracts prefetch mbox parameters when present', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({
          request: {
            prefetch: {
              mboxes: [
                {
                  name: 'sidebar-widget',
                  parameters: { pageType: 'product', sku: 'SKU-001' },
                },
              ],
            },
          },
        })
      );
      expect(result['Prefetch: sidebar-widget']).toBe('pageType=product, sku=SKU-001');
    });

    it('returns empty object when no mboxes present', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { execute: {} } })
      );
      expect(result['Execute Mboxes (0)']).toBeUndefined();
      expect(result['Prefetch Mboxes (0)']).toBeUndefined();
    });

    it('extracts context channel from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { context: { channel: 'web' } } })
      );
      expect(result.Channel).toBe('web');
    });

    it('extracts page URL from body context address', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { context: { address: { url: 'https://example.com/product/123' } } } })
      );
      expect(result['Page URL']).toBe('https://example.com/product/123');
    });

    it('extracts referring URL from body context address', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { context: { address: { referringUrl: 'https://google.com/search' } } } })
      );
      expect(result.Referrer).toBe('https://google.com/search');
    });

    it('extracts host from browser context', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { context: { browser: { host: 'www.example.com' } } } })
      );
      expect(result.Host).toBe('www.example.com');
    });

    it('extracts user agent from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { context: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } } })
      );
      expect(result['User Agent']).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });

    it('extracts environment ID from body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ environmentId: 12345 })
      );
      expect(result['Environment ID']).toBe('12345');
    });

    it('extracts EC Analytics logging from experienceCloud', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({
          request: {
            experienceCloud: {
              analytics: {
                logging: 'server_side',
              },
            },
          },
        })
      );
      expect(result['EC Analytics']).toBe('server_side');
    });

    it('does not include EC Analytics when not present', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: {} })
      );
      expect(result['EC Analytics']).toBeUndefined();
    });

    it('returns undefined for null/undefined body values', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        JSON.stringify({ request: { id: {} } })
      );
      expect(result['TNT ID']).toBeUndefined();
      expect(result.MCID).toBeUndefined();
    });

    it('handles HAR format post body', () => {
      const result = adobeTarget.parseParams(
        'https://company.tt.omtrdc.net/rest/v1/delivery?client=ACME',
        { text: JSON.stringify({ request: {} }) }
      );
      expect(result['Client Code']).toBe('ACME');
    });
  });
});