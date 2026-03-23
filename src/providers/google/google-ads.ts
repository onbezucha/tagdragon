import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const googleAds: Provider = {
  name: 'Google Ads',
  color: '#4285F4',
  // Matches same endpoints as Omnibug — /pagead/conversion and /pagead/viewthroughconversion
  // Must be before DoubleClick provider (more specific pattern)
  pattern: /(googleads\.g\.doubleclick\.net|www\.googleadservices\.com)\/pagead\/(viewthroughconversion|conversion)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const conversionIdMatch = url.match(/\/(viewthroughconversion|conversion)\/(\d+)/);
    const conversionId = conversionIdMatch?.[2];
    const convType = conversionIdMatch?.[1];
    const conversionType = convType === 'viewthroughconversion' ? 'View-through' : 'Click-through';

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
      'wbraid':           p.wbraid,
      'gbraid':           p.gbraid,
      'GTM Container':    p.gtm,
      'Consent State':    p.gcs,
      'Consent Details':  p.gcd,
      'Non-Personalized': p.npa,
      'DMA Compliance':   p.dma,
      'DMA Consent':      p.dma_cps,
      'Cookie Present':   p.ct_cookie_present,
    };
  },
};
