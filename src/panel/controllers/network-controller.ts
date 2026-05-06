// ═══════════════════════════════════════════════════════════════════════════
// NETWORK CONTROLLER — Network request processing, filtering, and persistence
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest } from '@/types/request';
import * as state from '../state';
import { DOM } from '../utils/dom';
import { getEventName } from '../utils/format';
import { matchesFilter } from '../utils/filter';
import { downloadCsv } from '../utils/export';
import { createRequestRow } from '../components/request-list';
import { clearTabCache } from '../components/detail-pane';
import {
  updateStatusBar,
  showPruneNotification,
  clearPruneTimer,
  resetStatusBar,
} from '../components/status-bar';
import {
  ensureProviderPill,
  refreshHttpFilterPillStates,
  resetProviderCounts,
  setProviderCounts,
} from '../components/provider-filter';
import { doApplyFilters, doUpdateActiveFilters } from './filter-callbacks';
import {
  scheduleSaveRequests,
  loadPersistedRequests,
  clearPersistedRequests,
} from '../utils/session-persist';
import { USER_ID_PARAM_KEYS } from '@/shared/constants';

// ─── REQUEST INDEXING ─────────────────────────────────────────────────────────

/**
 * Pre-index a request for fast filtering and display.
 * Computes _searchIndex, _eventName, _hasUserId, _statusPrefix once.
 */
function indexRequest(data: ParsedRequest): void {
  data._searchIndex = [
    data.url || '',
    data.provider || '',
    ...Object.keys(data.allParams || {}),
    ...Object.values(data.allParams || {}).map(String),
    ...Object.keys(data.decoded || {}),
    ...Object.values(data.decoded || {}).map(String),
  ]
    .join('\0')
    .toLowerCase();

  if (!data._eventName) data._eventName = getEventName(data);

  data._hasUserId = USER_ID_PARAM_KEYS.some(
    (key) => !!(data.decoded?.[key as string] ?? data.allParams?.[key])
  );

  data._statusPrefix = data.status ? String(data.status)[0] : null;
}

// ─── MEMORY BUDGET ───────────────────────────────────────────────────────────

function pruneIfNeeded(): void {
  if (!state.getConfig().autoPrune || state.getConfig().maxRequests === 0) return;
  if (state.getAllRequests().length <= state.getConfig().maxRequests) return;

  const config = state.getConfig();
  const pruneTarget = Math.floor(config.maxRequests * config.pruneRatio);
  const removeCount = state.getAllRequests().length - pruneTarget;

  // Remove from data structures
  const removed = state.getAllRequests().splice(0, removeCount);
  for (const r of removed) {
    state.deleteRequestById(String(r.id));
    state.removeFromFiltered(String(r.id));
  }

  // Clean up heavy data for pruned requests
  if (window._deleteHeavyData) {
    window._deleteHeavyData(removed.map((r) => r.id));
  }

  // Remove from DOM
  const $list = DOM.list;
  if (!$list) return;

  const rows = $list.querySelectorAll('.req-row');
  let domRemoved = 0;
  for (let i = 0; i < rows.length && domRemoved < removeCount; i++) {
    const id = (rows[i] as HTMLElement).dataset.id;
    if (id && !state.hasRequest(id)) {
      rows[i].remove();
      domRemoved++;
    }
  }

  // Handle selected request if it was pruned
  const selectedId = state.getSelectedId();
  if (selectedId && !state.hasRequest(selectedId)) {
    state.setSelectedId(null);
    const detail = DOM.detail;
    if (detail) detail.classList.add('hidden');
    document.querySelectorAll('.req-row.active').forEach((r) => r.classList.remove('active'));
  }

  // Single-pass: recalculate provider counts and stats
  const counts: Record<string, number> = {};
  let visibleCount = 0;
  let totalSize = 0;
  let totalDuration = 0;
  const filteredIds = state.getFilteredIds();
  const hiddenProviders = state.getHiddenProviders();
  for (const r of state.getAllRequests()) {
    counts[r.provider] = (counts[r.provider] || 0) + 1;
    if (filteredIds.has(String(r.id)) && !hiddenProviders.has(r.provider)) {
      visibleCount++;
      totalSize += r.size || 0;
      totalDuration += r.duration || 0;
    }
  }

  // Sync the provider count cache after prune
  setProviderCounts(counts);

  // Update provider pill counts and group badges in DOM
  const groupList = DOM.providerGroupList;
  const pills = groupList?.querySelectorAll('.ppill') ?? [];
  pills.forEach((pill) => {
    const provider = (pill as HTMLElement).dataset.provider!;
    const count = counts[provider] || 0;
    const countEl = pill.querySelector('.ppill-count') as HTMLElement;
    if (countEl) countEl.textContent = String(count);
  });
  if (groupList) {
    groupList.querySelectorAll('.pgroup').forEach((group) => {
      const $badge = group.querySelector('.pgroup-count') as HTMLElement;
      if (!$badge) return;
      let total = 0;
      group.querySelectorAll('.ppill').forEach((pill) => {
        const provider = (pill as HTMLElement).dataset.provider!;
        total += counts[provider] || 0;
      });
      $badge.textContent = total > 0 ? String(total) : '';
    });
  }

  state.updateStats(visibleCount, totalSize, totalDuration);
  showPruneNotification(removeCount);
  scheduleSaveRequests(state.getAllRequests());
}

