import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const scorecard: Provider = {
  name: 'Scorecard',
  color: '#009B77',
  pattern: /scorecardresearch\.com\/p\?/,

  parseParams(url: string): Record<string, string | undefined> {
    const p = getParams(url);
    return {
      Publisher: p.c1,
      Site: p.c2,
      Segment: p.c4,
      URL: p['rn'],
    };
  },
} as const;
