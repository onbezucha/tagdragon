import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const sojern: Provider = {
  name: 'Sojern',
  color: '#00AED9',
  pattern: /beacon\.sojern\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event,
      'Partner ID': p.hpid,
      Type: p.t,
    };
  },
} as const;
