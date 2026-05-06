import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

// Known Tealium prefix/key → display label mappings
const TEALIUM_PREFIX_MAP: Record<string, string> = {
  tealium_event: 'Event',
  tealium_account: 'Account',
  tealium_profile: 'Profile',
  tealium_visitor_id: 'Visitor ID',
  'cp.URL': 'Page URL',
  'cp.referrer': 'Referrer',
  'cp.title': 'Page Title',
  'ut.source': 'Campaign Source',
  'ut.medium': 'Campaign Medium',
  'ut.campaign': 'Campaign Name',
  'ut.term': 'Campaign Term',
  'ut.content': 'Campaign Content',
  'meta.URL': 'Meta URL',
  'meta.referrer': 'Meta Referrer',
  'js_page.URL': 'JS Page URL',
};

// Internal Tealium system params to skip
const SKIP_KEYS = new Set([
  'tealium_library_name',
  'tealium_random',
  'tealium_session_id',
  'tealium_timestamp',
  'tealium_datasource',
  'teaConnectionType',
  'data_source',
  'post_time',
]);

export const tealium: Provider = {
  name: 'Tealium',
  color: '#00B5AD',
  pattern: /tags\.tiqcdn\.com|collect\.tealiumiq\.com|datacloud\.tealiumiq\.com/,
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(p)) {
      if (SKIP_KEYS.has(key)) continue;
      if (value === undefined || value === '') continue;

      const label = TEALIUM_PREFIX_MAP[key];
      if (label) {
        result[label] = value;
      } else {
        // Pass-through preserving original key
        result[key] = value;
      }
    }

    result._eventName = result['Event'];

    return result;
  },
} as const;
