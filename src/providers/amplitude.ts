import type { Provider } from '@/types/provider';
import type { HARPostBody } from '@/types/har';
import { getParams } from './url-parser';

function parseHARJson(postRaw: unknown): Record<string, unknown> {
  try {
    const har = postRaw as HARPostBody;
    const text = har?.text ?? (har?.raw?.[0]?.bytes ? atob(har.raw[0].bytes) : '');
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const amplitude: Provider = {
  name: 'Amplitude',
  color: '#2D7DD2',
  // Amplitude HTTP API v2 (batch or single event)
  pattern: /amplitude\.com\/2\/httpapi|amplitude\.com\/batch/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const body = parseHARJson(postRaw);
    const events = Array.isArray(body['events'])
      ? (body['events'] as Record<string, unknown>[])
      : [];
    const e = events[0] ?? {};
    return {
      Event: e['event_type'] != null ? String(e['event_type']) : p['event_type'],
      'User ID': e['user_id'] != null ? String(e['user_id']) : p['user_id'],
      'Device ID': e['device_id'] != null ? String(e['device_id']) : p['device_id'],
      'Session ID': e['session_id'] != null ? String(e['session_id']) : p['session_id'],
      'API Key': body['api_key'] != null ? String(body['api_key']) : p['api_key'],
      Revenue: e['revenue'] != null ? String(e['revenue']) : undefined,
      URL: url,
    };
  },
} as const;
