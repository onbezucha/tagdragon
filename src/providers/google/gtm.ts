import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const gtm: Provider = {
  name: 'GTM',
  color: '#4285F4',
  // gtag/js allowed only for id=GTM- (GA4 id=G- and Google Ads id=AW- are excluded)
  pattern:
    /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/gtag\/js(?=.*id=GTM-)|googletagmanager\.com\/a\?/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    return {
      'Container ID': p.id,
      'Preview Auth': p.gtm_auth,
      'Preview Env': p.gtm_preview,
      'Preview Cookies': p.gtm_cookies_win,
    };
  },
};
