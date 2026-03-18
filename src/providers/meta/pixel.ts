import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const metaPixel: Provider = {
  name: 'Meta Pixel',
  color: '#1877F2',
  pattern: /facebook\.com\/tr[/?]/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event': p.ev,
      'Pixel ID': p.id,
      'Action': p.a,
      'URL': p.dl,
    };
  },
} as const;
