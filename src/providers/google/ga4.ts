import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const ga4: Provider = {
  name: 'GA4',
  color: '#E8710A',
  pattern: /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    
    return {
      'Event': p.en,
      'Client ID': p.cid,
      'Measurement ID': p.tid,
      'Page': p.dl ?? p.dp,
      'Page title': p.dt,
      'Session ID': p.sid,
      'Engagement': p._et ? `${p._et}ms` : undefined,
    };
  },
};
