import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson, titleCase, formatJsonValue } from './parse-helpers';

export const indicative: Provider = {
  name: 'Indicative',
  color: '#4A90D9',
  pattern: /api\.indicative\.com\/service\/event/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {};
    const body = parsePostBodyJson(postBody);
    const eventName: string | undefined = body.eventName as string | undefined;
    const uniqueId: string | undefined = body.uniqueId as string | undefined;
    const apiKey: string | undefined = body.apiKey as string | undefined;

    const props = body.properties as Record<string, unknown> | undefined;
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        result[titleCase(key)] = formatJsonValue(value);
      }
    }
    result.Event = eventName;
    result['User ID'] = uniqueId;
    result['API Key'] = apiKey || p.apiKey;

    result._eventName = eventName;

    return result;
  },
} as const;
