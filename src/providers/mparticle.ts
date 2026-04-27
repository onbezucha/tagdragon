import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson, titleCase, formatJsonValue } from './parse-helpers';

export const mparticle: Provider = {
  name: 'mParticle',
  color: '#1E96DC',
  pattern: /nativesdks\.mparticle\.com\/v2|api\.mparticle\.com\/v2/,
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    const events = body.events as Array<Record<string, unknown>> | undefined;
    const firstEvent = events?.[0];
    const data = (firstEvent?.data as Record<string, unknown>) ?? {};
    const identities = body.user_identities as Record<string, unknown> | undefined;

    const result: Record<string, string | undefined> = {
      Event: str(data.event_name),
      'Event Type': str(firstEvent?.event_type),
      'User ID': str(identities?.customerid),
      Environment: str(body.environment),
      'API Key': p.key,
    };

    // Custom Attributes
    const customAttrs = data?.custom_attributes as Record<string, unknown> | undefined;
    if (customAttrs) {
      for (const [key, value] of Object.entries(customAttrs)) {
        result[titleCase(key)] = formatJsonValue(value);
      }
    }

    // User Attributes
    const userAttrs = body.user_attributes as Record<string, unknown> | undefined;
    if (userAttrs) {
      for (const [key, value] of Object.entries(userAttrs)) {
        result[`${titleCase(key)} (user)`] = formatJsonValue(value);
      }
    }

    // Product Action
    const productAction = data?.product_action as Record<string, unknown> | undefined;
    if (productAction) {
      result['Product Action'] = str(productAction.action);
      if (productAction.products) {
        result['Products'] = JSON.stringify(productAction.products, null, 2);
      }
    }

    // Device + App
    result['SDK Version'] = str(body.sdk);
    result['Batch ID'] = str(body.batch_id);

    return result;
  },
} as const;
