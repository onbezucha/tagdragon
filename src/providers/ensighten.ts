import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const ensighten: Provider = {
  name: 'Ensighten',
  color: '#8B5CF6',
  pattern: /nexus\.ensighten\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Bootstrap': p.bootstrap,
      'Client': p.client,
      'Space': p.pub,
    };
  },
} as const;
