// ─── SHARED E-COMMERCE DETECTION ─────────────────────────────────────────────
// Unified e-commerce type detection for DataLayer pushes.
// Used by both the DevTools relay and the panel formatter.

export type EcommerceType = 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null;

/**
 * Detect the e-commerce event type from a DataLayer push.
 * Unified implementation used by both the relay and the panel formatter.
 */
export function detectEcommerceType(data: Record<string, unknown>): EcommerceType {
  const event = typeof data['event'] === 'string' ? data['event'] : '';

  // Event-name-only detection (no ecommerce field needed)
  if (event === 'purchase') return 'purchase';
  if (event === 'refund') return 'refund';
  if (
    event.startsWith('begin_checkout') ||
    event.startsWith('add_shipping') ||
    event.startsWith('add_payment')
  )
    return 'checkout';
  if (event === 'view_item_list') return 'impression';
  if (event === 'select_promotion') return 'promo';

  // Ecommerce object detection
  if (!data['ecommerce']) return null;
  const ec = data['ecommerce'] as Record<string, unknown>;

  if (ec['purchase']) return 'purchase';
  if (ec['refund']) return 'refund';
  if (ec['checkout']) return 'checkout';
  if (ec['impressions'] || ec['item_list_name']) return 'impression';
  if (ec['promoView'] || ec['promoClick'] || ec['promotions']) return 'promo';

  // GA4 general ecommerce
  if (ec['items']) return 'impression';
  return null;
}
