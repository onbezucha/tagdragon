import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const ga4: Provider = {
  name: 'GA4',
  color: '#E8710A',
  // Matches standard GA4, analytics.google.com, and server-side GTM custom domains (v=2 = GA4 Measurement Protocol)
  pattern: /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|\/g\/collect\?v=2(?:&|$)/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    
    return {
      'Event': p.en,
      'Client ID': p.cid,
      'User ID': p.uid,
      'Measurement ID': p.tid,
      'Page': p.dl ?? p.dp,
      'Page title': p.dt,
      'Referrer': p.dr,
      'Session ID': p.sid,
      'Engagement': p._et ? `${p._et}ms` : undefined,
    };
  },
};
