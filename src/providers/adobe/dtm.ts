import type { Provider } from '../../types/provider';

export const adobeDTM: Provider = {
  name: 'Adobe DTM',
  color: '#FF0000',
  pattern: /assets\.adobedtm\.com\/[a-f0-9]+\/[a-f0-9]+\/satelliteLib/,

  parseParams(url: string): Record<string, string | undefined> {
    const m = url.match(/assets\.adobedtm\.com\/([a-f0-9]+)\/([a-f0-9]+)\/satelliteLib/);
    return {
      'Org ID (partial)': m?.[1],
      'Property hash': m?.[2],
      URL: url,
    };
  },
} as const;
