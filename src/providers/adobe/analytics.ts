import type { Provider } from '../../types/provider';
import { getParams, extractPath } from '../url-parser';

export const adobeAA: Provider = {
  name: 'Adobe Client-Side',
  color: '#FF0000',
  // Patterns:
  //   [company].sc.omtrdc.net/b/ss/[rsid]/...  — standard 3rd-party collection
  //   [company].2o7.net/b/ss/[rsid]/...         — legacy domain
  //   /b/ss/ anywhere                            — CNAME first-party (custom domain)
  //   demdex.net                                 — Audience Manager / ECID sync
  pattern: /\.sc\.omtrdc\.net|\.2o7\.net|\/b\/ss\/|\.demdex\.net/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);

    // Report suite is in path: /b/ss/{rsid}/{version}
    const rsid = extractPath(url, /\/b\/ss\/([^/?]+)/);

    // Hit type: pe=lnk_o (custom link), pe=lnk_d (download), pe=lnk_e (exit), otherwise pageview
    const hitType = p.pe
      ? { lnk_o: 'Custom link', lnk_d: 'Download link', lnk_e: 'Exit link' }[p.pe] || p.pe
      : 'Page view';

    // Context data: keys starting with "c." in query string
    const contextData: Record<string, string> = {};
    Object.entries(p).forEach(([k, v]) => {
      if (k.startsWith('c.') && k !== 'c.') contextData[k.slice(2)] = v;
    });

    // eVars: v1-v250, Props: c1-c75
    // Display only non-empty values
    const eVars: Record<string, string> = {};
    const props: Record<string, string> = {};
    for (let i = 1; i <= 250; i++) {
      if (p[`v${i}`]) eVars[`eVar${i}`] = p[`v${i}`];
    }
    for (let i = 1; i <= 75; i++) {
      if (p[`c${i}`] && !String(p[`c${i}`]).startsWith('.')) props[`prop${i}`] = p[`c${i}`];
    }

    // List Variables
    const lists: Record<string, string> = {};
    for (let i = 1; i <= 3; i++) {
      if (p[`l${i}`]) lists[`list${i}`] = p[`l${i}`];
    }

    // Hierarchies
    const hiers: Record<string, string> = {};
    for (let i = 1; i <= 5; i++) {
      if (p[`h${i}`]) hiers[`hier${i}`] = p[`h${i}`];
    }

    const result: Record<string, string | undefined> = {
      'Hit type': hitType,
      'Report suite': rsid,
      'Page name': p.pageName || p.gn,
      'Page URL': p.g,
      Referrer: p.r,
      'Visitor ID': p.mid || p.aid || p.fid,
      Events: p.events || p.ev,
      Products: p.products || p.pl,
      Campaign: p.v0, // campaign variable = eVar0 internally
      Channel: p.ch,
      Server: p.server,
      'Link name': p.pev2,
      'Link URL': p.pev1,
      Resolution: p.s,
      'Color depth': p.c,
      'JavaScript ver': p.j,
      AppMeasurement: p.ndh === '1' ? 'Yes' : undefined,
      ...eVars,
      ...props,
      ...lists,
      ...hiers,
      ...(Object.keys(contextData).length ? { 'Context data': JSON.stringify(contextData) } : {}),
    };
    result._eventName = result['Hit type'];

    return result;
  },
};
