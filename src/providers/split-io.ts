import type { Provider } from '@/types/provider';

export const splitIo: Provider = {
  name: 'Split',
  color: '#00B5AD',
  pattern: /events\.split\.io\/api\/events/,

  parseParams(_url: string, postBody: unknown): Record<string, string | undefined> {
    let eventType: string | undefined;
    let key: string | undefined;
    let trafficType: string | undefined;
    let value: string | undefined;
    try {
      const har = postBody as { text?: string } | undefined;
      if (har?.text) {
        const body = JSON.parse(har.text) as Array<Record<string, unknown>>;
        const first = body?.[0];
        eventType = first?.eventTypeId as string | undefined;
        key = first?.key as string | undefined;
        trafficType = first?.trafficTypeName as string | undefined;
        value = first?.value !== undefined ? String(first.value) : undefined;
      }
    } catch {
      /* ignore */
    }
    return {
      Event: eventType,
      Key: key,
      'Traffic Type': trafficType,
      Value: value,
    };
  },
} as const;
