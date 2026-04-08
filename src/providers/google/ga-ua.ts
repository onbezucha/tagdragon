import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const gaUA: Provider = {
  name: 'GA (UA)',
  color: '#F9AB00',
  pattern:
    /google-analytics\.com\/collect|google-analytics\.com\/r\/collect|google-analytics\.com\/j\/collect/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    return {
      'Hit type': p.t,
      'Tracking ID': p.tid,
      'Client ID': p.cid,
      Page: p.dp ?? p.dl,
      'Page title': p.dt,
      'Event category': p.ec,
      'Event action': p.ea,
      'Event label': p.el,
    };
  },
};
