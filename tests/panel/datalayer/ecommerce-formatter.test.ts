import { describe, it, expect } from 'vitest';
import { extractCurrency } from '../../../src/panel/datalayer/utils/ecommerce-formatter';
import { detectEcommerceType, type EcommerceType } from '@/shared/ecommerce';

// ─── EXTRACT CURRENCY ───────────────────────────────────────────────────────

describe('extractCurrency', () => {
  // ─── Direct currency field ────────────────────────────────────────────────

  describe('direct currency field', () => {
    it('extracts currency from top-level ecommerce.currency', () => {
      const ec = { currency: 'USD' };
      expect(extractCurrency(ec)).toBe('USD');
    });

    it('returns empty string when currency is missing', () => {
      const ec = {};
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when currency is null', () => {
      const ec = { currency: null };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when currency is undefined', () => {
      const ec = { currency: undefined };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when currency is empty string', () => {
      const ec = { currency: '' };
      expect(extractCurrency(ec)).toBe('');
    });

    it('extracts non-USD currency', () => {
      expect(extractCurrency({ currency: 'EUR' })).toBe('EUR');
      expect(extractCurrency({ currency: 'GBP' })).toBe('GBP');
      expect(extractCurrency({ currency: 'JPY' })).toBe('JPY');
      expect(extractCurrency({ currency: 'CZK' })).toBe('CZK');
    });

    it('prefers direct currency over purchase.actionField.currency', () => {
      const ec = {
        currency: 'EUR',
        purchase: { actionField: { revenue: 100, currency: 'USD' } },
      };
      expect(extractCurrency(ec)).toBe('EUR');
    });
  });

  // ─── UA purchase actionField ─────────────────────────────────────────────

  describe('UA purchase.actionField.currency', () => {
    it('extracts currency from purchase.actionField.currency', () => {
      const ec = {
        purchase: {
          actionField: { revenue: 99.99, currency: 'USD' },
        },
      };
      expect(extractCurrency(ec)).toBe('USD');
    });

    it('extracts currency when purchase exists but no direct currency', () => {
      const ec = {
        purchase: {
          actionField: { revenue: 50, currency: 'GBP' },
        },
      };
      expect(extractCurrency(ec)).toBe('GBP');
    });

    it('returns empty string when actionField is missing', () => {
      const ec = { purchase: {} };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when actionField.currency is missing', () => {
      const ec = { purchase: { actionField: { revenue: 100 } } };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when actionField.currency is empty string', () => {
      const ec = { purchase: { actionField: { revenue: 100, currency: '' } } };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when actionField.currency is not a string', () => {
      const ec = { purchase: { actionField: { revenue: 100, currency: 123 } } };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when purchase is not an object', () => {
      const ec = { purchase: null };
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty string when purchase is an array', () => {
      const ec = { purchase: [] };
      expect(extractCurrency(ec)).toBe('');
    });
  });

  // ─── Priority ─────────────────────────────────────────────────────────────

  describe('priority order', () => {
    it('prioritizes direct currency over actionField', () => {
      const ec = {
        currency: 'EUR',
        purchase: { actionField: { revenue: 100, currency: 'USD' } },
      };
      expect(extractCurrency(ec)).toBe('EUR');
    });

    it('falls back to actionField.currency when direct currency missing', () => {
      const ec = {
        purchase: { actionField: { revenue: 100, currency: 'USD' } },
      };
      expect(extractCurrency(ec)).toBe('USD');
    });

    it('returns empty when neither field is present', () => {
      const ec = {};
      expect(extractCurrency(ec)).toBe('');
    });

    it('returns empty when only value field is present', () => {
      const ec = { value: 100 };
      expect(extractCurrency(ec)).toBe('');
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles ecommerce object with many fields', () => {
      const ec = {
        currency: 'USD',
        purchase: {
          actionField: { revenue: 100, currency: 'GBP' },
          products: [{ id: 'SKU-001', name: 'Widget', price: 50 }],
        },
        items: [{ item_id: 'SKU-001', item_name: 'Widget', price: 50 }],
      };
      expect(extractCurrency(ec)).toBe('USD');
    });

    it('handles actionField.currency set to whitespace string', () => {
      const ec = { purchase: { actionField: { revenue: 100, currency: '   ' } } };
      expect(extractCurrency(ec)).toBe('');
    });

    it('handles currency field set to whitespace string', () => {
      const ec = { currency: '   ' };
      expect(extractCurrency(ec)).toBe('');
    });

    it('treats numeric currency as invalid', () => {
      const ec = { currency: 123 };
      expect(extractCurrency(ec)).toBe('');
    });

    it('treats boolean currency as invalid', () => {
      const ec = { currency: true };
      expect(extractCurrency(ec)).toBe('');
    });

    it('treats object currency as invalid', () => {
      const ec = { currency: { code: 'USD' } };
      expect(extractCurrency(ec)).toBe('');
    });

    it('handles actionField with extra fields', () => {
      const ec = {
        purchase: {
          actionField: {
            id: 'T-12345',
            revenue: 199.99,
            tax: 15.00,
            currency: 'USD',
            affiliation: 'Online Store',
          },
        },
      };
      expect(extractCurrency(ec)).toBe('USD');
    });
  });
});

// ─── DETECT ECOMMERCE TYPE (re-export from shared) ───────────────────────────

