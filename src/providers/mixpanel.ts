import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const mixpanel: Provider = {
  name: 'Mixpanel',
  color: '#7856FF',
  // Mixpanel tracking and engage endpoints
  pattern: /mixpanel\.com\/(track|engage|import)/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    // Mixpanel classic: POSTs data= param with base64-encoded JSON array
    let eventName: string | undefined = p['event'];
    let distinctId: string | undefined = p['distinct_id'];
    let token: string | undefined = p['token'];
    let currentUrl: string | undefined = p['$current_url'];

    if (p['data']) {
      try {
        const decoded = JSON.parse(atob(p['data']));
        const item: Record<string, unknown> = Array.isArray(decoded) ? decoded[0] : decoded;
        if (item) {
          eventName = item['event'] != null ? String(item['event']) : eventName;
          const props = (item['properties'] as Record<string, unknown>) ?? {};
          distinctId = props['distinct_id'] != null ? String(props['distinct_id']) : distinctId;
          token = props['token'] != null ? String(props['token']) : token;
          currentUrl = props['$current_url'] != null ? String(props['$current_url']) : currentUrl;
        }
      } catch { /* Ignore decode errors */ }
    }

    return {
      'Event': eventName,
      'Distinct ID': distinctId,
      'Token': token,
      'URL': currentUrl ?? url,
    };
  },
} as const;
