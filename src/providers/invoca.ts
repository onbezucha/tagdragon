import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const invoca: Provider = {
  name: 'Invoca',
  color: '#00B8C8',
  pattern: /solutions\.invoca\.com\/pixel/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'Transaction ID': p.transaction_id,
      'Campaign ID': p.campaign_id,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
