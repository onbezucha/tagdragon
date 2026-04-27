import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const pinterestPixel: Provider = {
  name: 'Pinterest Pixel',
  color: '#E60023',
  // Matches both /v3/ (init) and /user/ (event) endpoints
  pattern: /ct\.pinterest\.com\/(v3|user)\//,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    // 'ed' — event data JSON (may contain value/currency for purchase events)
    let edValue: string | undefined;
    let edCurrency: string | undefined;
    let edOrderId: string | undefined;
    let edSearchQuery: string | undefined;
    let edLeadType: string | undefined;
    if (p['ed']) {
      try {
        const ed = JSON.parse(p['ed']) as Record<string, unknown>;
        edValue = ed['value'] != null ? String(ed['value']) : undefined;
        edCurrency = ed['currency'] != null ? String(ed['currency']) : undefined;
        edOrderId = ed['order_id'] != null ? String(ed['order_id']) : undefined;
        edSearchQuery = ed['search_query'] != null ? String(ed['search_query']) : undefined;
        edLeadType = ed['lead_type'] != null ? String(ed['lead_type']) : undefined;
      } catch {
        /* ignore */
      }
    }

    // 'pd' — page/pixel data JSON (np, gtm_version)
    let np: string | undefined;
    let gtmVersion: string | undefined;
    if (p['pd']) {
      try {
        const pd = JSON.parse(p['pd']) as Record<string, unknown>;
        np = pd['np'] != null ? String(pd['np']) : undefined;
        gtmVersion = pd['gtm_version'] != null ? String(pd['gtm_version']) : undefined;
      } catch {
        /* ignore */
      }
    }

    // 'ad' — additional data JSON (page URL, device info)
    let loc: string | undefined;
    let ref: string | undefined;
    let screenRes: string | undefined;
    let platform: string | undefined;
    let isEu: string | undefined;
    if (p['ad']) {
      try {
        const ad = JSON.parse(p['ad']) as Record<string, unknown>;
        loc = ad['loc'] != null ? String(ad['loc']) : undefined;
        ref = ad['ref'] ? String(ad['ref']) : undefined;
        const sw = ad['sw'] != null ? String(ad['sw']) : undefined;
        const sh = ad['sh'] != null ? String(ad['sh']) : undefined;
        if (sw && sh) screenRes = `${sw}x${sh}`;
        platform = ad['platform'] != null ? String(ad['platform']) : undefined;
        isEu = ad['is_eu'] != null ? String(ad['is_eu']) : undefined;
      } catch {
        /* ignore */
      }
    }

    // 'dep' — dedup info: "2,PAGE_LOAD" → extract label
    const depType = p['dep']?.split(',')?.[1] || undefined;

    return {
      // Event
      Event: p['event'],
      'Event Type': depType,
      // Pixel Info
      'Tag ID': p['tid'],
      'Network Provider': np,
      'GTM Version': gtmVersion,
      // Page
      'Page URL': loc,
      Referrer: ref,
      // Ecommerce
      Value: edValue,
      Currency: edCurrency,
      'Order ID': edOrderId,
      'Search Query': edSearchQuery,
      'Lead Type': edLeadType,
      // Device
      'Screen Resolution': screenRes,
      Platform: platform,
      'Is EU': isEu,
      // Technical
      Timestamp: p['cb'],
    };
  },
} as const;
