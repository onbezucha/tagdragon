import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const medallia: Provider = {
  name: 'Medallia DXA',
  color: '#005EB8',
  pattern: /resources\.digital\.medallia\.com|d\.medallia\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      Event: p.event,
      'Session ID': p.sessionId,
      'Site ID': p.siteId,
    };
    result._eventName = p.event;
    return result;
  },
} as const;
