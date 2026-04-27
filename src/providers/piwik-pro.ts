import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { titleCase } from './parse-helpers';

export const piwikPro: Provider = {
  name: 'Piwik PRO',
  color: '#2C3E50',
  pattern: /piwik\.pro\/ppms\.php|\.piwik\.pro\/ppms\.php/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const result: Record<string, string | undefined> = {
      'Site ID': p.idsite,
      Action: p.action_name,
      'Page URL': p.url,
      'Event Category': p.e_c,
      'Event Action': p.e_a,
      'Event Name': p.e_n,
      'User ID': p.uid,
      Revenue: p.revenue,
      // Ecommerce
      'Order ID': p.ec_id,
      Items: p.ec_items
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(p.ec_items), null, 2);
            } catch {
              return p.ec_items;
            }
          })()
        : undefined,
      'Goal ID': p.idgoal,
      Subtotal: p.ec_st,
      Tax: p.ec_tx,
      Shipping: p.ec_sh,
      Discount: p.ec_dt,
      'Campaign Name': p._rcn,
      'Campaign Keyword': p._rck,
      'Search Category': p.search_cat,
      'Search Count': p.search_count,
    };

    // Dimension pass-through
    for (const [key, value] of Object.entries(p)) {
      if (/^dimension\d+$/.test(key) && value) {
        result[titleCase(key)] = value;
      }
    }

    return result;
  },
} as const;
