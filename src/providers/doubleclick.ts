import type { Provider } from '@/types/provider';

export const doubleclick: Provider = {
  name: 'DV360',
  color: '#7B2D8B',
  pattern: /doubleclick\.net|ad\.doubleclick\.net|googleads\.g\.doubleclick\.net/,
  
  parseParams(url: string): Record<string, string | undefined> {
    return { 'URL': url };
  },
} as const;
