import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const bingAds: Provider = {
  name: 'Bing Ads',
  color: '#008373',
  pattern: /bat\.bing\.com\/action\/0/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Tag ID': p.ti,
      'Event': p.evt,
      'URL': p.p,
    };
  },
} as const;