// ─── BATCHED RENDERING ───────────────────────────────────────────────────────

function flushPendingRequests(): void {
  state.setRafId(null);
  if (state.getPendingRequests().length === 0) return;

  try {
    const empty = DOM.empty;
    if (empty) empty.style.display = 'none';

    // Cache once per flush batch
    const cfg = state.getConfig();
    const sessionStart = state.getAllRequests()[0]?.timestamp;

    const fragment = document.createDocumentFragment();
    for (const { data, isVisible } of state.getPendingRequests()) {
      ensureProviderPill(data, doApplyFilters, doUpdateActiveFilters);
      const row = createRequestRow(data, isVisible, cfg, sessionStart);
      fragment.appendChild(row);
    }

    const list = DOM.list;
    if (list) {
      if (state.getConfig().sortOrder === 'desc') {
        list.insertBefore(fragment, list.firstChild);
      } else {
        list.appendChild(fragment);
      }
    }

    state.clearPendingRequests();
    const stats = state.getStats();
    updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);

    // Update network tab badge
    const $networkBadge = DOM.tabBadgeNetwork;
    if ($networkBadge) $networkBadge.textContent = String(state.getAllRequests().length);
    refreshHttpFilterPillStates();
  } catch (err) {
    // Clear pending queue to prevent stuck state — next request will restart the RAF chain
    state.clearPendingRequests();
    console.error('Request Tracker: Error flushing pending requests', err);
  }
}

// ─── NETWORK CLEAR ───────────────────────────────────────────────────────────

/**
 * Clear Network request data only.
 * Preserves filters, hidden providers, settings, and configuration.
 */
function clearNetworkData(): void {
  state.clearRequests();
  state.clearPendingRequests();
  state.setSelectedId(null);
  state.resetStats();

  const rafId = state.getRafId();
  if (rafId) {
    cancelAnimationFrame(rafId);
    state.setRafId(null);
  }

  // Clear DOM
  const list = DOM.list;
  const empty = DOM.empty;
  if (list) {
    list.innerHTML = '';
    if (empty) list.appendChild(empty);
  }
  if (empty) empty.style.display = '';

  const detail = DOM.detail;
  if (detail) detail.classList.add('hidden');

  // Clear provider pills from DOM
  const groupList = DOM.providerGroupList;
  if (groupList) groupList.innerHTML = '';

  resetProviderCounts();

  // Reset tab badge
  const $networkBadge = DOM.tabBadgeNetwork;
  if ($networkBadge) $networkBadge.textContent = '0';

  // Cleanup
  clearPruneTimer();
  clearTabCache();
  if (window._clearHeavyData) window._clearHeavyData();
  resetStatusBar();
  clearPersistedRequests();
}

// ─── RESTORE PERSISTED REQUESTS ──────────────────────────────────────────────

/**
 * Restore requests persisted from a previous panel session (before reload).
 * Re-indexes each request and renders it to the list.
 */
function restorePersistedRequests(): void {
  const persisted = loadPersistedRequests();
  if (persisted.length === 0) return;

  const cfg = state.getConfig();
  const empty = DOM.empty;
  if (empty) empty.style.display = 'none';

  const fragment = document.createDocumentFragment();
  const sessionStart = persisted[0]?.timestamp;

  // Index and build rows; for desc order, iterate in reverse so newest ends up at top
  const iterOrder = cfg.sortOrder === 'desc' ? [...persisted].reverse() : persisted;

  for (const data of iterOrder) {
    indexRequest(data);
    state.addRequest(data);

    const isVisible = !state.isProviderHidden(data.provider) && matchesFilter(data);
    if (isVisible) {
      state.addFilteredId(String(data.id));
      state.incrementStats(data.size, data.duration);
    }

    ensureProviderPill(data, doApplyFilters, doUpdateActiveFilters);
    const row = createRequestRow(data, isVisible, cfg, sessionStart);
    fragment.appendChild(row);
  }

  const list = DOM.list;
  if (list) {
    list.appendChild(fragment);
  }

  const stats = state.getStats();
  updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);

  const $networkBadge = DOM.tabBadgeNetwork;
  if ($networkBadge) $networkBadge.textContent = String(state.getAllRequests().length);
}

