import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson, formatJsonValue } from './parse-helpers';

export const amplitude: Provider = {
  name: 'Amplitude',
  color: '#2D7DD2',
  pattern: /amplitude\.com\/2\/httpapi|amplitude\.com\/batch/,
  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const body = parsePostBodyJson(postRaw);
    const events = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];
    const e = events[0] ?? {};
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    const result: Record<string, string | undefined> = {
      // Core
      Event: str(e.event_type) ?? p.event_type,
      'User ID': str(e.user_id) ?? p.user_id,
      'Device ID': str(e.device_id) ?? p.device_id,
      'Session ID': str(e.session_id) ?? p.session_id,
      'API Key': str(body.api_key) ?? p.api_key,
      Revenue: str(e.revenue),
      Time: e.time ? new Date(Number(e.time)).toISOString() : undefined,
    };

    // Device / Geo
    if (e.platform) result['Platform'] = str(e.platform);
    if (e.os_name) result['OS'] = [e.os_name, e.os_version].filter(Boolean).join(' ');
    if (e.device_brand)
      result['Device'] = [e.device_brand, e.device_model].filter(Boolean).join(' ');
    if (e.version_name) result['App Version'] = str(e.version_name);
    if (e.country) result['Country'] = str(e.country);
    if (e.region) result['Region'] = str(e.region);
    if (e.city) result['City'] = str(e.city);
    if (e.ip) result['IP'] = str(e.ip);
    if (e.language) result['Language'] = str(e.language);

    // Event Properties — flat pass-through with ep. prefix
    const ep = (e.event_properties as Record<string, unknown>) ?? {};
    for (const [key, value] of Object.entries(ep)) {
      result[`ep.${key}`] = formatJsonValue(value);
    }

    // User Properties — flat pass-through with up. prefix
    const up = (e.user_properties as Record<string, unknown>) ?? {};
    for (const [key, value] of Object.entries(up)) {
      result[`up.${key}`] = formatJsonValue(value);
    }

    // Groups
    if (e.groups && typeof e.groups === 'object') {
      result['Groups'] = JSON.stringify(e.groups);
    }

    result._eventName = e.event_type as string | undefined;

    return result;
  },
} as const;
