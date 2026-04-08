import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const rudderstack: Provider = {
  name: 'RudderStack',
  color: '#1EA9DB',
  pattern: /\.rudderstack\.com\/v1\/|hosted\.rudderlabs\.com\/v1\//,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    let event: string | undefined;
    let type: string | undefined;
    let userId: string | undefined;
    let anonymousId: string | undefined;
    try {
      const har = postBody as { text?: string } | undefined;
      if (har?.text) {
        const body = JSON.parse(har.text) as Record<string, unknown>;
        event = body.event as string | undefined;
        type = body.type as string | undefined;
        userId = body.userId as string | undefined;
        anonymousId = body.anonymousId as string | undefined;
      }
    } catch {
      /* ignore */
    }
    return {
      Type: type,
      Event: event,
      'User ID': userId,
      'Anonymous ID': anonymousId,
      'Write Key': p.writeKey,
    };
  },
} as const;
