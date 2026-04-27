import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const theTradeDesk: Provider = {
  name: 'The Trade Desk',
  color: '#005587',
  // The Trade Desk Universal Pixel
  pattern: /insight\.adsrvr\.org\/track\//,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    return {
      'Advertiser ID': p['adv'],
      'Universal Pixel ID': p['upid'],
      Value: p['v'],
      'Order ID': p['orderid'],
      'Transaction ID': p.tda,
      'Match ID': p.tm,
      'Conversion Type': p.tdu,
      'Custom X': p.tx,
      'Custom Y': p.ty,
    };
  },
} as const;
