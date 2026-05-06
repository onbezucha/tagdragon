import type { Provider } from '@/types/provider';
import { parsePostBodyJson } from './parse-helpers';

export const splitIo: Provider = {
  name: 'Split',
  color: '#00B5AD',
  pattern: /events\.split\.io\/api\/events/,

  parseParams(_url: string, postBody: unknown): Record<string, string | undefined> {
    const parsed = parsePostBodyJson(postBody);
    // Split.io sends an array of events
    const body = Array.isArray(parsed) ? parsed : [parsed];
    const first = body[0] as Record<string, unknown> | undefined;
    const eventType: string | undefined = first?.eventTypeId as string | undefined;
    const key: string | undefined = first?.key as string | undefined;
    const trafficType: string | undefined = first?.trafficTypeName as string | undefined;
    const value: string | undefined = first?.value !== undefined ? String(first.value) : undefined;
    const result: Record<string, string | undefined> = {
      Event: eventType,
      _eventName: eventType,
      Key: key,
      'Traffic Type': trafficType,
      Value: value,
    };
    return result;
  },
} as const;
