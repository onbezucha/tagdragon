import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const metaPixel: Provider = {
  name: 'Meta Pixel',
  color: '#1877F2',
  pattern: /facebook\.com\/tr[/?]/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const plt = p.plt ? `${Math.round(parseFloat(p.plt))}ms` : undefined;

    // Screen resolution: combine sw + sh → "3440 × 1440"
    const screenRes = p.sw && p.sh ? `${p.sw} × ${p.sh}` : undefined;

    // Contents: try to pretty-print JSON array
    let contentsDisplay: string | undefined;
    if (p['cd[contents]']) {
      try {
        const parsed = JSON.parse(p['cd[contents]']);
        contentsDisplay = JSON.stringify(parsed, null, 2);
      } catch {
        contentsDisplay = p['cd[contents]'];
      }
    }

    // Experiment flags: collect all expv2[*]
    const experiments: string[] = [];
    for (const [k, v] of Object.entries(p)) {
      if (k.startsWith('expv2[')) experiments.push(v);
    }

    const result: Record<string, string | undefined> = {
      // Event
      Event: p.ev,
      Action: p.a,
      'Event ID': p.eid,
      'Event Count': p.ec,
      // Pixel Info
      'Pixel ID': p.id,
      'Pixel Version': p.v,
      // Page
      'Page URL': p.dl,
      Referrer: p.rl || undefined,
      // Ecommerce
      Value: p['cd[value]'],
      Currency: p['cd[currency]'],
      'Content IDs': p['cd[content_ids]'],
      'Content Name': p['cd[content_name]'],
      'Content Type': p['cd[content_type]'],
      'Content Category': p['cd[content_category]'],
      'Num Items': p['cd[num_items]'],
      Contents: contentsDisplay,
      // Tracking
      FBP: p.fbp,
      FBC: p.fbc,
      // Device
      'Screen Resolution': screenRes,
      // Technical
      Timestamp: p.ts,
      'Page Load Time': plt,
      'Init Time': p.it ? new Date(parseInt(p.it, 10)).toISOString() : undefined,
      'Consent Data Layer': p.cdl,
      'Consent Flag': p.cf,
      Experiments: experiments.length > 0 ? experiments.join(', ') : undefined,
    };

    // Pass-through of custom cd[*] params not in whitelist
    const knownCd = new Set([
      'cd[value]',
      'cd[currency]',
      'cd[content_ids]',
      'cd[content_name]',
      'cd[content_type]',
      'cd[content_category]',
      'cd[num_items]',
      'cd[contents]',
      'cd[predicted_ltv]',
      'cd[delivery_category]',
    ]);

    for (const [key, value] of Object.entries(p)) {
      if (key.startsWith('cd[') && !knownCd.has(key) && value) {
        result[key.slice(3, -1)] = value;
      }
    }

    return result;
  },
} as const;
