import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const outbrain: Provider = {
  name: 'Outbrain',
  color: '#0066CC',
  pattern: /tr\.outbrain\.com\/unifiedPixel|amplify\.outbrain\.com\/pixel/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.name,
      'Click ID': p.ob_click_id,
      'Order Value': p.orderValue,
      Currency: p.currency,
    };
  },
} as const;
