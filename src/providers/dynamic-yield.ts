import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson } from './parse-helpers';

export const dynamicYield: Provider = {
  name: 'Dynamic Yield',
  color: '#6B5CE7',
  pattern: /dyntrk\.com|cdn\.dynamicyield\.com\/api/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      'DY ID': p.dyid,
      'Session ID': p.ses,
      Event: p.name,
      Section: p.section,
    };

    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    if (body.choices && Array.isArray(body.choices)) {
      const names = body.choices
        .map((c: Record<string, unknown>) => {
          const vars = c.variations as Array<Record<string, unknown>> | undefined;
          const varNames = vars?.map((v) => String(v.name ?? v.variationId ?? '?')).join(', ');
          return varNames;
        })
        .filter(Boolean)
        .join(' | ');
      if (names) result['Variations'] = names;
    }

    result['DY Context'] = str(body.context);
    result['Session ID'] = str(body.session);

    return result;
  },
} as const;
