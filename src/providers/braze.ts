import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const braze: Provider = {
  name: 'Braze',
  color: '#FF9900',
  pattern: /sdk\.iad-\d+\.braze\.com|dev\.appboy\.com|sdk\.fra-\d+\.braze\.com|sdk\.braze\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    let eventName: string | undefined;
    try {
      const har = postBody as { text?: string } | undefined;
      if (har?.text) {
        const body = JSON.parse(har.text) as Record<string, unknown>;
        const events = body.events as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(events) && events.length > 0) {
          eventName = events[0].name as string | undefined;
        }
        if (!eventName) {
          eventName = (body.event_name ?? body.name) as string | undefined;
        }
      }
    } catch { /* ignore */ }
    return {
      'App ID': p.app_id,
      'Event': eventName ?? p.event_name ?? p.name,
      'User ID': p.external_user_id,
      'Session ID': p.session_id,
      'SDK Version': p.sdk_version,
    };
  },
} as const;
