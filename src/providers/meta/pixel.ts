import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const metaPixel: Provider = {
  name: 'Meta Pixel',
  color: '#1877F2',
  pattern: /facebook\.com\/tr[/?]/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const plt = p.plt ? `${Math.round(parseFloat(p.plt))}ms` : undefined;
    return {
      // Event
      'Event': p.ev,
      'Action': p.a,
      // Pixel Info
      'Pixel ID': p.id,
      'Pixel Version': p.v,
      // Page
      'URL': p.dl,
      'Referrer': p.rl || undefined,
      // Ecommerce
      'Value': p['cd[value]'],
      'Currency': p['cd[currency]'],
      'Content IDs': p['cd[content_ids]'],
      'Content Type': p['cd[content_type]'],
      'Content Category': p['cd[content_category]'],
      // Tracking
      'FBP': p.fbp,
      'Event ID': p.eid,
      // Technical
      'Timestamp': p.ts,
      'Page Load Time': plt,
      'In iFrame': p.if,
      'Consent Data Layer': p.cdl,
      'Consent Flag': p.cf,
    };
  },
} as const;
