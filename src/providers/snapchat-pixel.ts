import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson } from './parse-helpers';

export const snapchatPixel: Provider = {
  name: 'Snapchat Pixel',
  color: '#FFFC00',
  pattern: /tr\.snapchat\.com|snapkit\.com\/v1\/advertising/,
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    return {
      // Core
      Event: str(body.event_type) ?? p.event_type,
      'Pixel ID': str(body.pixel_id) ?? p.pixel_id,

      // Page
      'Page URL': str(body.page_url) ?? p.page_url,
      'Page Title': str(body.page_title),

      // E-commerce
      Value: str(body.value) ?? p.value,
      Currency: str(body.currency) ?? p.currency,
      'Transaction ID': str(body.transaction_id),
      'Item IDs': body.item_ids ? JSON.stringify(body.item_ids) : undefined,
      'Item Category': str(body.item_category),
      'Number Items': str(body.number_items),
      Price: str(body.price) ?? p.price,

      // User Matching
      'Email (SHA256)': str(body.user_email_sha256) ?? p.user_email,
      'Phone (SHA256)': str(body.user_phone_sha256),

      // Campaign
      'UTM Source': str(body.utm_source),
      'UTM Medium': str(body.utm_medium),
      'UTM Campaign': str(body.utm_campaign),
    };
  },
} as const;
