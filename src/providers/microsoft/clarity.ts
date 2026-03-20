import type { Provider } from '@/types/provider';
import { getParams } from '../url-parser';

export const microsoftClarity: Provider = {
  name: 'Microsoft Clarity',
  color: '#00BCF2',
  // Microsoft Clarity beacon endpoint
  pattern: /clarity\.ms\/collect/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    return {
      'Project ID': p['pid'] ?? p['project'],
      'Version': p['v'],
      'URL': url,
    };
  },
} as const;
