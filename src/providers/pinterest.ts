import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const pinterestPixel: Provider = {
  name: 'Pinterest Pixel',
  color: '#E60023',
  // Pinterest Conversion Tag beacon
  pattern: /ct\.pinterest\.com\/v3\//,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    // 'ed' param contains JSON-encoded event data
    let event: string | undefined;
    let value: string | undefined;
    let currency: string | undefined;
    if (p['ed']) {
      try {
        const ed = JSON.parse(p['ed']) as Record<string, unknown>;
        event = ed['event'] != null ? String(ed['event']) : undefined;
        value = ed['value'] != null ? String(ed['value']) : undefined;
        currency = ed['currency'] != null ? String(ed['currency']) : undefined;
      } catch { /* Ignore parse errors */ }
    }

    return {
      'Tag ID': p['tid'],
      'Event': event,
      'Value': value,
      'Currency': currency,
      'URL': url,
    };
  },
} as const;
