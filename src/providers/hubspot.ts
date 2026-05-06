import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const hubspot: Provider = {
  name: 'HubSpot',
  color: '#FF7A59',
  pattern: /track\.hubspot\.com\/__ptq|forms\.hubspot\.com\/submissions/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      'Hub ID': p.a,
      Event: p.e,
      'Page URL': p.pageUrl,
      'Page Title': p.pageTitle,
      Campaign: p.hsa_cam,
      Source: p.hsa_src,
      'User Token': p.hutk,
      'Session Count': p.hssc,
      'Long-term Cookie': p.hstc,
    };
    result._eventName = p.e;
    return result;
  },
} as const;
