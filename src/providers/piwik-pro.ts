import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const piwikPro: Provider = {
  name: 'Piwik PRO',
  color: '#2C3E50',
  pattern: /piwik\.pro\/ppms\.php|\.piwik\.pro\/ppms\.php/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Site ID': p.idsite,
      'Action': p.action_name,
      'URL': p.url,
      'Event Category': p.e_c,
      'Event Action': p.e_a,
      'Event Name': p.e_n,
      'User ID': p.uid,
    };
  },
} as const;
