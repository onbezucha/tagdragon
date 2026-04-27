import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const adobeECID: Provider = {
  name: 'Adobe ECID',
  color: '#FF0000',
  pattern: /demdex\.net\/id\?/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      MID: p.d_mid,
      'Org ID': p.d_orgid,
      Version: p.d_ver,
      Response: p.d_rtbd,
      Blob: p.d_blob,
      'Device Co-op': p.dpv,
      Platform: p.d_ptype,
      Region: p.dcs_region,
    };
  },
} as const;
