import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

/**
 * Parse.ly (acquired by WordPress VIP / Automattic, February 2021)
 * Now distributed as "Parse.ly for WordPress VIP". Endpoints unchanged.
 */
export const parsely: Provider = {
  name: 'Parse.ly',
  color: '#5BA4E5',
  pattern: /srv\.pixel\.parsely\.com|p\.parsely\.com\/pixel/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      'Page URL': p.url,
      Referrer: p.urlref,
      Action: p.action,
      'Site ID': p.id,
      Timestamp: p.ts,
    };
    result._eventName = result['Action'];

    return result;
  },
} as const;
