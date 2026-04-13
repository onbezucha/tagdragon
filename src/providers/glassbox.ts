import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const glassbox: Provider = {
  name: 'Glassbox',
  color: '#00A3E0',
  pattern: /glassbox\.com\/(record|collector|api|data|gb)\b|gbtr\.glassbox\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Session ID': p.sessionId,
      'Customer ID': p.customerId,
      'Page URL': p.pageUrl,
    };
  },
} as const;
