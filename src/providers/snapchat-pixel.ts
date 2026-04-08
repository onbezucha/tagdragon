import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const snapchatPixel: Provider = {
  name: 'Snapchat Pixel',
  color: '#FFFC00',
  pattern: /tr\.snapchat\.com|snapkit\.com\/v1\/advertising/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event_type,
      'Pixel ID': p.pixel_id,
      'Page URL': p.page_url,
      Price: p.price,
      Currency: p.currency,
      Email: p.user_email,
    };
  },
} as const;
