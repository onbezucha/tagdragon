import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const hotjar: Provider = {
  name: 'Hotjar',
  color: '#FF3C00',
  pattern: /hotjar\.com\/(h\.js|hjboot|hj\.|api\/v)/,

  parseParams(url: string): Record<string, string | undefined> {
    const p = getParams(url);
    return {
      'Site ID': p.hjid || p.siteId,
    };
  },
} as const;
