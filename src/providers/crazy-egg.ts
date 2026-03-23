import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const crazyEgg: Provider = {
  name: 'Crazy Egg',
  color: '#FF6B35',
  pattern: /crazyegg\.com\/pages|script\.crazyegg\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Account ID': p.ceid,
      'Page URL': p.page_url,
    };
  },
} as const;
