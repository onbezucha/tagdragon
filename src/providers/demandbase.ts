import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const demandbase: Provider = {
  name: 'Demandbase',
  color: '#1E88E5',
  pattern: /tag\.demandbase\.com|api\.demandbase\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Company ID': p.company_id,
      'Company': p.company_name,
      'Key': p.key,
      'Page Type': p.page_type,
    };
  },
} as const;
