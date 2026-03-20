import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const googleAds: Provider = {
  name: 'Google Ads',
  color: '#4285F4',
  // Google Ads conversion tracking via doubleclick — must be before DV360
  pattern: /googleads\.g\.doubleclick\.net\/pagead\/(viewthroughconversion|conversion)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const conversionIdMatch = url.match(/\/(viewthroughconversion|conversion)\/(\d+)/);
    const conversionId = conversionIdMatch?.[2];
    const conversionType = conversionIdMatch?.[1] === 'viewthroughconversion' ? 'View-through' : 'Click-through';

    let eventName = p.en;
    if (p.data) {
      const dataMatch = p.data.match(/event=([^&]+)/);
      if (dataMatch) eventName = dataMatch[1];
    }

    return {
      'Conversion ID':    conversionId,
      'Conversion Label': p.label,
      'Conversion Type':  conversionType,
      'Event':            eventName,
      'Conversion Value': p.value,
      'Currency':         p.currency_code ?? p.currency,
      'Transaction ID':   p.order_id ?? p.transaction_id,
      'Page Title':       p.tiba ? decodeURIComponent(p.tiba) : undefined,
      'Page URL':         p.url ? decodeURIComponent(p.url) : undefined,
      'Referrer':         p.ref ? decodeURIComponent(p.ref) : undefined,
      'Google Click ID':  p.gclid,
      'GTM Container':    p.gtm,
      'Consent State':    p.gcs,
      'Consent Details':  p.gcd,
      'Non-Personalized': p.npa,
      'Random':           p.random,
      'URL':              url,
    };
  },
};
