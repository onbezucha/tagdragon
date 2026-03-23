import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const teads: Provider = {
  name: 'Teads',
  color: '#00C8BE',
  pattern: /t\.teads\.tv\/page|p\.teads\.tv\//,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event': p.event,
      'Pixel ID': p.pid,
      'Time on Site': p.tos,
    };
  },
} as const;
