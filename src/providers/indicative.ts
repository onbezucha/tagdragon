import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { titleCase, formatJsonValue } from './parse-helpers';

export const indicative: Provider = {
  name: 'Indicative',
  color: '#4A90D9',
  pattern: /api\.indicative\.com\/service\/event/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {};
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

        const props = body.properties as Record<string, unknown> | undefined;
        if (props) {
          for (const [key, value] of Object.entries(props)) {
            result[titleCase(key)] = formatJsonValue(value);
          }
        }
      }
    } catch {
      /* ignore */
    }
    result.Event = eventName;
    result['User ID'] = uniqueId;
    result['API Key'] = apiKey || p.apiKey;
    return result;
  },
} as const;
