import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const gtm: Provider = {
  name: 'GTM',
  color: '#4285F4',
  pattern: /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/gtag\/js|googletagmanager\.com\/a\?/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    
    return {
      'Container ID': p.id,
      'URL': url,
    };
  },
};
