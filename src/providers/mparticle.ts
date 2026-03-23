import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const mparticle: Provider = {
  name: 'mParticle',
  color: '#1E96DC',
  pattern: /nativesdks\.mparticle\.com\/v2|api\.mparticle\.com\/v2/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    let eventName: string | undefined;
    let eventType: string | undefined;
    let userId: string | undefined;
    let environment: string | undefined;
    try {
      const har = postBody as { text?: string } | undefined;
      if (har?.text) {
        const body = JSON.parse(har.text) as Record<string, unknown>;
        const events = body.events as Array<Record<string, unknown>> | undefined;
        const firstEvent = events?.[0];
        const data = firstEvent?.data as Record<string, unknown> | undefined;
        eventName = data?.event_name as string | undefined;
        eventType = firstEvent?.event_type as string | undefined;
        const identities = body.user_identities as Record<string, unknown> | undefined;
        userId = identities?.customerid as string | undefined;
        environment = body.environment as string | undefined;
      }
    } catch { /* ignore */ }
    return {
      'Event': eventName,
      'Event Type': eventType,
      'User ID': userId,
      'Environment': environment,
      'API Key': p.key,
    };
  },
} as const;
