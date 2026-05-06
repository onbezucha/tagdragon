import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const ga4: Provider = {
  name: 'GA4',
  color: '#E8710A',
  // Matches standard GA4, analytics.google.com, and server-side GTM custom domains (v=2 = GA4 Measurement Protocol)
  pattern:
    /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|\/g\/collect\?v=2(?:&|$)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const decoded: Record<string, string | undefined> = {
      // Hit Info
      Event: p.en,
      _eventName: p.en,
      'Session ID': p.sid,
      'Session Count': p.sct,
      'Session Engaged': p.seg,
      'Hit Sequence': p._s,
      Engagement: p._et && Number(p._et) > 0 ? `${p._et}ms` : undefined,
      // User & Session
      'Client ID': p.cid,
      'User ID': p.uid,
      ECID: p.ecid,
      // Page & Content
      Page: p.dl ?? p.dp,
      'Page title': p.dt,
      Referrer: p.dr,
      // Measurement
      'Measurement ID': p.tid,
      'GTM Version': p.gtm,
      // Consent & Privacy
      'Consent State': p.gcs,
      'Consent Defaults': p.gcd,
      'Non-personalized Ads': p.npa,
      'DMA Compliance': p.dma,
      'DMA Consent': p.dma_cps,
      // Ecommerce
      Currency: p.cu,
      // Device & Browser
      'Screen Resolution': p.sr,
      'User Language': p.ul,
    };

    // Dynamic parameters — forwarded with prefix intact so categorizer prefixMatch works
    for (const [key, value] of Object.entries(p)) {
      // Event parameters: ep.item_name, epn.value, etc.
      if ((key.startsWith('ep.') && key.length > 3) || (key.startsWith('epn.') && key.length > 4)) {
        decoded[key] = value;
      }
      // User properties: up.*, upn.*
      else if (
        (key.startsWith('up.') && key.length > 3) ||
        (key.startsWith('upn.') && key.length > 4)
      ) {
        decoded[key] = value;
      }
      // Product-scoped: pr1, pr1id, pr1nm, etc.
      else if (key.length > 2 && /^pr\w/.test(key)) {
        decoded[key] = value;
      }
    }

    // Campaign attribution IDs
    if (p.gclid) decoded['gclid'] = p.gclid;
    if (p.dclid) decoded['dclid'] = p.dclid;
    if (p.gbraid) decoded['gbraid'] = p.gbraid;
    if (p.wbraid) decoded['wbraid'] = p.wbraid;
    if (p.srsltid) decoded['srsltid'] = p.srsltid;

    // Debug
    if (p._dbg) decoded['_dbg'] = p._dbg;
    if (p.fid) decoded['fid'] = p.fid;

    return decoded;
  },
};
