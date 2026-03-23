import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const fullstory: Provider = {
  name: 'FullStory',
  color: '#875AE2',
  pattern: /fullstory\.com\/rec|rs\.fullstory\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'User ID': p.uid,
      'Display Name': p.displayName,
      'Email': p.email,
    };
  },
} as const;
