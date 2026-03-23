import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const redditPixel: Provider = {
  name: 'Reddit Pixel',
  color: '#FF4500',
  pattern: /reddit\.com\/t\.gif|ads\.reddit\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event': p.event_name,
      'Advertiser ID': p.advertiser_id,
      'Conversion ID': p.conversion_id,
      'Value': p.value,
      'Currency': p.currency,
    };
  },
} as const;
