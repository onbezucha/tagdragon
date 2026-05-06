import { describe, it, expect } from 'vitest';
import { matomo } from '../../src/providers/matomo';

describe('Matomo Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches piwik.php endpoint', () => {
      expect(
        matomo.pattern.test('https://analytics.example.com/piwik.php?idsite=1&action_name=page_view')
      ).toBe(true);
    });

    it('does NOT match piwik.php with trailing slash after ?.php', () => {
      expect(
        matomo.pattern.test('https://analytics.example.com/piwik.php/')
      ).toBe(false);
    });

    it('matches matomo.php endpoint', () => {
      expect(
        matomo.pattern.test('https://analytics.example.com/matomo.php?idsite=2&action_name=test')
      ).toBe(true);
    });

    it('matches matomo.php with no parameters', () => {
      expect(
        matomo.pattern.test('https://analytics.example.com/matomo.php')
      ).toBe(true);
    });

    it('does NOT match unrelated URLs', () => {
      expect(
        matomo.pattern.test('https://www.google-analytics.com/collect?v=1&tid=UA-123')
      ).toBe(false);
    });

    it('matches matomo.php regardless of path prefix', () => {
      expect(
        matomo.pattern.test('https://analytics.example.com/api/matomo.php')
      ).toBe(true);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('extracts Site ID (idsite) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=42&action_name=home',
        undefined
      );
      expect(result['Site ID']).toBe('42');
    });

    it('extracts Action (action_name) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&action_name=Product+View',
        undefined
      );
      expect(result.Action).toBe('Product View');
    });

    it('extracts Page URL (url) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&url=https%3A%2F%2Fexample.com%2Fpage',
        undefined
      );
      expect(result['Page URL']).toBe('https://example.com/page');
    });

    it('extracts event category (e_c) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&e_c=Video&e_a=play',
        undefined
      );
      expect(result['Event Category']).toBe('Video');
    });

    it('extracts event action (e_a) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&e_c=Video&e_a=pause',
        undefined
      );
      expect(result['Event Action']).toBe('pause');
    });

    it('extracts event name (e_n) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&e_c=Video&e_a=play&e_n=MyVideo',
        undefined
      );
      expect(result['Event Name']).toBe('MyVideo');
    });

    it('extracts Revenue from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&revenue=99.50',
        undefined
      );
      expect(result.Revenue).toBe('99.50');
    });

    it('extracts User ID (uid) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&uid=user12345',
        undefined
      );
      expect(result['User ID']).toBe('user12345');
    });

    it('extracts Order ID (ec_id) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&ec_id=ORD-789',
        undefined
      );
      expect(result['Order ID']).toBe('ORD-789');
    });

    it('formats ec_items as pretty-printed JSON', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&ec_items=%5B%7B%22sku%22%3A%22SKU001%22%2C%22name%22%3A%22Widget%22%7D%5D',
        undefined
      );
      expect(result.Items).toBe(
        '[\n  {\n    "sku": "SKU001",\n    "name": "Widget"\n  }\n]'
      );
    });

    it('handles malformed ec_items gracefully', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&ec_items=invalid-json',
        undefined
      );
      expect(result.Items).toBe('invalid-json');
    });

    it('extracts Goal ID (idgoal) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&idgoal=5',
        undefined
      );
      expect(result['Goal ID']).toBe('5');
    });

    it('extracts E-commerce subtotal (ec_st)', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&ec_st=100.00',
        undefined
      );
      expect(result.Subtotal).toBe('100.00');
    });

    it('extracts E-commerce tax (ec_tx)', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&ec_tx=20.00',
        undefined
      );
      expect(result.Tax).toBe('20.00');
    });

    it('extracts E-commerce shipping (ec_sh)', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&ec_sh=10.00',
        undefined
      );
      expect(result.Shipping).toBe('10.00');
    });

    it('extracts E-commerce discount (ec_dt)', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&ec_dt=15.00',
        undefined
      );
      expect(result.Discount).toBe('15.00');
    });

    it('extracts Campaign Name (_rcn) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&_rcn=spring_sale',
        undefined
      );
      expect(result['Campaign Name']).toBe('spring_sale');
    });

    it('extracts Campaign Keyword (_rck) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&_rck=widget',
        undefined
      );
      expect(result['Campaign Keyword']).toBe('widget');
    });

    it('extracts Search Category (search_cat) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&search_cat=Electronics',
        undefined
      );
      expect(result['Search Category']).toBe('Electronics');
    });

    it('extracts Search Count (search_count) from URL', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php?idsite=1&search_count=15',
        undefined
      );
      expect(result['Search Count']).toBe('15');
    });

    it('extracts custom dimension parameters', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&dimension1=custom-value&dimension2=another-value',
        undefined
      );
      expect(result['Dimension1']).toBe('custom-value');
      expect(result['Dimension2']).toBe('another-value');
    });

    it('does not include empty dimension parameters', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&dimension1=value&dimension2=',
        undefined
      );
      expect(result['Dimension1']).toBe('value');
      expect(result.Dimension2).toBeUndefined();
    });

    it('sets _eventName to action_name', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/piwik.php?idsite=1&action_name=checkout_complete',
        undefined
      );
      expect(result._eventName).toBe('checkout_complete');
    });

    it('extracts from POST body', () => {
      const result = matomo.parseParams(
        'https://analytics.example.com/matomo.php',
        'idsite=3&action_name=form_submit&uid=user456&e_c=Form&e_a=submit'
      );
      expect(result['Site ID']).toBe('3');
      expect(result.Action).toBe('form_submit');
      expect(result['User ID']).toBe('user456');
      expect(result['Event Category']).toBe('Form');
      expect(result['Event Action']).toBe('submit');
    });
  });
});