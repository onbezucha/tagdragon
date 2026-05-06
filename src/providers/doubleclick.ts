import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

/**
 * Parse semicolon-delimited parameters from DoubleClick Floodlight URLs.
 * These params appear in the path like: /activity;src=ADV123;type=conv;cat=purchase
 * Semicolons take precedence over query string params.
 */
function parseSemicolonParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Extract path portion after /activity
  const activityMatch = url.match(/doubleclick\.net\/activity;?([^?]*)/i);
  if (!activityMatch || !activityMatch[1]) {
    return result;
  }

  const pathSegment = activityMatch[1];
  const segments = pathSegment.split(';');

  for (const segment of segments) {
    const eqIndex = segment.indexOf('=');
    if (eqIndex > 0) {
      const key = segment.substring(0, eqIndex);
      const value = segment.substring(eqIndex + 1);
      if (key && value) {
        result[key] = value;
      }
    }
  }

  return result;
}

export const doubleclick: Provider = {
  name: 'DoubleClick',
  color: '#7B2D8B',
  // Matches Floodlight tracking requests (/activity;src=...;type=...;cat=...)
  pattern: /doubleclick\.net\/activity\b/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    // Parse semicolon-delimited params from path (takes precedence)
    const pathParams = parseSemicolonParams(url);
    Object.assign(p, pathParams);

    const result: Record<string, string | undefined> = {
      'Advertiser ID': p.src,
      'Activity Type': p.type,
      Activity: p.cat,
      'Click ID': p.dc_rdid || p.gclid,
      'Order ID': p.ord !== undefined && !/^\d{8,}$/.test(p.ord) ? p.ord : undefined,
      // Include raw param keys for completeness
      qty: p.qty,
      cost: p.cost,
      tran: p.tran,
      tag: p.tag,
      // Also include mapped display names
      Quantity: p.qty,
      Revenue: p.cost,
      Transaction: p.tran,
      Tag: p.tag,
    };

    for (const [key, value] of Object.entries(p)) {
      if (/^u\d+$/.test(key) && value) {
        result[`Custom: ${key}`] = value;
      }
    }

    result._eventName = p.cat;

    return result;
  },
} as const;
