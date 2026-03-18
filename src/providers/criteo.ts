import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const criteo: Provider = {
  name: 'Criteo',
  color: '#F5821F',
  pattern: /dis\.criteo\.com|sslwidget\.criteo\.com|static\.criteo\.net/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Account': p.a,
      'Event': p.e,
      'URL': url,
    };
  },
} as const;
