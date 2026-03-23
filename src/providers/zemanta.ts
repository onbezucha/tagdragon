import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const zemanta: Provider = {
  name: 'Zemanta',
  color: '#7B68EE',
  pattern: /p\.zemanta\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event': p.event,
      'Campaign ID': p.campaign_id,
      'Order ID': p.order_id,
    };
  },
} as const;
