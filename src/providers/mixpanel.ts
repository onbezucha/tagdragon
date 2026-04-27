import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { titleCase, formatJsonValue } from './parse-helpers';

/**
 * Decode Mixpanel base64-encoded data parameter.
 */
function decodeMixpanelData(data: string | undefined): Record<string, unknown> | null {
  if (!data) return null;
  try {
    const decoded = JSON.parse(atob(data));
    return Array.isArray(decoded) ? (decoded[0] as Record<string, unknown>) : decoded;
  } catch {
    return null;
  }
}

export const mixpanel: Provider = {
  name: 'Mixpanel',
  color: '#7856FF',
  pattern: /mixpanel\.com\/(track|engage|import)/,
  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const p = getParams(url, postRaw);
    const str = (v: unknown) => (v != null ? String(v) : undefined);

    // Base from URL params
    let eventName: string | undefined = p.event;
    let distinctId: string | undefined;
    let token: string | undefined;

    // Decode base64 data param
    const decoded = decodeMixpanelData(p.data);

    // Pass-through all properties from decoded JSON
    const result: Record<string, string | undefined> = {};

    if (decoded) {
      eventName = str(decoded.event) ?? eventName;
      const props = (decoded.properties as Record<string, unknown>) ?? {};
      distinctId = str(props.distinct_id);
      token = str(props.token);

      // All properties as flat pass-through
      for (const [key, value] of Object.entries(props)) {
        // Skip internal system params we already have explicitly
        if (key === 'distinct_id' || key === 'token') continue;

        // Remove $ prefix for cleaner display
        const displayKey = key.startsWith('$') ? key.slice(1) : key;
        result[titleCase(displayKey)] = formatJsonValue(value);
      }
    }

    // Core (always at the beginning)
    const core: Record<string, string | undefined> = {
      Event: eventName,
      'Distinct ID': distinctId,
      Token: token,
    };

    return { ...core, ...result };
  },
} as const;
