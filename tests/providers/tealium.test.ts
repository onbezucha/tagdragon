import { describe, it, expect } from 'vitest';
import { tealium } from '../../src/providers/tealium';

describe('Tealium Provider', () => {
  // ═══ Pattern matching ════════════════════════════════════════════════════

  describe('pattern matching', () => {
    it('matches tags.tiqcdn.com', () => {
      expect(
        tealium.pattern.test('https://tags.tiqcdn.com/utag/acme/main/prod/utag.js')
      ).toBe(true);
    });

    it('matches collect.tealiumiq.com', () => {
      expect(
        tealium.pattern.test('https://collect.tealiumiq.com/v2/event/main')
      ).toBe(true);
    });

    it('matches datacloud.tealiumiq.com', () => {
      expect(
        tealium.pattern.test('https://datacloud.tealiumiq.com/sync/partner')
      ).toBe(true);
    });

    it('does NOT match tealiumiq.com without collect or datacloud prefix', () => {
      expect(
        tealium.pattern.test('https://tealiumiq.com/some/path')
      ).toBe(false);
    });

    it('does NOT match unrelated domains', () => {
      expect(
        tealium.pattern.test('https://google-analytics.com/collect')
      ).toBe(false);
    });
  });

  // ═══ parseParams ═════════════════════════════════════════════════════════

  describe('parseParams', () => {
    it('maps tealium_event to Event', () => {
      const result = tealium.parseParams(
        'https://tags.tiqcdn.com/utag/main/prod/utag.js?tealium_event=button_click',
        {}
      );
      expect(result.Event).toBe('button_click');
    });

    it('maps cp.URL to Page URL', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?cp.URL=https%3A%2F%2Fexample.com%2Fpage',
        {}
      );
      expect(result['Page URL']).toBe('https://example.com/page');
    });

    it('maps ut.campaign to Campaign Name', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?ut.campaign=summer_sale',
        {}
      );
      expect(result['Campaign Name']).toBe('summer_sale');
    });

    it('skips internal Tealium keys (tealium_random, tealium_session_id, etc.)', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?tealium_event=test&tealium_random=abc123&tealium_session_id=xyz789&tealium_timestamp=1234567890',
        {}
      );
      expect(result.Event).toBe('test');
      expect(result.tealium_random).toBeUndefined();
      expect(result.tealium_session_id).toBeUndefined();
      expect(result.tealium_timestamp).toBeUndefined();
    });

    it('passes through unknown keys preserving original name', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?tealium_event=test&custom_attr=value&product_id=SKU-100',
        {}
      );
      expect(result.Event).toBe('test');
      expect(result.custom_attr).toBe('value');
      expect(result.product_id).toBe('SKU-100');
    });

    it('extracts _eventName from Event field', () => {
      const result = tealium.parseParams(
        'https://tags.tiqcdn.com/utag/main/prod/utag.js?tealium_event=purchase_complete',
        {}
      );
      expect(result._eventName).toBe('purchase_complete');
    });

    it('skips empty string values', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?tealium_event=test&tealium_account=',
        {}
      );
      expect(result.Event).toBe('test');
      expect(result.Account).toBeUndefined();
    });

    it('maps multiple ut.* params', () => {
      const result = tealium.parseParams(
        'https://collect.tealiumiq.com/v2/event?ut.source=google&ut.medium=cpc&ut.campaign=brand&ut.term=keyword&ut.content=banner',
        {}
      );
      expect(result['Campaign Source']).toBe('google');
      expect(result['Campaign Medium']).toBe('cpc');
      expect(result['Campaign Name']).toBe('brand');
      expect(result['Campaign Term']).toBe('keyword');
      expect(result['Campaign Content']).toBe('banner');
    });
  });
});