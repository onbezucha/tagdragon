import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson, formatJsonValue, titleCase } from './parse-helpers';

export const tiktokPixel: Provider = {
  name: 'TikTok Pixel',
  color: '#FE2C55',
  // TikTok Pixel Events API
  pattern: /analytics\.tiktok\.com\/api\/v\d+/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const body = parsePostBodyJson(postRaw);

    const props = (body['properties'] as Record<string, unknown>) ?? {};
    const ctx = (body['context'] as Record<string, unknown>) ?? {};
    const ctxUser = (ctx['user'] as Record<string, unknown>) ?? {};
    const ctxPage = (ctx['page'] as Record<string, unknown>) ?? {};

    const str = (v: unknown): string | undefined => (v != null ? String(v) : undefined);

    const result: Record<string, string | undefined> = {
      // Event
      Event: str(body['event']) ?? str(p['event']),
      Timestamp: str(body['timestamp']),
      // Pixel Info
      'Pixel Code': str(body['pixel_code']) ?? str(p['pixel_code']),
      // Page
      URL: str(props['url']) ?? str(ctxPage['url']) ?? str(p['url']),
      Referrer: str(ctxPage['referrer']) || undefined,
      // Ecommerce
      Value: str(props['value']) ?? str(p['value']),
      Currency: str(props['currency']) ?? str(p['currency']),
      'Content ID': str(props['content_id']),
      'Content Type': str(props['content_type']),
      'Content Name': str(props['content_name']),
      'Order ID': str(props['order_id']),
      'Search Query': str(props['search_string']),
      // User
      'Click ID': str(ctxUser['ttclid']),
      'User ID': str(ctxUser['external_id']),
      'TT Cookie ID': str(ctxUser.ttp),
      Locale: str(ctxUser['locale']),
    };

    // Pass-through of extra properties
    const skipProps = new Set([
      'url',
      'value',
      'currency',
      'content_id',
      'content_type',
      'content_name',
      'order_id',
      'search_string',
    ]);
    for (const [key, value] of Object.entries(props)) {
      if (!skipProps.has(key)) {
        result[titleCase(key)] = formatJsonValue(value);
      }
    }

    result._eventName = str(body['event']) ?? str(p['event']);

    return result;
  },
} as const;
