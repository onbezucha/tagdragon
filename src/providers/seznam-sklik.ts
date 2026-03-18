import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const seznamSklik: Provider = {
  name: 'Sklik',
  color: '#CC0000',
  pattern: /c\.seznam\.cz\/retargeting|h\.seznam\.cz/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'ID': p.id,
      'Value': p.value,
      'URL': url,
    };
  },
} as const;
