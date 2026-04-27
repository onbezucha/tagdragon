import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const parsely: Provider = {
  name: 'Parse.ly',
  color: '#5BA4E5',
  pattern: /srv\.pixel\.parsely\.com|p\.parsely\.com\/pixel/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Page URL': p.url,
      Referrer: p.urlref,
      Action: p.action,
      'Site ID': p.id,
      Timestamp: p.ts,
    };
  },
} as const;
