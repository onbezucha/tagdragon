import type { Provider } from '@/types/provider';

export const doubleclick: Provider = {
  name: 'DoubleClick',
  color: '#7B2D8B',
  // Excludes Google Ads conversion URLs (handled by googleAds provider)
  pattern: /doubleclick\.net(?!.*\/pagead\/(viewthroughconversion|conversion))|ad\.doubleclick\.net/,
  
  parseParams(url: string): Record<string, string | undefined> {
    return { 'URL': url };
  },
} as const;
