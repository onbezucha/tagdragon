// ─── SESSION PERSISTENCE ──────────────────────────────────────────────────────
// Persists captured requests across DevTools panel reloads using sessionStorage.
// Data survives panel reload but is cleared when DevTools window closes.

import type { ParsedRequest } from '@/types/request';

function getSessionKey(): string {
  try {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    return `tagdragon_requests_${tabId}`;
  } catch {
    return 'tagdragon_requests';
  }
}
const SAVE_DEBOUNCE_MS = 1500;

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
    sessionStorage.setItem(getSessionKey(), JSON.stringify(toStore));
  } catch {
    // Quota exceeded — try storing just the last 100 requests
    try {
      sessionStorage.setItem(
        getSessionKey(),
        JSON.stringify(requests.slice(-100).map(stripHeavyFields))
      );
    } catch {
      sessionStorage.removeItem(getSessionKey());
    }
  }
}

/**
 * Load previously persisted requests from sessionStorage.
 * Returns empty array if no data, data is corrupt, or shape is invalid.
 */
export function loadPersistedRequests(): ParsedRequest[] {
  try {
    const raw = sessionStorage.getItem(getSessionKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each item has minimum required shape (id, url, provider)
    const valid = parsed.every(
      (item: unknown): item is ParsedRequest =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item &&
        'url' in item &&
        'provider' in item
    );
    if (!valid) return [];
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
  sessionStorage.removeItem(getSessionKey());
}
