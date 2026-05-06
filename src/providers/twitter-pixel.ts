import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const twitterPixel: Provider = {
  name: 'X (Twitter) Pixel',
  color: '#000000',
  pattern: /analytics\.twitter\.com\/i\/adsct|t\.co\/i\/adsct/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    // Parse events from URL-encoded JSON array: [["pageview",{}]]
    let eventType = '';
    try {
      const events = JSON.parse(p['events'] || '[]');
      if (Array.isArray(events[0])) eventType = events[0][0] || '';
    } catch {}

    const result: Record<string, string | undefined> = {};

    const entries: [string, string | undefined][] = [
      // Event
      ['Event', eventType || p['events']],
      ['Event ID', p.event_id],
      // Pixel Info
      ['Pixel ID', p.p_id],
      ['Pixel Type', p.type],
      ['Pixel Version', p.version],
      ['Integration', p.integration],
      // Page
      ['Page URL', p.tw_document_href],
      ['Page Title', p.tw_document_title],
      ['Partner', p.pt],
      ['Partner User ID', p.p_user_id],
      // User
      ['User ID (twpid)', p.twpid],
      // Tracking
      ['Transaction ID', p.txn_id],
      ['Placement ID', p.pl_id],
      // Conversion
      ['Sale Amount', p.tw_sale_amount],
      ['Order Quantity', p.tw_order_quantity],
      ['Conversion ID', p.tw_conversion_id],
      // Technical
      ['iFrame Status', p.tw_iframe_status],
      ['Pixel Source', p.tw_pid_src],
      // Enhanced Match PII
      ['Email (hashed)', p.em],
      ['Phone (hashed)', p.ph],
      ['First Name (hashed)', p.fn],
      ['Last Name (hashed)', p.ln],
    ];

    for (const [key, val] of entries) {
      if (val !== undefined && val !== '') result[key] = val;
    }

    result._eventName = eventType;

    return result;
  },
} as const;
