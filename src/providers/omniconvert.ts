import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const omniconvert: Provider = {
  name: 'Omniconvert',
  color: '#FF6600',
  pattern: /api\.omniconvert\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event': p.event,
      'Experiment ID': p.experiment_id,
      'Variation ID': p.variation_id,
    };
  },
} as const;
