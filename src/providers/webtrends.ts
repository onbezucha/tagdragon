import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const webtrends: Provider = {
  name: 'Webtrends',
  color: '#8DC63F',
  pattern: /statse\.webtrendslive\.com|webtrendslive\.com\/dcs/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Site Name': p['WT.si_n'],
      Scene: p['WT.si_x'],
      URI: p.dcsuri,
      Server: p.dcssip,
      'Visitor ID': p.WT_FPC,
    };
  },
} as const;
