import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const merkury: Provider = {
  name: 'Merkury',
  color: '#003366',
  pattern: /d\.merkury\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event,
      'Merkury ID': p.mid,
      Segment: p.sv,
    };
  },
} as const;
