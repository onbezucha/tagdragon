import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const doubleclick: Provider = {
  name: 'DoubleClick',
  color: '#7B2D8B',
  // Matches Floodlight tracking requests (/activity;src=...;type=...;cat=...)
  pattern: /doubleclick\.net\/activity\b/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Advertiser ID': p.src,
      'Activity Type': p.type,
      Activity: p.cat,
      'Click ID': p.dc_rdid || p.gclid,
      'Order ID': p.ord !== undefined && !/^\d{8,}$/.test(p.ord) ? p.ord : undefined,
    };
  },
} as const;
