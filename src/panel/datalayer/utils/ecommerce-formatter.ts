// ─── ECOMMERCE FORMATTER ─────────────────────────────────────────────────────
// Detect e-commerce type and render product tables from DataLayer pushes.

import { detectEcommerceType, type EcommerceType } from '@/shared/ecommerce';
import { esc } from '../../utils/format';

// Re-export for backwards compatibility
export { detectEcommerceType };
export type { EcommerceType };

interface ProductItem {
  id: string;
  name: string;
  category: string;
  variant: string;
  quantity: number;
  price: string;
}

/**
 * Extract products array from e-commerce data (GA4 + UA compatible).
 */
export function extractProducts(ec: Record<string, unknown>): ProductItem[] {
  // GA4: ecommerce.items
  if (Array.isArray(ec['items'])) {
    return (ec['items'] as Record<string, unknown>[]).map(normalizeProduct);
  }
  // UA: ecommerce.purchase.products
  const purchase = ec['purchase'] as Record<string, unknown> | undefined;
  if (purchase && Array.isArray(purchase['products'])) {
    return (purchase['products'] as Record<string, unknown>[]).map(normalizeProduct);
  }
  // UA: ecommerce.impressions
  if (Array.isArray(ec['impressions'])) {
    return (ec['impressions'] as Record<string, unknown>[]).map(normalizeProduct);
  }
  // UA: ecommerce.checkout.products
  const checkout = ec['checkout'] as Record<string, unknown> | undefined;
  if (checkout && Array.isArray(checkout['products'])) {
    return (checkout['products'] as Record<string, unknown>[]).map(normalizeProduct);
  }
  return [];
}

function normalizeProduct(item: Record<string, unknown>): ProductItem {
  return {
    id: String(item['item_id'] ?? item['id'] ?? item['sku'] ?? ''),
    name: String(item['item_name'] ?? item['name'] ?? ''),
    category: String(item['item_category'] ?? item['category'] ?? ''),
    variant: String(item['item_variant'] ?? item['variant'] ?? ''),
    quantity: Number(item['quantity'] ?? 1),
    price: String(item['price'] ?? ''),
  };
}

/**
 * Extract currency from e-commerce data.
 * Currency comes from ecommerce.currency field, never hardcoded.
 */
export function extractCurrency(ec: Record<string, unknown>): string {
  if (typeof ec['currency'] === 'string' && ec['currency']) return ec['currency'];
  const purchase = ec['purchase'] as Record<string, unknown> | undefined;
  if (purchase && typeof purchase['actionField'] === 'object') {
    const af = purchase['actionField'] as Record<string, unknown>;
    if (typeof af['currency'] === 'string') return af['currency'];
  }
  return '';
}

/**
 * Render an e-commerce product table into a container element.
 */
export function renderEcommerceTable(container: HTMLElement, ec: Record<string, unknown>): void {
  const products = extractProducts(ec);
  if (products.length === 0) return;

  const currency = extractCurrency(ec);
  const currencyDisplay = currency ? ` ${currency}` : '';

  // Calculate total from ecommerce.value or sum of products
  let total = '';
  if (typeof ec['value'] === 'number' || typeof ec['value'] === 'string') {
    total = `${ec['value']}${currencyDisplay}`;
  } else {
    const purchase = ec['purchase'] as Record<string, unknown> | undefined;
    const af = purchase?.['actionField'] as Record<string, unknown> | undefined;
    if (af && (typeof af['revenue'] === 'number' || typeof af['revenue'] === 'string')) {
      total = `${af['revenue']}${currencyDisplay}`;
    }
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'dl-ecommerce-products';

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>ID/SKU</th>
        <th>Name</th>
        <th>Category</th>
        <th>Variant</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  products.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td class="mono">${esc(p.id)}</td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.category)}</td>
      <td>${esc(p.variant)}</td>
      <td>${p.quantity}</td>
      <td class="mono">${esc(p.price)}${currencyDisplay}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  if (total) {
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `<tr class="dl-total-row"><td colspan="6">Total</td><td class="mono">${esc(total)}</td></tr>`;
    table.appendChild(tfoot);
  }

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}
