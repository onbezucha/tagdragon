import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const segment: Provider = {
  name: 'Segment',
  color: '#52BD94',
  // Segment Analytics.js and HTTP API endpoints
  pattern: /api\.segment\.io|segmentapis\.com|cdn\.segment\.com\/v1\/(t|p|i|g|a)\b/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    return {
      Type: p['type'],
      Event: p['event'],
      'Anonymous ID': p['anonymousId'],
      'User ID': p['userId'],
      URL: url,
    };
  },
} as const;
