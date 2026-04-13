import type { Provider } from '@/types/provider';
import {
  CLARITY_EVENT_NAMES,
  CLARITY_EVENT_PRIORITY,
  CLARITY_METRIC_NAMES,
  CLARITY_DIMENSION_NAMES,
  CLARITY_CONSENT_SOURCES,
  CLARITY_UPLOAD_NAMES,
  CLARITY_PLATFORM_NAMES,
  CLARITY_CHECK_NAMES,
} from './clarity-event-types';

// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT CLARITY — FULL EVENT DECODER
// ═══════════════════════════════════════════════════════════════════════════
// Decodes the JSON POST payload sent to clarity.ms/collect.
// Payload structure: { "e": [...envelope], "a": [...analytics], "p": [...playback] }
// Envelope: [version, sequence, start, duration, projectId, userId, sessionId, pageNum, upload, end, platform, url]
// Analytics: [[timestamp, eventTypeCode, ...params], ...]
// Playback: skipped (DOM mutations — only useful for session replay)

// ─── POST BODY PARSER ──────────────────────────────────────────────────

interface ClarityPayload {
  e: unknown[];
  a: unknown[][];
  p?: unknown[][];
}

/**
 * Parse the Clarity POST body into a typed payload object.
 * Returns null if the body is empty, gzipped, or invalid JSON.
 */
function parseClarityPayload(postRaw: unknown): ClarityPayload | null {
  if (!postRaw) return null;

  let text: string | null = null;

  if (typeof postRaw === 'string') {
    text = postRaw;
  } else if (typeof postRaw === 'object') {
    // Already parsed as JSON object by network-capture.ts parsePostBody()
    const obj = postRaw as Record<string, unknown>;
    if (obj.e && obj.a) {
      return obj as ClarityPayload;
    }
    // HAR format: { text: "...", mimeType: "..." }
    if ('text' in obj && typeof obj.text === 'string') {
      text = obj.text;
    }
  }

  if (!text) return null;

  // Detect gzip magic bytes — we can't decompress in this context
  if (text.charCodeAt(0) === 0x1f && text.charCodeAt(1) === 0x8b) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.e && parsed.a) {
      return parsed as ClarityPayload;
    }
  } catch {
    // Not valid JSON — return null (fallback will handle it)
  }

  return null;
}

// ─── ENVELOPE DECODER ──────────────────────────────────────────────────

interface EnvelopeData {
  version: string;
  sequence: number;
  start: number;
  duration: number;
  projectId: string;
  userId: string;
  sessionId: string;
  pageNum: number;
  upload: number;
  end: number;
  platform: number;
  url: string;
}

function decodeEnvelope(e: unknown[]): {
  params: Record<string, string | undefined>;
  envelope: EnvelopeData;
} {
  const env: EnvelopeData = {
    version: String(e[0] ?? ''),
    sequence: Number(e[1] ?? 0),
    start: Number(e[2] ?? 0),
    duration: Number(e[3] ?? 0),
    projectId: String(e[4] ?? ''),
    userId: String(e[5] ?? ''),
    sessionId: String(e[6] ?? ''),
    pageNum: Number(e[7] ?? 0),
    upload: Number(e[8] ?? 0),
    end: Number(e[9] ?? 0),
    platform: Number(e[10] ?? 0),
    url: String(e[11] ?? ''),
  };

  return {
    envelope: env,
    params: {
      Version: env.version,
      'Project ID': env.projectId,
      'User ID': env.userId,
      'Session ID': env.sessionId,
      'Page Number': String(env.pageNum),
      Sequence: String(env.sequence),
      'Duration (ms)': String(env.duration),
      'Upload Type': CLARITY_UPLOAD_NAMES[env.upload] ?? String(env.upload),
      'Is Last Payload': env.end === 1 ? 'Yes (Beacon)' : 'No',
      Platform: CLARITY_PLATFORM_NAMES[env.platform] ?? String(env.platform),
      'Page URL': env.url,
    },
  };
}

