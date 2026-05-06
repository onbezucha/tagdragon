import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const vibes: Provider = {
  name: 'Vibes',
  color: '#00B4D8',
  pattern: /vibes\.com\/pixel/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'Campaign ID': p.campaign_id,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
