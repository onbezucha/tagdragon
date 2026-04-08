import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const tealiumEventstream: Provider = {
  name: 'Tealium EventStream',
  color: '#00B5E2',
  pattern: /collect\.tealiumiq\.com\/event|data\.cloud\.tealium\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.tealium_event,
      'Visitor ID': p.tealium_visitor_id,
      Account: p.tealium_account,
      Profile: p.tealium_profile,
    };
  },
} as const;
