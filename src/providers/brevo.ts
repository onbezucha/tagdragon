import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const brevo: Provider = {
  name: 'Brevo',
  color: '#0066FF',
  pattern: /in-automate\.brevo\.com\/p|in-automate\.sendinblue\.com\/p/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Event: p.event,
      'Contact ID': p.id,
      Email: p.m,
    };
  },
} as const;
