import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const dynamicYield: Provider = {
  name: 'Dynamic Yield',
  color: '#6B5CE7',
  pattern: /dyntrk\.com|cdn\.dynamicyield\.com\/api/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'DY ID': p.dyid,
      'Session ID': p.ses,
      Event: p.name,
      Section: p.section,
    };
  },
} as const;
