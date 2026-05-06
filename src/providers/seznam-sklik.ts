import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const seznamSklik: Provider = {
  name: 'Sklik',
  color: '#CC0000',
  pattern: /c\.seznam\.cz\/retargeting|h\.seznam\.cz(?!\/sid)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    let udid: string | undefined;
    if (p.ids) {
      try {
        const ids = JSON.parse(decodeURIComponent(p.ids));
        udid = ids.udid;
      } catch {
        /* ignore */
      }
    }

    const typeMatch = url.match(/seznam\.cz\/([^?]+)/);

    const result: Record<string, string | undefined> = {
      Type: typeMatch?.[1],
      ID: p.id,
      Value: p.value,
      'Page URL': p.url ? decodeURIComponent(p.url) : undefined,
      Consent: p.consent,
      'User ID': udid,
    };
    result._eventName = result['Type'];

    return result;
  },
} as const;
