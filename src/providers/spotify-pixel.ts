import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const spotifyPixel: Provider = {
  name: 'Spotify Pixel',
  color: '#1DB954',
  pattern: /ads\.spotify\.com\/pixel|pixel\.spotify\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'Pixel ID': p.pixel_id,
      GDPR: p.gdpr,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
