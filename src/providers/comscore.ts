import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const comscore: Provider = {
  name: 'Comscore',
  color: '#0099CC',
  pattern: /scorecardresearch\.com\/b\b|sb\.scorecardresearch\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Type': p.c1,
      'Client ID': p.c2,
      'Consent': p.cs_ucfr,
      'Segment': p.c12,
    };
  },
} as const;
