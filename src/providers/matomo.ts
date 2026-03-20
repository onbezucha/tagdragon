import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const matomo: Provider = {
  name: 'Matomo',
  color: '#3152A0',
  // Matomo (formerly Piwik) tracking pixel — matches both hosted and cloud instances
  pattern: /\/(piwik|matomo)\.php(\?|$)/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    return {
      'Site ID': p['idsite'],
      'Action': p['action_name'],
      'URL': p['url'],
      'Event Category': p['e_c'],
      'Event Action': p['e_a'],
      'Event Name': p['e_n'],
      'Revenue': p['revenue'],
      'User ID': p['uid'],
    };
  },
} as const;
