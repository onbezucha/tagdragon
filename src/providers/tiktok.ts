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

    // TikTok payload: {pixel_code, event, properties: {url, value, currency, ...}}
    const props = (body['properties'] as Record<string, unknown>) ?? {};

    return {
      'Event': body['event'] != null ? String(body['event']) : p['event'],
      'Pixel Code': body['pixel_code'] != null ? String(body['pixel_code']) : p['pixel_code'],
      'URL': props['url'] != null ? String(props['url']) : (p['url'] ?? url),
      'Value': props['value'] != null ? String(props['value']) : p['value'],
      'Currency': props['currency'] != null ? String(props['currency']) : p['currency'],
    };
  },
} as const;
