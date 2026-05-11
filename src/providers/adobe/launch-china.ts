import type { Provider } from '@/types/provider';

export const adobeLaunchChina: Provider = {
  name: 'Adobe Launch (CN)',
  color: '#FF0000',
  pattern: /assets\.adobedc\.cn/,

  parseParams(url: string): Record<string, string | undefined> {
    const envMatch = url.match(/launch-EN([a-f0-9]+)(?:-(development|staging))?\.min\.js/);
    return {
      Type: 'Adobe Tags (CN)',
      Environment: envMatch?.[2]
        ? envMatch[2].charAt(0).toUpperCase() + envMatch[2].slice(1)
        : 'Production',
      'Library ID': envMatch?.[1],
    };
  },
} as const;
