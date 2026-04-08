import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const atInternet: Provider = {
  name: 'AT Internet',
  color: '#00BCD4',
  pattern: /ati-host\.net|\.xiti\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Site Name': p.x2,
      'Level 2': p.s2,
      Page: p.p,
      Campaign: p.xtor,
      'Hit Type': p.type,
      Click: p.clic,
    };
  },
} as const;
