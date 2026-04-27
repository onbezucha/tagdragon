import type { Provider } from '@/types/provider';
import { parsePostBodyJson, titleCase, formatJsonValue, maskKey } from './parse-helpers';

/**
 * Extract RudderStack write key from URL path.
 * URL format: /v1/{type}/{writeKey}
 */
function extractWriteKey(url: string): string | undefined {
  const m = url.match(/\/v1\/[tpiga]\/([^/?]+)/);
  return m?.[1];
}

export const rudderstack: Provider = {
  name: 'RudderStack',
  color: '#1EA9DB',
  pattern: /\.rudderstack\.com\/v1\/|hosted\.rudderlabs\.com\/v1\//,
  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    const result: Record<string, string | undefined> = {
      // Core
      Type: str(body.type),
      Event: str(body.event),
      'User ID': str(body.userId),
      'Anonymous ID': str(body.anonymousId),
      'Message ID': str(body.messageId),
      Timestamp: str(body.timestamp),
      'Write Key': maskKey(extractWriteKey(url)),
    };

    // Context
    const ctx = (body.context as Record<string, unknown>) ?? {};
    const page = (ctx.page as Record<string, unknown>) ?? {};
    const campaign = (ctx.campaign as Record<string, unknown>) ?? {};

    if (page.url) result['Page URL'] = str(page.url);
    if (page.title) result['Page Title'] = str(page.title);
    if (page.referrer) result['Referrer'] = str(page.referrer);
    if (campaign.source) result['Campaign Source'] = str(campaign.source);
    if (campaign.medium) result['Campaign Medium'] = str(campaign.medium);
    if (campaign.name) result['Campaign Name'] = str(campaign.name);
    if (ctx.userAgent) result['User Agent'] = str(ctx.userAgent);
    if (ctx.ip) result['IP'] = str(ctx.ip);

    // Integrations
    if (body.integrations && typeof body.integrations === 'object') {
      const integs = Object.entries(body.integrations as Record<string, unknown>)
        .filter(([, v]) => v === false)
        .map(([k]) => k);
      if (integs.length > 0) result['Disabled Destinations'] = integs.join(', ');
    }

    // Properties (track/page calls) — flat pass-through
    const props = (body.properties as Record<string, unknown>) ?? {};
    for (const [key, value] of Object.entries(props)) {
      result[titleCase(key)] = formatJsonValue(value);
    }

    // Traits (identify/group calls) — flat pass-through
    const traits = (body.traits as Record<string, unknown>) ?? {};
    for (const [key, value] of Object.entries(traits)) {
      result[`${titleCase(key)} (trait)`] = formatJsonValue(value);
    }

    return result;
  },
} as const;
