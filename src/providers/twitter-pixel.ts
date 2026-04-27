import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const twitterPixel: Provider = {
  name: 'X (Twitter) Pixel',
  color: '#000000',
  // Twitter/X Ads pixel beacon
  pattern: /analytics\.twitter\.com\/i\/adsct|t\.co\/i\/adsct/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    // Parse events from URL-encoded JSON array: [["pageview",{}]]
    let eventType = '';
    try {
      const events = JSON.parse(p['events'] || '[]');
      if (Array.isArray(events[0])) eventType = events[0][0] || '';
    } catch {}

    return {
      Event: eventType || p['events'],
      'Event ID': p['event_id'],
      'Pixel ID': p['p_id'],
      'Page URL': p['tw_document_href'],
      Partner: p['pt'],
      'User ID (twpid)': p['twpid'],
      'Sale Amount': p['tw_sale_amount'],
      'Order Quantity': p['tw_order_quantity'],
      'Transaction ID': p['txn_id'],
      'Page Title': p.tw_document_title,
      'Conversion ID': p.tw_conversion_id,
      'Email (hashed)': p.em,
      'Phone (hashed)': p.ph,
      'First Name (hashed)': p.fn,
      'Last Name (hashed)': p.ln,
    };
  },
} as const;
