import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const linkedin: Provider = {
  name: 'LinkedIn',
  color: '#0A66C2',
  // linkedin.com/li/track — Insight Tag beacon (all implementations)
  // px.ads.linkedin.com  — newer Insight Tag / Conversions API endpoint
  pattern: /linkedin\.com\/li\/track|px\.ads\.linkedin\.com/,
  
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Partner ID': p.pid,
      'Conversion': p.conversionId,
      'URL': url,
    };
  },
} as const;
