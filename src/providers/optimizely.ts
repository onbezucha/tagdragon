import type { Provider } from '@/types/provider';
import { getParams } from './url-parser';
import { parsePostBodyJson } from './parse-helpers';

export const optimizely: Provider = {
  name: 'Optimizely',
  color: '#0037FF',
  pattern: /\.optimizely\.com\/log\//,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    const result: Record<string, string | undefined> = {
      'User ID': p.userId,
      'Account ID': p.accountId,
      'Project ID': p.projectId,
      'Experiment ID': p.experimentId,
      'Variation ID': p.variationId,
      Event: p.eventName,
      Revenue: p.revenue,
    };

    const body = parsePostBodyJson(postBody);
    const str = (v: unknown) => (v != null ? String(v) : undefined);
    const snapshots = Array.isArray(body.snapshots)
      ? (body.snapshots as Record<string, unknown>[])
      : [];

    if (snapshots.length > 0) {
      const snap = snapshots[0];
      const decisions = snap.decisions as Array<Record<string, unknown>> | undefined;
      const events = snap.events as Array<Record<string, unknown>> | undefined;

      if (decisions?.length) {
        const names = decisions.map((d) => `${d.variationName ?? d.variationId}`).join(', ');
        result['Variations'] = names;
      }

      if (events?.length) {
        const evtNames = events
          .map((e) => String(e.eventName ?? ''))
          .filter(Boolean)
          .join(', ');
        if (evtNames) result['Body Events'] = evtNames;
      }
    }

    result['Client Version'] = str(body.clientVersion);
    result['Visitor ID'] = str(body.visitorId);

    result._eventName = p.eventName;

    return result;
  },
} as const;
