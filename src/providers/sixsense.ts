import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const sixsense: Provider = {
  name: '6Sense',
  color: '#6C63FF',
  pattern: /j\.6sc\.co|b\.6sc\.co/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Company ID': p.company_id,
      Domain: p.domain,
      Token: p.token,
      IP: p.ipaddr,
    };
  },
} as const;
