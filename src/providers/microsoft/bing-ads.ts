import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const bingAds: Provider = {
  name: 'Bing Ads',
  color: '#008373',
  pattern: /bat\.bing\.com\/action\/0/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      // Event
      Event: p.evt,
      // Tag Info
      'Tag ID': p.ti,
      'Tag Manager': p.tm,
      'UET Version': p.Ver,
      // Page
      'Page URL': p.p,
      'Page Title': p.tl,
      Referrer: p.r || undefined,
      // Session & Identity
      'Machine ID': p.mid,
      'Session ID': p.sid,
      'Visit ID': p.vid,
      'Click ID': p.msclkid && p.msclkid !== 'N' ? p.msclkid : undefined,
      // Device
      'Screen Resolution': p.sw && p.sh ? `${p.sw}x${p.sh}` : undefined,
      // Custom Events
      'Event Category': p.ec,
      'Event Action': p.ea,
      'Event Label': p.el,
      'Event Value': p.ev,
      'Goal Value': p.gv,
      'Goal Currency': p.gc,
      Revenue: p.revenue,
      // Technical
      'Load Time': p.lt ? `${p.lt}ms` : undefined,
      Consent: p.cdb,
    };
  },
} as const;
