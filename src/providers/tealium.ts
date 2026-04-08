import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const tealium: Provider = {
  name: 'Tealium',
  color: '#00B5AD',
  pattern: /tags\.tiqcdn\.com|collect\.tealiumiq\.com|datacloud\.tealiumiq\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Account: p.account,
      Profile: p.profile,
      Event: p.event,
      URL: url,
    };
  },
} as const;
