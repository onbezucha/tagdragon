import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const indicative: Provider = {
  name: 'Indicative',
  color: '#4A90D9',
  pattern: /api\.indicative\.com\/service\/event/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    let eventName: string | undefined;
    let uniqueId: string | undefined;
    let apiKey: string | undefined;
    try {
      const har = postBody as { text?: string } | undefined;
      if (har?.text) {
        const body = JSON.parse(har.text) as Record<string, unknown>;
        eventName = body.eventName as string | undefined;
        uniqueId = body.uniqueId as string | undefined;
        apiKey = body.apiKey as string | undefined;
      }
    } catch { /* ignore */ }
    return {
      'Event': eventName,
      'User ID': uniqueId,
      'API Key': apiKey || p.apiKey,
    };
  },
} as const;
