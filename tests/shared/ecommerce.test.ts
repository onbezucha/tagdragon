import { describe, it, expect } from 'vitest';
import { detectEcommerceType } from '@/shared/ecommerce';

describe('detectEcommerceType', () => {
  describe('event name detection', () => {
    it("detects 'purchase' from event name", () => {
      const result = detectEcommerceType({ event: 'purchase' });
      expect(result).toBe('purchase');
    });

    it("detects 'refund' from event name", () => {
      const result = detectEcommerceType({ event: 'refund' });
      expect(result).toBe('refund');
    });

    it("detects 'checkout' from begin_checkout event", () => {
      const result = detectEcommerceType({ event: 'begin_checkout' });
      expect(result).toBe('checkout');
    });

    it("detects 'checkout' from add_shipping_info", () => {
      const result = detectEcommerceType({ event: 'add_shipping_info' });
      expect(result).toBe('checkout');
    });

    it("detects 'checkout' from add_payment_info", () => {
      const result = detectEcommerceType({ event: 'add_payment_info' });
      expect(result).toBe('checkout');
    });

    it("detects 'impression' from view_item_list", () => {
      const result = detectEcommerceType({ event: 'view_item_list' });
      expect(result).toBe('impression');
    });

    it("detects 'promo' from select_promotion", () => {
      const result = detectEcommerceType({ event: 'select_promotion' });
      expect(result).toBe('promo');
    });
  });

  describe('ecommerce object detection', () => {
    it("detects 'purchase' from ecommerce.purchase object", () => {
      const result = detectEcommerceType({ ecommerce: { purchase: {} } });
      expect(result).toBe('purchase');
    });

    it("detects 'refund' from ecommerce.refund object", () => {
      const result = detectEcommerceType({ ecommerce: { refund: {} } });
      expect(result).toBe('refund');
    });

    it("detects 'checkout' from ecommerce.checkout object", () => {
      const result = detectEcommerceType({ ecommerce: { checkout: { action: {} } } });
      expect(result).toBe('checkout');
    });

    it("detects 'impression' from ecommerce.impressions", () => {
      const result = detectEcommerceType({ ecommerce: { impressions: [{}] } });
      expect(result).toBe('impression');
    });

    it("detects 'impression' from ecommerce.item_list_name", () => {
      const result = detectEcommerceType({ ecommerce: { item_list_name: 'Search' } });
      expect(result).toBe('impression');
    });

    it("detects 'promo' from ecommerce.promoView", () => {
      const result = detectEcommerceType({ ecommerce: { promoView: {} } });
      expect(result).toBe('promo');
    });

    it("detects 'promo' from ecommerce.promoClick", () => {
      const result = detectEcommerceType({ ecommerce: { promoClick: {} } });
      expect(result).toBe('promo');
    });

    it("detects 'promo' from ecommerce.promotions", () => {
      const result = detectEcommerceType({ ecommerce: { promotions: [] } });
      expect(result).toBe('promo');
    });

    it("detects 'impression' from ecommerce.items (GA4)", () => {
      const result = detectEcommerceType({ ecommerce: { items: [{}] } });
      expect(result).toBe('impression');
    });
  });

  describe('edge cases', () => {
    it("returns null for non-ecommerce event", () => {
      const result = detectEcommerceType({ event: 'page_view' });
      expect(result).toBe(null);
    });

    it("returns null for empty object", () => {
      const result = detectEcommerceType({});
      expect(result).toBe(null);
    });

    it("event-name detection takes priority over ecommerce object", () => {
      const result = detectEcommerceType({ event: 'purchase', ecommerce: { checkout: {} } });
      expect(result).toBe('purchase');
    });

    it("handles missing event key gracefully", () => {
      const result = detectEcommerceType({ ecommerce: { items: [] } });
      expect(result).toBe('impression');
    });
  });
});