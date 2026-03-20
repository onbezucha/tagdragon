import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const twitterPixel: Provider = {
  name: 'X (Twitter) Pixel',
  color: '#000000',
  // Twitter/X Ads pixel beacon
  pattern: /analytics\.twitter\.com\/i\/adsct|t\.co\/i\/adsct/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    return {
      'Transaction ID': p['txn_id'],
      'Pixel ID': p['p_id'],
      'Sale Amount': p['tw_sale_amount'],
      'Order Quantity': p['tw_order_quantity'],
      'URL': url,
    };
  },
} as const;
