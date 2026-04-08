import type { Provider } from '@/types/provider';

export const piwikProTm: Provider = {
  name: 'Piwik PRO TM',
  color: '#2C3E50',
  pattern: /[a-z0-9-]+\.piwik\.pro\/[a-z0-9-]+\/[a-z0-9]+\.js/,

  parseParams(url: string): Record<string, string | undefined> {
    return {
      URL: url,
    };
  },
} as const;
