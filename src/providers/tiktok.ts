import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

interface HARPostBody { text?: string; raw?: Array<{ bytes?: string }>; }

function parseHARJson(postRaw: unknown): Record<string, unknown> {
  try {
    const har = postRaw as HARPostBody;
    const text = har?.text ?? (har?.raw?.[0]?.bytes ? atob(har.raw[0].bytes) : '');
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch { return {}; }
}

export const tiktokPixel: Provider = {
  name: 'TikTok Pixel',
  color: '#FE2C55',
  // TikTok Pixel Events API
  pattern: /analytics\.tiktok\.com\/api\/v\d+/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const body = parseHARJson(postRaw);

    const props = (body['properties'] as Record<string, unknown>) ?? {};
    const ctx = (body['context'] as Record<string, unknown>) ?? {};
    const ctxUser = (ctx['user'] as Record<string, unknown>) ?? {};
    const ctxPage = (ctx['page'] as Record<string, unknown>) ?? {};

    const str = (v: unknown): string | undefined => v != null ? String(v) : undefined;

    return {
      // Event
      'Event': str(body['event']) ?? p['event'],
      'Timestamp': str(body['timestamp']),
      // Pixel Info
      'Pixel Code': str(body['pixel_code']) ?? p['pixel_code'],
      // Page
      'URL': str(props['url']) ?? str(ctxPage['url']) ?? p['url'],
      'Referrer': str(ctxPage['referrer']) || undefined,
      // Ecommerce
      'Value': str(props['value']) ?? p['value'],
      'Currency': str(props['currency']) ?? p['currency'],
      'Content ID': str(props['content_id']),
      'Content Type': str(props['content_type']),
      'Content Name': str(props['content_name']),
      'Order ID': str(props['order_id']),
      'Search Query': str(props['search_string']),
      // User
      'Click ID': str(ctxUser['ttclid']),
      'User ID': str(ctxUser['external_id']),
      'Locale': str(ctxUser['locale']),
    };
  },
} as const;
