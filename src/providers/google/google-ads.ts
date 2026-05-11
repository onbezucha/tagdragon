import type { Provider } from '@/types/provider';
import { getParams } from '@/providers/url-parser';

export const googleAds: Provider = {
  name: 'Google Ads',
  color: '#4285F4',
  // Matches same endpoints as Omnibug — /pagead/conversion and /pagead/viewthroughconversion
  // Must be before DoubleClick provider (more specific pattern)
  pattern:
    /(googleads\.g\.doubleclick\.net|www\.googleadservices\.com)\/pagead\/(viewthroughconversion|conversion)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const conversionIdMatch = url.match(/\/(viewthroughconversion|conversion)\/(\d+)/);
    const conversionId = conversionIdMatch?.[2];
    const convType = conversionIdMatch?.[1];
    const conversionType = convType === 'viewthroughconversion' ? 'View-through' : 'Click-through';

    let eventName = p.en;

    // Parse e-commerce fields from the semicolon-delimited `data` parameter
    // Format: event=cart;ecomm_totalvalue=1190;ecomm_prodid=SKU1,SKU2;ecomm_pagetype=cart
    let ecommTotalvalue: string | undefined;
    let ecommProdid: string | undefined;
    let ecommPagetype: string | undefined;

    if (p.data) {
      const dataParts = p.data.split(';');
      for (const part of dataParts) {
        const eqIndex = part.indexOf('=');
        if (eqIndex === -1) continue;
        const key = part.substring(0, eqIndex);
        const value = part.substring(eqIndex + 1);
        switch (key) {
          case 'event':
            eventName = value;
            break;
          case 'ecomm_totalvalue':
            ecommTotalvalue = value;
            break;
          case 'ecomm_prodid':
            ecommProdid = value;
            break;
          case 'ecomm_pagetype':
            ecommPagetype = value;
            break;
        }
      }
    }

    const result: Record<string, string | undefined> = {
      'Conversion ID': conversionId,
      'Conversion Label': p.label,
      'Conversion Type': conversionType,
      Event: eventName,
      _eventName: eventName,
      'Conversion Value': p.value ?? ecommTotalvalue,
      Currency: p.currency_code ?? p.currency,
      'Transaction ID': p.order_id ?? p.transaction_id,
      'Page Title': p.tiba ? decodeURIComponent(p.tiba) : undefined,
      'Page URL': p.url ? decodeURIComponent(p.url) : undefined,
      Referrer: p.ref ? decodeURIComponent(p.ref) : undefined,
      'Google Click ID': p.gclid,
      wbraid: p.wbraid,
      gbraid: p.gbraid,
      'GTM Container': p.gtm,
      'Advertiser User ID': p.auid,
      'Consent State': p.gcs,
      'Consent Details': p.gcd,
      'Non-Personalized': p.npa,
      'DMA Compliance': p.dma,
      'DMA Consent': p.dma_cps,
      'Cookie Present': p.ct_cookie_present,
      'E-Commerce Value': ecommTotalvalue,
      'Product IDs': ecommProdid,
      'E-Commerce Type': ecommPagetype,
    };
    return result;
  },
} as const;
