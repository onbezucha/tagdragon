import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const optimizely: Provider = {
  name: 'Optimizely',
  color: '#0037FF',
  pattern: /\.optimizely\.com\/log\//,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'User ID': p.userId,
      'Account ID': p.accountId,
      'Project ID': p.projectId,
      'Experiment ID': p.experimentId,
      'Variation ID': p.variationId,
      Event: p.eventName,
      Revenue: p.revenue,
    };
  },
} as const;
