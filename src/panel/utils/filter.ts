// ─── FILTER UTILITIES ────────────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';
import { getEventName, getHostname } from './format';
import * as state from '@/panel/state';

// Cache compiled regex objects to avoid recompilation on every matchesFilter call.
// null = previously compiled but invalid (parse error)
const _regexCache = new Map<string, RegExp | null>();

/**
 * Check if a request matches current filters.
 */
export function matchesFilter(data: ParsedRequest): boolean {
  const filterText = state.getFilterText();
  const filterEventType = state.getFilterEventType();
  const filterUserId = state.getFilterUserId();
  const filterStatus = state.getFilterStatus();
  const filterMethod = state.getFilterMethod();
  const filterHasParam = state.getFilterHasParam();

  // Text search – supports /regex/flags syntax, falls back to plain text
  if (filterText) {
    const isRegex =
      filterText.length > 2 && filterText[0] === '/' && filterText.lastIndexOf('/') > 0;

    if (isRegex) {
      const lastSlash = filterText.lastIndexOf('/');
      const pattern = filterText.slice(1, lastSlash);
      const flags = filterText.slice(lastSlash + 1) || 'i';
      let regex: RegExp | null;
      if (_regexCache.has(filterText)) {
        regex = _regexCache.get(filterText) ?? null;
      } else {
        try {
          regex = new RegExp(pattern, flags);
        } catch {
          regex = null; // Invalid regex — plain text fallback below
        }
        _regexCache.set(filterText, regex);
      }

      if (regex) {
        const haystack = data._searchIndex ?? `${data.url}\0${data.provider}`;
        if (!regex.test(haystack)) return false;
      } else {
        const q = filterText.toLowerCase();
        const haystack = data._searchIndex ?? `${data.url.toLowerCase()}\0${data.provider.toLowerCase()}`;
        if (!haystack.includes(q)) return false;
      }
    } else {
      const q = filterText.toLowerCase();
      if (data._searchIndex) {
        if (!data._searchIndex.includes(q)) return false;
      } else {
        const matchesText =
          data.url.toLowerCase().includes(q) || data.provider.toLowerCase().includes(q);
        if (!matchesText) return false;
      }
    }
  }

  // Event type filter – uses pre-computed _eventName
  if (filterEventType) {
    if (filterEventType.startsWith('exact:')) {
      const exactName = filterEventType.slice(6);
      const eventName = data._eventName || getEventName(data);
      if (eventName !== exactName) return false;
    } else {
      const eventName = (data._eventName || getEventName(data)).toLowerCase();
      if (filterEventType === 'page_view') {
        if (!eventName.includes('page') && !eventName.includes('pageview')) return false;
      } else if (filterEventType === 'purchase') {
        if (!eventName.includes('purchase') && !eventName.includes('transaction')) return false;
      } else if (filterEventType === 'custom') {
        if (
          eventName.includes('page') ||
          eventName.includes('purchase') ||
          eventName.includes('transaction')
        )
          return false;
      }
    }
  }

  // User ID filter – uses pre-computed _hasUserId
  if (filterUserId) {
    const hasUserId =
      data._hasUserId !== undefined
        ? data._hasUserId
        : !!(
            data.decoded?.client_id ||
            data.decoded?.['Client ID'] ||
            data.allParams?.cid ||
            data.allParams?.uid ||
            data.allParams?.user_id ||
            data.allParams?.client_id
          );
    if (filterUserId === 'has' && !hasUserId) return false;
    if (filterUserId === 'missing' && hasUserId) return false;
  }

  // Status filter – uses pre-computed _statusPrefix
  if (filterStatus) {
    const prefix = data._statusPrefix || (data.status ? String(data.status)[0] : null);
    if (!prefix || prefix !== filterStatus[0]) return false;
  }

  // Method filter
  if (filterMethod) {
    if (data.method !== filterMethod) return false;
  }

  // Has parameter filter (case-insensitive)
  if (filterHasParam) {
    const needle = filterHasParam.toLowerCase();
    const hasParamInMap = (map: Record<string, string | undefined>) =>
      Object.entries(map).some(
        ([k, v]) => k.toLowerCase() === needle && v !== '' && v !== undefined
      );
    const found =
      (data.allParams && hasParamInMap(data.allParams)) ||
      (data.decoded && hasParamInMap(data.decoded as Record<string, string | undefined>));
    if (!found) return false;
  }

  return true;
}

/**
 * Apply all filters and update visibility.
 */
export function applyFilters(
  updateRowVisibility?: () => void,
  updateStatusBar?: (visibleCount: number, totalSize: number, totalDuration: number) => void
): void {
  let visibleCount = 0;
  let totalSize = 0;
  let totalDuration = 0;

  // Single pass: filter data + compute stats together
  const filteredIds = state.getFilteredIds();
  const allRequests = state.getAllRequests();
  const hiddenProviders = state.getHiddenProviders();

  filteredIds.clear();

  for (let i = 0; i < allRequests.length; i++) {
    const r = allRequests[i];

    // Provider check (cheapest, do first)
    if (hiddenProviders.has(r.provider)) continue;

    // Apply all filters using matchesFilter
    if (!matchesFilter(r)) continue;

    // Passed all filters
    filteredIds.add(String(r.id));
    visibleCount++;
    totalSize += r.size || 0;
    totalDuration += r.duration || 0;
  }

  // Update stats
  state.updateStats(visibleCount, totalSize, totalDuration);

  // Callbacks
  if (updateStatusBar) updateStatusBar(visibleCount, totalSize, totalDuration);
  if (updateRowVisibility) updateRowVisibility();
}

/**
 * Get known event names with counts.
 */
export function getKnownEventNames(): Array<[string, number]> {
  const counts = new Map<string, number>();
  const allRequests = state.getAllRequests();

  allRequests.forEach((r) => {
    const name = r._eventName || getEventName(r);
    if (name && name !== getHostname(r.url)) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Get status code counts grouped by first digit.
 */
export function getStatusCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  const allRequests = state.getAllRequests();

  allRequests.forEach((r) => {
    if (r._statusPrefix) {
      counts[r._statusPrefix] = (counts[r._statusPrefix] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Get HTTP method counts.
 */
export function getMethodCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  const allRequests = state.getAllRequests();

  allRequests.forEach((r) => {
    if (r.method) {
      counts[r.method] = (counts[r.method] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Get user ID presence counts.
 */
export function getUserIdCounts(): { has: number; missing: number } {
  let has = 0;
  let missing = 0;
  const allRequests = state.getAllRequests();

  allRequests.forEach((r) => {
    if (r._hasUserId) has++;
    else missing++;
  });
  return { has, missing };
}

/**
 * Get common parameter names for quick picks.
 */
export function getCommonParams(): string[] {
  const counts = new Map<string, number>();
  const interesting = [
    'transaction_id',
    'client_id',
    'user_id',
    'currency',
    'value',
    'items',
    'products',
    'event_name',
    'page_location',
    'page_title',
  ];
  const allRequests = state.getAllRequests();

  allRequests.forEach((r) => {
    const allKeys = new Set([...Object.keys(r.allParams || {}), ...Object.keys(r.decoded || {})]);
    allKeys.forEach((k) => {
      counts.set(k, (counts.get(k) || 0) + 1);
    });
  });

  // Return interesting params that actually exist, plus top frequent ones
  const existing = interesting.filter((p) => counts.has(p));
  const frequent = [...counts.entries()]
    .filter(([k]) => !interesting.includes(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);

  return [...new Set([...existing, ...frequent])].slice(0, 10);
}
