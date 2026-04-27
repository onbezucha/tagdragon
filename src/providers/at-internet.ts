import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const atInternet: Provider = {
  name: 'AT Internet',
  color: '#00BCD4',
  pattern: /ati-host\.net|\.xiti\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const result: Record<string, string | undefined> = {
      'Site Name': p.x2,
      'Level 2': p.s2,
      Page: p.p,
      Campaign: p.xtor,
      'Hit Type': p.type,
      Click: p.clic,
      Referrer: p.ref,
      'Visitor ID': p.idclient,
      'User ID': p.uid,
      'Custom Object': p.xto,
      'Search Keywords': p.ise,
    };

    const knownKeys = new Set([
      'x2',
      's2',
      'p',
      'xtor',
      'type',
      'clic',
      'ref',
      'idclient',
      'uid',
      'xto',
      'ise',
    ]);
    for (const [key, value] of Object.entries(p)) {
      if (!knownKeys.has(key) && value) {
        result[key] = value;
      }
    }

    return result;
  },
} as const;
