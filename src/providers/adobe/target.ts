import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const adobeTarget: Provider = {
  name: 'Adobe Target',
  color: '#FF0000',
  pattern: /tt\.omtrdc\.net/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      Mbox: p.mbox,
      'Session ID': p.sessionId,
      'TNT ID': p.tntId,
      MCID: p.marketingCloudVisitorId,
      Host: p.mboxHost,
      'Page URL': p.mboxURL,
    };
  },
} as const;
