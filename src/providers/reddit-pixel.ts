import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const redditPixel: Provider = {
  name: 'Reddit Pixel',
  color: '#FF4500',
  pattern: /reddit\.com\/rp\.gif/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    // Request type: custom event name takes priority over standard event
    const requestType = p['m.customEventName'] || p.event || undefined;

    return {
      'Account ID': p.id,
      'Event': requestType,
      'Custom Event Name': p['m.customEventName'],
      'Item Count': p['m.itemCount'],
      'Value': p['m.value'],
      'Value (Decimal)': p['m.valueDecimal'],
      'Currency': p['m.currency'],
      'Products': p['m.products'],
      'Conversion ID': p['m.conversionId'],
    };
  },
} as const;
