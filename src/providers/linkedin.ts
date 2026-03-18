import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const linkedin: Provider = {
  name: 'LinkedIn',
  color: '#0A66C2',
  pattern: /linkedin\.com\/li\/track|snap\.licdn\.com/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Partner ID': p.pid,
      'Conversion': p.conversionId,
      'URL': url,
    };
  },
} as const;
