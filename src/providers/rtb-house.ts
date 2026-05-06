import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const rtbHouse: Provider = {
  name: 'RTB House',
  color: '#E31E24',
  pattern: /creative\.rtbhouse\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'User ID': p.user_id,
      Category: p.ct,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
