import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const rtbHouse: Provider = {
  name: 'RTB House',
  color: '#E31E24',
  pattern: /creative\.rtbhouse\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event,
      'User ID': p.user_id,
      Category: p.ct,
    };
  },
} as const;