// ─── EVENT DECODER ─────────────────────────────────────────────────────

/**
 * Decode all analytics events into human-readable key/value pairs.
 * Each event produces one or more decoded params with indexed keys like "Click [3]".
 */
function decodeAnalyticsEvents(events: unknown[][]): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!Array.isArray(ev) || ev.length < 2) continue;

    const eventType = Number(ev[1]);
    const eventName = CLARITY_EVENT_NAMES[eventType];
    if (!eventName) continue;

    switch (eventType) {
      case 9: // Click
        params[`Click [${i}]`] = `target=${ev[2] ?? '?'}, x=${ev[3] ?? '?'}, y=${ev[4] ?? '?'}`;
        break;

      case 10: // Scroll
        params[`Scroll [${i}]`] = `x=${ev[2] ?? '?'}, y=${ev[3] ?? '?'}`;
        break;

      case 16: // DoubleClick
        params[`DoubleClick [${i}]`] =
          `target=${ev[2] ?? '?'}, x=${ev[3] ?? '?'}, y=${ev[4] ?? '?'}`;
        break;

      case 24: {
        // Custom
        const key = ev[2] != null ? String(ev[2]) : '';
        const value = ev[3] != null ? String(ev[3]) : '';
        params[`Custom Event [${i}]`] = key ? `${key} = ${value}` : value;
        break;
      }

      case 25: // Ping
        params[`Ping [${i}]`] = `gap=${ev[2] ?? '?'}ms`;
        break;

      case 27: // Input
        params[`Input [${i}]`] = `target=${ev[2] ?? '?'}`;
        break;

      case 28: // Visibility
        params[`Visibility [${i}]`] = ev[2] === 1 ? 'visible' : 'hidden';
        break;

      case 29: // Navigation
        params[`Navigation [${i}]`] = String(ev[2] ?? '');
        break;

      case 31: // ScriptError
        params[`ScriptError [${i}]`] = String(ev[2] ?? '');
        break;

      case 39: // Submit
        params[`Form Submit [${i}]`] = `target=${ev[2] ?? '?'}`;
        break;

      case 47: {
        // Consent
        const source = Number(ev[2] ?? 0);
        const adStorage = ev[3] === 1 ? 'Granted' : 'Denied';
        const analyticsStorage = ev[4] === 1 ? 'Granted' : 'Denied';
        const sourceName = CLARITY_CONSENT_SOURCES[source] ?? `Unknown(${source})`;
        params[`Consent [${i}]`] =
          `source=${sourceName}, ad_storage=${adStorage}, analytics_storage=${analyticsStorage}`;
        break;
      }

      case 0: {
        // Metric — decode sub-key/value pairs
        for (let j = 2; j + 1 < ev.length; j += 2) {
          const metricKey = Number(ev[j]);
          const metricValue = ev[j + 1];
          const metricName = CLARITY_METRIC_NAMES[metricKey];
          if (metricName) {
            params[`Metric: ${metricName}`] = String(metricValue);
          }
        }
        break;
      }

      case 1: {
        // Dimension — decode sub-key/value pairs
        for (let j = 2; j + 1 < ev.length; j += 2) {
          const dimKey = Number(ev[j]);
          const dimValue = ev[j + 1];
          const dimName = CLARITY_DIMENSION_NAMES[dimKey];
          if (dimName) {
            params[`Dim: ${dimName}`] = String(dimValue);
          }
        }
        break;
      }

      case 2: // Upload
        params[`Upload [${i}]`] =
          `seq=${ev[2] ?? '?'}, attempts=${ev[3] ?? '?'}, status=${ev[4] ?? '?'}`;
        break;

      case 3: // Upgrade
        params[`Upgrade [${i}]`] = String(ev[2] ?? '');
        break;

      case 34: {
        // Variable
        for (let j = 2; j + 1 < ev.length; j += 2) {
          params[`Variable: ${ev[j]}`] = String(ev[j + 1]);
        }
        break;
      }

      case 35: {
        // Limit
        const checkKey = Number(ev[2] ?? 0);
        params[`Limit [${i}]`] = CLARITY_CHECK_NAMES[checkKey] ?? String(checkKey);
        break;
      }

      default: {
        // For other event types, show type name + raw params
        const raw = ev
          .slice(2)
          .map((v) => String(v ?? ''))
          .join(', ');
        if (raw) {
          params[`${eventName} [${i}]`] = raw;
        }
        break;
      }
    }
  }

  return params;
}