// ─── EXPORT HELPERS ──────────────────────────────────────────────────────────

/**
 * Get requests to export: filtered subset when filters are active, otherwise all.
 */
function getExportRequests(): ParsedRequest[] {
  const all = state.getAllRequests();
  const filteredIds = state.getFilteredIds();
  if (filteredIds.size === 0 || filteredIds.size === all.length) return all;
  return all.filter((r) => filteredIds.has(String(r.id)));
}

// ─── EXPORT HELPERS ──────────────────────────────────────────────────────────

/**
 * Get hostname for export filename.
 * Extracts from the first request URL, sanitizing special characters.
 * Falls back to 'unknown' if no requests exist.
 */
export function getExportHostname(): string {
  try {
    const requests = state.getAllRequests();
    if (requests.length > 0 && requests[0].url) {
      const url = new URL(requests[0].url);
      // Sanitize: remove protocol, keep hostname with dots and hyphens
      return url.hostname.replace(/[^a-zA-Z0-9.-]/g, '');
    }
  } catch {
    // Ignore URL parsing errors
  }
  return 'unknown';
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

function exportCsv(hostname: string, timestamp: number): void {
  const $statusStats = document.getElementById('status-stats');
  const originalStatus = $statusStats?.textContent || '';
  if ($statusStats) $statusStats.textContent = 'Exporting CSV...';

  try {
    const requests = getExportRequests();
    if (requests.length === 0) {
      if ($statusStats) $statusStats.textContent = originalStatus;
      return;
    }

    const allKeys = new Set<string>();
    requests.forEach((r) => Object.keys(r.allParams || {}).forEach((k) => allKeys.add(k)));
    const paramKeys = [...allKeys].sort();

    const metaCols = ['id', 'timestamp', 'provider', 'method', 'status', 'url', 'duration', 'size'];
    const headers = [...metaCols, ...paramKeys];

    const rows = requests.map((r) => {
      const meta = [
        String(r.id),
        String(r.timestamp),
        r.provider,
        r.method,
        String(r.status ?? ''),
        r.url,
        String(r.duration ?? ''),
        String(r.size ?? ''),
      ];
      const params = paramKeys.map((k) => String(r.allParams?.[k] ?? ''));
      return [...meta, ...params];
    });

    downloadCsv(headers, rows, `tagdragon-${hostname}-${timestamp}.csv`);

    if ($statusStats) $statusStats.textContent = `✓ Exported ${requests.length} requests to CSV`;
    setTimeout(() => {
      if ($statusStats) $statusStats.textContent = originalStatus;
    }, 3000);
  } catch (err) {
    if ($statusStats)
      $statusStats.textContent = `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    setTimeout(() => {
      if ($statusStats) $statusStats.textContent = originalStatus;
    }, 5000);
  }
}

// ─── WINDOW HANDLERS ─────────────────────────────────────────────────────────

function receiveRequest(data: ParsedRequest): void {
  try {
    if (state.getIsPaused()) return;

    // Index and store
    indexRequest(data);
    state.addRequest(data);
    scheduleSaveRequests(state.getAllRequests());

    // Memory budget check
    pruneIfNeeded();

    // Incremental filter
    const isVisible = !state.isProviderHidden(data.provider) && matchesFilter(data);
    if (isVisible) {
      state.addFilteredId(String(data.id));
      state.incrementStats(data.size, data.duration);
    }

    // Queue for batched rendering
    state.addPendingRequest({ data, isVisible });
    if (!state.getRafId()) {
      state.setRafId(requestAnimationFrame(flushPendingRequests));
    }
  } catch (err) {
    console.error('Request Tracker: Error processing request', err);
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────

export function initNetworkController(): void {
  window.receiveRequest = receiveRequest;
  window.flushPendingRequests = flushPendingRequests;
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export { clearNetworkData, getExportRequests, exportCsv, restorePersistedRequests };
