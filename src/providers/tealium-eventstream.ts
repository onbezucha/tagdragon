import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const tealiumEventstream: Provider = {
  name: 'Tealium EventStream',
  color: '#00B5E2',
  pattern: /collect\.tealiumiq\.com\/event|data\.cloud\.tealium\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.tealium_event,
      'Visitor ID': p.tealium_visitor_id,
      Account: p.tealium_account,
      Profile: p.tealium_profile,
    };
    const knownKeys = new Set([
      'tealium_event',
      'tealium_visitor_id',
      'tealium_account',
      'tealium_profile',
    ]);
    for (const [key, value] of Object.entries(p)) {
      if (!knownKeys.has(key) && value) {
        result[key] = value;
      }
    }
    return result;
  },
} as const;