// ─── EVENT NAME EXTRACTOR ──────────────────────────────────────────────

/**
 * Find the most interesting event type in the payload for the request list summary.
 * Uses CLARITY_EVENT_PRIORITY to pick the best candidate.
 * For Custom/Consent/Navigation events, appends extra context.
 */
function extractEventName(events: unknown[][]): string | undefined {
  const presentTypes = new Set<number>();
  for (const ev of events) {
    if (Array.isArray(ev) && ev.length >= 2) {
      presentTypes.add(Number(ev[1]));
    }
  }

  for (const priorityType of CLARITY_EVENT_PRIORITY) {
    if (!presentTypes.has(priorityType)) continue;

    const name = CLARITY_EVENT_NAMES[priorityType];
    if (!name) continue;

    // Custom events: append key name
    if (priorityType === 24) {
      const customEv = events.find((e) => Array.isArray(e) && Number(e[1]) === 24);
      if (customEv && customEv[2]) {
        return `Custom: ${customEv[2]}`;
      }
    }

    // Consent events: append source name
    if (priorityType === 47) {
      const consentEv = events.find((e) => Array.isArray(e) && Number(e[1]) === 47);
      if (consentEv) {
        const source = CLARITY_CONSENT_SOURCES[Number(consentEv[2] ?? 0)] ?? '';
        return `Consent${source ? ` (${source})` : ''}`;
      }
    }

    // Navigation events: append target URL (truncated)
    if (priorityType === 29) {
      const navEv = events.find((e) => Array.isArray(e) && Number(e[1]) === 29);
      if (navEv && navEv[2]) {
        return `Nav: ${String(navEv[2]).slice(0, 40)}`;
      }
    }

    return name;
  }

  // Fallback: use first event type
  if (events.length > 0 && Array.isArray(events[0]) && events[0].length >= 2) {
    return CLARITY_EVENT_NAMES[Number(events[0][1])];
  }

  return undefined;
}

// ─── PROVIDER ──────────────────────────────────────────────────────────

export const microsoftClarity: Provider = {
  name: 'Microsoft Clarity',
  color: '#00BCF2',
  pattern: /clarity\.ms\/collect/,

  parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
    const payload = parseClarityPayload(postRaw);

    if (!payload) {
      // Can't parse payload (gzip, empty, or invalid)
      return {
        URL: url,
        _eventName: 'Upload (compressed)',
      };
    }

    // Decode envelope
    const { params: envelopeParams, envelope } = decodeEnvelope(payload.e);

    // Decode analytics events
    const eventParams = decodeAnalyticsEvents(payload.a || []);

    // Extract best event name for the request list
    const eventName = extractEventName(payload.a || []);

    // Build event type summary
    const eventTypes = new Set<string>();
    for (const ev of payload.a || []) {
      if (Array.isArray(ev) && ev.length >= 2) {
        const name = CLARITY_EVENT_NAMES[Number(ev[1])];
        if (name) eventTypes.add(name);
      }
    }
    const eventCount = (payload.a || []).length;
    const eventSummary = Array.from(eventTypes).sort().join(', ');

    return {
      ...envelopeParams,
      'Event Count': String(eventCount),
      'Event Types': eventSummary,
      ...eventParams,
      _eventName: eventName ?? `Upload (seq: ${envelope.sequence})`,
    };
  },
} as const;
