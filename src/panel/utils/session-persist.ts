// ─── SESSION PERSISTENCE ──────────────────────────────────────────────────────
// Persists captured requests across DevTools panel reloads using sessionStorage.
// Data survives panel reload but is cleared when DevTools window closes.

import type { ParsedRequest } from '@/types/request';

const SESSION_KEY = 'tagdragon_requests';
const SAVE_DEBOUNCE_MS = 500;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a debounced save of all requests to sessionStorage.
 * Called after each new request to keep storage in sync.
 */
export function scheduleSaveRequests(requests: ParsedRequest[]): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistRequests(requests);
  }, SAVE_DEBOUNCE_MS);
}

function stripHeavyFields(r: ParsedRequest): Record<string, unknown> {
  const obj: Record<string, unknown> = { ...r };
  delete obj['responseBody'];
  delete obj['requestHeaders'];
  delete obj['responseHeaders'];
  return obj;
}

function persistRequests(requests: ParsedRequest[]): void {
  try {
    const toStore = requests.map(stripHeavyFields);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toStore));
  } catch {
    // Quota exceeded — try storing just the last 100 requests
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(requests.slice(-100).map(stripHeavyFields)));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
}

/**
 * Load previously persisted requests from sessionStorage.
 * Returns empty array if no data, data is corrupt, or shape is invalid.
 */
export function loadPersistedRequests(): ParsedRequest[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape check: first item must have id, url, provider
    const first = parsed[0];
    if (first && (typeof first.id === 'undefined' || typeof first.url !== 'string' || typeof first.provider !== 'string')) {
      return [];
    }
    return parsed as ParsedRequest[];
  } catch {
    return [];
  }
}

/**
 * Remove persisted requests from sessionStorage.
 * Call this when the user explicitly clears the request list.
 */
export function clearPersistedRequests(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  sessionStorage.removeItem(SESSION_KEY);
}
