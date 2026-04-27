import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';
import { parsePostBodyJson } from '../parse-helpers';

/**
 * Extract mbox names and parameters from execute/prefetch containers.
 */
function extractMboxes(
  container: Record<string, unknown>,
  prefix: string
): Record<string, string | undefined> {
  const mboxes = container?.mboxes as Array<Record<string, unknown>> | undefined;
  if (!mboxes || mboxes.length === 0) return {};

  const names = mboxes.map((m) => String(m.name ?? '?')).join(', ');
  const result: Record<string, string | undefined> = {
    [`${prefix} Mboxes (${mboxes.length})`]: names,
  };

  for (const mbox of mboxes) {
    const params = mbox.parameters as Record<string, unknown> | undefined;
    if (params && Object.keys(params).length > 0) {
      result[`${prefix}: ${mbox.name}`] = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
    }
  }

  return result;
}

export const adobeTarget: Provider = {
  name: 'Adobe Target',
  color: '#FF0000',
  pattern: /tt\.omtrdc\.net/,
  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const body = parsePostBodyJson(postRaw);
    const req = (body.request as Record<string, unknown>) ?? {};
    const id = (req.id as Record<string, unknown>) ?? {};
    const ctx = (req.context as Record<string, unknown>) ?? {};
    const address = (ctx.address as Record<string, unknown>) ?? {};
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    // Client code from URL path: /rest/v1/delivery?client=CODE
    const clientMatch = url.match(/client=([^&]+)/);
    const clientCode = clientMatch?.[1] ?? str(body.client);

    const result: Record<string, string | undefined> = {
      // IDs
      'Client Code': clientCode,
      'Request ID': str(req.requestId),
      'Session ID': str(body.sessionId),
      'TNT ID': str(id.tntId),
      MCID: str(id.marketingCloudVisitorId),
      'Third Party ID': str(id.thirdPartyId),
      'Customer ID': str(id.customerId),

      // Context
      Channel: str(ctx.channel),
      'Page URL': str(address.url) ?? p.mboxURL,
      Referrer: str(address.referringUrl) ?? p.referrer,
      Host: str((ctx.browser as Record<string, unknown>)?.host) ?? p.mboxHost,
      'User Agent': str(ctx.userAgent),
      'Environment ID': str(body.environmentId),

      // Mboxes
      ...extractMboxes((req.execute as Record<string, unknown>) ?? {}, 'Execute'),
      ...extractMboxes((req.prefetch as Record<string, unknown>) ?? {}, 'Prefetch'),
    };

    // EC Analytics logging
    const experienceCloud = req.experienceCloud as Record<string, unknown> | undefined;
    const analytics = experienceCloud?.analytics as Record<string, unknown> | undefined;
    if (analytics?.logging) {
      result['EC Analytics'] = str(analytics.logging);
    }

    return result;
  },
} as const;
