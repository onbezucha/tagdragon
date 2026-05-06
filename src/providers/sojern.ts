import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const sojern: Provider = {
  name: 'Sojern',
  color: '#00AED9',
  pattern: /beacon\.sojern\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'Partner ID': p.hpid,
      Type: p.t,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
