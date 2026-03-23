import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const adobeAAM: Provider = {
  name: 'Adobe AAM',
  color: '#FF0000',
  pattern: /dpm\.demdex\.net(?!\/id)/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'MID': p.d_mid,
      'Org ID': p.d_orgid,
      'Customer ID': p.d_cid,
      'Return Type': p.d_rtbd,
      'Blob': p.d_blob,
    };
  },
} as const;
