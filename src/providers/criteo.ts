import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson } from './parse-helpers';

export const criteo: Provider = {
  name: 'Criteo',
  color: '#F5821F',
  pattern: /dis\.criteo\.com|sslwidget\.criteo\.com|static\.criteo\.net/,
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    const result: Record<string, string | undefined> = {
      Account: p.a ?? str(body.a),
      Event: p.e ?? str(body.e),
    };

    // E-commerce
    if (p.item) result['Product IDs'] = p.item;
    if (p.price) result['Price'] = p.price;
    if (p.id) result['Transaction ID'] = p.id;
    if (p.quantity) result['Quantity'] = p.quantity;
    if (p.zip) result['Zip Code'] = p.zip;

    // JSON body data
    if (body?.customer_email) result['Email (hashed)'] = str(body.customer_email);

    // dp params pass-through
    for (const [key, value] of Object.entries(p)) {
      if (key.startsWith('dp.') && value) {
        result[key] = value;
      }
    }

    return result;
  },
} as const;