describe('detectEcommerceType', () => {
  // ─── Purchase ─────────────────────────────────────────────────────────────

  describe('purchase', () => {
    it('detects purchase from event name', () => {
      expect(detectEcommerceType({ event: 'purchase' })).toBe('purchase');
    });

    it('detects purchase from ecommerce.purchase object', () => {
      expect(detectEcommerceType({ ecommerce: { purchase: { revenue: 100 } } })).toBe('purchase');
    });

    it('detects purchase when event is purchase and ecommerce has data', () => {
      const data = {
        event: 'purchase',
        ecommerce: {
          purchase: { revenue: 250 },
          currency: 'USD',
        },
      };
      expect(detectEcommerceType(data)).toBe('purchase');
    });
  });

  // ─── Checkout ────────────────────────────────────────────────────────────

  describe('checkout', () => {
    it('detects checkout from begin_checkout event', () => {
      expect(detectEcommerceType({ event: 'begin_checkout' })).toBe('checkout');
    });

    it('detects checkout from add_shipping event', () => {
      expect(detectEcommerceType({ event: 'add_shipping_info' })).toBe('checkout');
    });

    it('detects checkout from add_payment event', () => {
      expect(detectEcommerceType({ event: 'add_payment_info' })).toBe('checkout');
    });

    it('detects checkout from ecommerce.checkout object', () => {
      expect(detectEcommerceType({ ecommerce: { checkout: { step: 1 } } })).toBe('checkout');
    });

    it('detects checkout from begin_checkout with items', () => {
      const data = {
        event: 'begin_checkout',
        ecommerce: {
          checkout: { actionField: { step: 1 } },
          items: [{ id: 'SKU-001' }],
        },
      };
      expect(detectEcommerceType(data)).toBe('checkout');
    });
  });

  // ─── Impression ──────────────────────────────────────────────────────────

  describe('impression', () => {
    it('detects impression from view_item_list event', () => {
      expect(detectEcommerceType({ event: 'view_item_list' })).toBe('impression');
    });

    it('detects impression from ecommerce.impressions', () => {
      expect(detectEcommerceType({ ecommerce: { impressions: [] } })).toBe('impression');
    });

    it('detects impression from item_list_name', () => {
      expect(detectEcommerceType({ ecommerce: { item_list_name: 'Search Results' } })).toBe('impression');
    });

    it('detects impression from GA4 items array', () => {
      const data = {
        ecommerce: {
          items: [{ item_id: 'SKU-001', item_name: 'Widget' }],
        },
      };
      expect(detectEcommerceType(data)).toBe('impression');
    });
  });

  // ─── Promo ───────────────────────────────────────────────────────────────

  describe('promo', () => {
    it('detects promo from select_promotion event', () => {
      expect(detectEcommerceType({ event: 'select_promotion' })).toBe('promo');
    });

    it('detects promo from ecommerce.promoView', () => {
      expect(detectEcommerceType({ ecommerce: { promoView: {} } })).toBe('promo');
    });

    it('detects promo from ecommerce.promoClick', () => {
      expect(detectEcommerceType({ ecommerce: { promoClick: {} } })).toBe('promo');
    });

    it('detects promo from ecommerce.promotions', () => {
      expect(detectEcommerceType({ ecommerce: { promotions: [] } })).toBe('promo');
    });
  });

  // ─── Refund ──────────────────────────────────────────────────────────────

  describe('refund', () => {
    it('detects refund from event name', () => {
      expect(detectEcommerceType({ event: 'refund' })).toBe('refund');
    });

    it('detects refund from ecommerce.refund', () => {
      expect(detectEcommerceType({ ecommerce: { refund: { order_id: 'T-123' } } })).toBe('refund');
    });
  });

  // ─── Non-ecommerce ────────────────────────────────────────────────────────

  describe('non-ecommerce', () => {
    it('returns null when no ecommerce data', () => {
      expect(detectEcommerceType({})).toBeNull();
    });

    it('returns null when ecommerce is null', () => {
      expect(detectEcommerceType({ ecommerce: null })).toBeNull();
    });

    it('returns null for generic events with no ecommerce', () => {
      expect(detectEcommerceType({ event: 'page_view' })).toBeNull();
    });

    it('returns null for custom events', () => {
      expect(detectEcommerceType({ event: 'custom_event', data: 'value' })).toBeNull();
    });

    it('returns null when ecommerce object has no recognized type', () => {
      expect(detectEcommerceType({ ecommerce: { total: 100 } })).toBeNull();
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles event name as non-string', () => {
      expect(detectEcommerceType({ event: 123, ecommerce: { purchase: {} } })).toBe('purchase');
    });

    it('handles missing ecommerce field', () => {
      expect(detectEcommerceType({ event: 'purchase' })).toBe('purchase');
    });

    it('handles ecommerce value that is not an object', () => {
      expect(detectEcommerceType({ ecommerce: 'purchase' })).toBeNull();
    });

    it('handles multiple ecommerce keys (purchase takes priority)', () => {
      const data = {
        event: 'purchase',
        ecommerce: {
          purchase: { revenue: 100 },
          items: [{ id: 'SKU-001' }],
        },
      };
      expect(detectEcommerceType(data)).toBe('purchase');
    });

    it('event name startsWith checkout variants', () => {
      expect(detectEcommerceType({ event: 'begin_checkout_nested' })).toBe('checkout');
      expect(detectEcommerceType({ event: 'add_shipping_deep' })).toBe('checkout');
    });
  });
});