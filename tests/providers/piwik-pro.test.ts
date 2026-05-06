import { describe, it, expect } from 'vitest';
import { piwikPro } from '../../src/providers/piwik-pro';

describe('Piwik PRO Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches piwik.pro/ppms.php', () => {
      expect(
        piwikPro.pattern.test(
          'https://piwik.pro/ppms.php?idsite=1&action_name=home'
        )
      ).toBe(true);
    });

    it('matches .piwik.pro/ppms.php', () => {
      expect(
        piwikPro.pattern.test(
          'https://analytics.example.piwik.pro/ppms.php?idsite=1&action_name=page'
        )
      ).toBe(true);
    });

    it('does NOT match JS file paths on piwik.pro', () => {
      expect(
        piwikPro.pattern.test(
          'https://abc123.piwik.pro/xyz456/js/script.js'
        )
      ).toBe(false);
    });

    it('does NOT match unrelated domains', () => {
      expect(
        piwikPro.pattern.test('https://google-analytics.com/collect')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts idsite, action_name, url', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=5&action_name=home&url=https%3A%2F%2Fexample.com',
        {}
      );
      expect(result['Site ID']).toBe('5');
      expect(result.Action).toBe('home');
      expect(result['Page URL']).toBe('https://example.com');
    });

    it('extracts ecommerce fields (ec_id, ec_items)', () => {
      const ecItems = JSON.stringify([
        { sku: 'SKU-001', name: 'Product A', price: 29.99, quantity: 2 },
      ]);
      const result = piwikPro.parseParams(
        `https://piwik.pro/ppms.php?idsite=1&action_name=purchase&ec_id=ORDER-123&ec_items=${encodeURIComponent(ecItems)}`,
        {}
      );
      expect(result['Order ID']).toBe('ORDER-123');
      expect(result.Items).toContain('SKU-001');
      expect(result.Items).toContain('Product A');
      expect(result.Items).toContain('29.99');
    });

    it('parses ec_items JSON on failure gracefully', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=test&ec_items=not-valid-json',
        {}
      );
      expect(result.Items).toBe('not-valid-json');
    });

    it('extracts custom event fields (e_c, e_a, e_n)', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=page&e_c=category&e_a=click&e_n=event_name',
        {}
      );
      expect(result['Event Category']).toBe('category');
      expect(result['Event Action']).toBe('click');
      expect(result['Event Name']).toBe('event_name');
    });

    it('extracts uid and revenue', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=test&uid=user456&revenue=99.99',
        {}
      );
      expect(result['User ID']).toBe('user456');
      expect(result.Revenue).toBe('99.99');
    });

    it('extracts idgoal', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=goal&uid=admin&idgoal=2',
        {}
      );
      expect(result['Goal ID']).toBe('2');
    });

    it('passes through dimension params', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=test&dimension1=page_type&dimension2=logged_in',
        {}
      );
      expect(result.Dimension1).toBe('page_type');
      expect(result.Dimension2).toBe('logged_in');
    });

    it('extracts _eventName from action_name', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=product_view',
        {}
      );
      expect(result._eventName).toBe('product_view');
    });

    it('extracts ecommerce subtotal, tax, shipping, discount', () => {
      const result = piwikPro.parseParams(
        'https://piwik.pro/ppms.php?idsite=1&action_name=purchase&ec_st=80&ec_tx=10&ec_sh=5&ec_dt=5',
        {}
      );
      expect(result.Subtotal).toBe('80');
      expect(result.Tax).toBe('10');
      expect(result.Shipping).toBe('5');
      expect(result.Discount).toBe('5');
    });
  });
});