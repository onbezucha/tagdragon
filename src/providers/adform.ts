import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const adform: Provider = {
  name: 'Adform',
  color: '#FF6600',
  pattern: /track\.adform\.net|a1\.adform\.net/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    // ADFtpmode labels
    const modeLabels: Record<string, string> = {
      '1': '1 — Page view',
      '2': '2 — Conversion',
      '4': '4 — iFrame / consent',
    };
    const mode = p.ADFtpmode;
    const modeLabel = mode ? (modeLabels[mode] ?? mode) : undefined;

    return {
      'Tracking ID': p.pm,
      'Page Name': p.ADFPageName ? decodeURIComponent(p.ADFPageName) : undefined,
      'Tracking Mode': modeLabel,
      'Order ID': p.orderid,
      'Conversion Value': p.cost ?? p.sales,
      'Banner ID': p.bn,
      'Page URL': p.loc ? decodeURIComponent(p.loc) : undefined,
      Referrer: p.CPref ? decodeURIComponent(p.CPref) : undefined,
      'Custom Var 1': p.sv1,
      'Custom Var 2': p.sv2,
      'Custom Var 3': p.sv3,
      'Custom Var 4': p.sv4,
      'Custom Var 5': p.sv5,
      GDPR: p.gdpr,
      'GDPR Consent': p.gdpr_consent,
    };
  },
};
