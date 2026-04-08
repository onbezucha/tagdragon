import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const amazonAds: Provider = {
  name: 'Amazon Ads',
  color: '#FF9900',
  pattern: /amazon-adsystem\.com\/e\/cm|amazon-adsystem\.com\/aax2/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.o,
      'Page Type': p.pt,
      Slot: p.slot,
      Ref: p.ref_,
      'Ad ID': p.adId,
    };
  },
} as const;
