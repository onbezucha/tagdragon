// ─── SHARED E-COMMERCE DETECTION ─────────────────────────────────────────────
// Unified e-commerce type detection for DataLayer pushes.
// Used by both the DevTools relay and the panel formatter.

export type EcommerceType = 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null;

/**
 * Detect the e-commerce event type from a DataLayer push.
 * Unified implementation used by both the relay and the panel formatter.
 */
export function detectEcommerceType(
  data: Record<string, unknown>,
): EcommerceType {
  if (!data['ecommerce']) return null;
  const event = typeof data['event'] === 'string' ? data['event'] : '';
  const ec = data['ecommerce'] as Record<string, unknown>;

  if (event === 'purchase' || ec['purchase']) return 'purchase';
  if (event === 'refund' || ec['refund']) return 'refund';
  if (
    event.startsWith('begin_checkout') ||
    event.startsWith('add_shipping') ||
    event.startsWith('add_payment') ||
    ec['checkout']
  ) return 'checkout';
  if (event === 'view_item_list' || ec['impressions'] || ec['item_list_name']) return 'impression';
  if (event === 'select_promotion' || ec['promoView'] || ec['promoClick'] || ec['promotions']) return 'promo';

  // GA4 general ecommerce
  if (ec['items']) return 'impression';
  return null;
}
