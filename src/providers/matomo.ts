import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { titleCase } from './parse-helpers';

export const matomo: Provider = {
  name: 'Matomo',
  color: '#3152A0',
  // Matomo (formerly Piwik) tracking pixel — matches both hosted and cloud instances
  pattern: /\/(piwik|matomo)\.php(\?|$)/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);

    const result: Record<string, string | undefined> = {
      'Site ID': p['idsite'],
      Action: p['action_name'],
      'Page URL': p['url'],
      'Event Category': p['e_c'],
      'Event Action': p['e_a'],
      'Event Name': p['e_n'],
      Revenue: p['revenue'],
      'User ID': p['uid'],
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

    result._eventName = p['action_name'];

    return result;
  },
} as const;
