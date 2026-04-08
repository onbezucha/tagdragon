import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const lytics: Provider = {
  name: 'Lytics',
  color: '#6C3FEE',
  pattern: /c\.lytics\.io/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event,
      'User ID': p.uid,
      URL: p.url,
      'Client ID': p.cid,
    };
  },
} as const;
