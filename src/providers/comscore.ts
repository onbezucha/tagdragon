import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';

export const comscore: Provider = {
  name: 'Comscore',
  color: '#0099CC',
  pattern: /scorecardresearch\.com\/b\b|sb\.scorecardresearch\.com/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    const knownKeys = new Set([
      'c1', 'c2', 'cv', 'cs_it', 'c7', 'c8', 'c9', 'ns__t',
      'gdpr', 'gdpr_purps', 'gdpr_li', 'gdpr_pcc',
      'cs_cmp_id', 'cs_fpid', 'cs_cfg', 'c12',
    ]);

    const extra: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(p)) {
      if (!knownKeys.has(key) && key.startsWith('c') && value !== undefined) {
        extra[key] = value;
      }
    }

    return {
      'Type': p.c1,
      'Client ID': p.c2,
      'Version': p.cv,
      'Integration Type': p.cs_it,
      'Page URL': p.c7,
      'Page Title': p.c8,
      'Referrer': p.c9,
      'Timestamp': p.ns__t,
      'GDPR': p.gdpr,
      'GDPR Purposes': p.gdpr_purps,
      'GDPR LI': p.gdpr_li,
      'GDPR Country': p.gdpr_pcc,
      'Campaign ID': p.cs_cmp_id,
      'Fingerprint ID': p.cs_fpid,
      'Config': p.cs_cfg,
      'Segment': p.c12,
      ...extra,
    };
  },
} as const;
