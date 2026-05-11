// ═══════════════════════════════════════════════════════════════════════════
// NETWORK CONTROLLER — Network request processing, filtering, and persistence
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest, PageNavigation } from '@/types/request';
import * as state from '../state';
import { DOM } from '../utils/dom';
import { getEventName } from '../utils/format';
import { matchesFilter } from '../utils/filter';
import { downloadCsv } from '../utils/export';
import {
  createRequestRow,
  updateVisibleRowCache,
  createPageDivider,
  clearVisibleCache,
  removeFromVisibleCache,
} from '../components/request-list';
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

// ─── INCREMENTAL COUNTS ───────────────────────────────────────────────────────

/** Incremental navId → request count. Updated on add/prune/clear. */
const _navRequestCounts = new Map<string, number>();

/** Incremental provider name → count. Updated on add/prune/clear. */
const _providerCounts: Record<string, number> = {};

// ─── REQUEST INDEXING ─────────────────────────────────────────────────────────

/**
 * Pre-index a request for fast filtering and display.
 * Computes _eventName, _hasUserId, _statusPrefix once.
 * _searchIndex is computed lazily on first filter access.
 */
function indexRequest(data: ParsedRequest): void {
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
  let removedVisible = 0;
  let removedSize = 0;
  let removedDuration = 0;
  const filteredIds = state.getFilteredIds();
  const hiddenProviders = state.getHiddenProviders();
  for (const r of removed) {
    state.deleteRequestById(String(r.id));
    // Track stats for visible requests being removed
    if (filteredIds.has(String(r.id)) && !hiddenProviders.has(r.provider)) {
      removedVisible++;
      removedSize += r.size || 0;
      removedDuration += r.duration || 0;
    }
    state.removeFromFiltered(String(r.id));
    // Decrement nav count
    if (r._pageNavId) {
      const current = _navRequestCounts.get(r._pageNavId) ?? 0;
      if (current <= 1) _navRequestCounts.delete(r._pageNavId);
      else _navRequestCounts.set(r._pageNavId, current - 1);
    }
    // Decrement provider count
    const pCount = _providerCounts[r.provider] ?? 0;
    if (pCount <= 1) delete _providerCounts[r.provider];
    else _providerCounts[r.provider] = pCount - 1;
  }

  // Clean up heavy data for pruned requests
  if (window._deleteHeavyData) {
    window._deleteHeavyData(removed.map((r) => r.id));
  }

  // Remove from DOM — batch to avoid layout thrashing
  const $list = DOM.list;
  if (!$list) return;

  const rows = $list.querySelectorAll('.req-row');
  const toRemove: Element[] = [];

  // First pass: collect rows to remove
  for (let i = 0; i < rows.length && toRemove.length < removeCount; i++) {
    const id = (rows[i] as HTMLElement).dataset.id;
    if (id && !state.hasRequest(id)) {
      toRemove.push(rows[i]);
    }
  }

  // Second pass: batch remove — appending to detached DocumentFragment
  // moves each row out of $list without triggering layout recalculation
  if (toRemove.length > 0) {
    const fragment = document.createDocumentFragment();
    for (const row of toRemove) {
      removeFromVisibleCache(row as HTMLElement);
      fragment.appendChild(row);
    }
    // Fragment is never appended anywhere — rows are permanently removed
    // and garbage collected along with the detached fragment
  }

  // Handle selected request if it was pruned
  const selectedId = state.getSelectedId();
  if (selectedId && !state.hasRequest(selectedId)) {
    state.setSelectedId(null);
    const detail = DOM.detail;
    if (detail) detail.classList.add('hidden');
    document.querySelectorAll('.req-row.active').forEach((r) => r.classList.remove('active'));

    // Clear divider selection indicators if active row was pruned
    document
      .querySelectorAll('.page-divider.section-active')
      .forEach((d) => d.classList.remove('section-active'));
    document
      .querySelectorAll('.page-divider.section-dimmed')
      .forEach((d) => d.classList.remove('section-dimmed'));
    document
      .querySelectorAll('.req-row.section-active')
      .forEach((r) => r.classList.remove('section-active'));
    document
      .querySelectorAll('.req-row.section-dimmed')
      .forEach((r) => r.classList.remove('section-dimmed'));
  }

  // Incremental stats: subtract removed request stats
  const stats = state.getStats();
  const visibleCount = Math.max(0, stats.visibleCount - removedVisible);
  const totalSize = Math.max(0, stats.totalSize - removedSize);
  const totalDuration = Math.max(0, stats.totalDuration - removedDuration);

  // Use incrementally maintained provider counts
  setProviderCounts(_providerCounts);

  // Update provider pill counts and group badges in DOM
  const groupList = DOM.providerGroupList;
  const pills = groupList?.querySelectorAll('.ppill') ?? [];
  pills.forEach((pill) => {
    const provider = (pill as HTMLElement).dataset.provider!;
    const count = _providerCounts[provider] || 0;
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
        total += _providerCounts[provider] || 0;
      });
      $badge.textContent = total > 0 ? String(total) : '';
    });
  }

  state.updateStats(visibleCount, totalSize, totalDuration);
  showPruneNotification(removeCount);

  // Clean up orphaned page dividers and update counts
  const list = DOM.list;
  if (list) {
    const navs = state.getPageNavigations();
    for (const nav of navs) {
      const count = _navRequestCounts.get(nav.id) ?? 0;
      if (count === 0) {
        const divider = list.querySelector(`.page-divider[data-nav-id="${nav.id}"]`);
        if (divider) divider.remove();
      } else {
        const countEl = list.querySelector(
          `.page-divider[data-nav-id="${nav.id}"] .page-divider-count`
        );
        if (countEl) countEl.textContent = String(count);
      }
    }
  }

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
        // Insert each row after its page divider (not blindly at top)
        const rows = Array.from(fragment.childNodes) as HTMLElement[];
        for (const row of rows) {
          const navId = (row as HTMLElement).dataset?.pageNavId;
          if (navId) {
            const divider = list.querySelector(`.page-divider[data-nav-id="${navId}"]`);
            if (divider?.nextSibling) {
              list.insertBefore(row, divider.nextSibling);
            } else {
              list.appendChild(row);
            }
          } else {
            // No page nav (shouldn't happen normally) — prepend
            list.insertBefore(row, list.firstChild);
          }
        }
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
    // Update page divider request counts
    updateDividerCounts();
  } catch (err) {
    // Clear pending queue to prevent stuck state — next request will restart the RAF chain
    state.clearPendingRequests();
    console.error('[TagDragon] Error flushing pending requests', err);
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

  // Reset incremental counts
  _navRequestCounts.clear();
  for (const k of Object.keys(_providerCounts)) delete _providerCounts[k];

  // Clear visible row cache after network clear
  clearVisibleCache();
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
    if (data._pageNavId) {
      _navRequestCounts.set(data._pageNavId, (_navRequestCounts.get(data._pageNavId) ?? 0) + 1);
    }
    _providerCounts[data.provider] = (_providerCounts[data.provider] ?? 0) + 1;

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

  // Update visible row cache after restoring persisted requests
  updateVisibleRowCache();

  const $networkBadge = DOM.tabBadgeNetwork;
  if ($networkBadge) $networkBadge.textContent = String(state.getAllRequests().length);

  // Reconstruct page dividers from persisted _pageNavId grouping
  const navIdGroups = new Map<string, { url: string; timestamp: string }>();
  for (const data of persisted) {
    if (data._pageNavId && data._pageUrl) {
      if (!navIdGroups.has(data._pageNavId)) {
        navIdGroups.set(data._pageNavId, {
          url: data._pageUrl,
          timestamp: data.timestamp,
        });
      }
    }
  }

  if (navIdGroups.size > 0) {
    const navEntries = [...navIdGroups.entries()];

    // Sort by timestamp to maintain correct order
    navEntries.sort((a, b) => a[1].timestamp.localeCompare(b[1].timestamp));

    for (const [navId, meta] of navEntries) {
      const nav: PageNavigation = {
        id: navId,
        url: meta.url,
        timestamp: meta.timestamp,
      };
      state.addPageNavigation(nav);
      const divider = createPageDivider(nav);

      // Find the first request row with this navId and insert divider before it
      const firstRow = list?.querySelector(`.req-row[data-page-nav-id="${navId}"]`);
      if (firstRow && list) {
        list.insertBefore(divider, firstRow);
      } else if (list) {
        list.appendChild(divider);
      }
    }

    updateDividerCounts();
  }
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

// ─── EXPORT HOSTNAME ──────────────────────────────────────────────────────────

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

    const metaCols = [
      'id',
      'timestamp',
      'page_url',
      'provider',
      'method',
      'status',
      'url',
      'duration',
      'size',
    ];
    const headers = [...metaCols, ...paramKeys];

    const rows = requests.map((r) => {
      const meta = [
        String(r.id),
        String(r.timestamp),
        String(r._pageUrl ?? ''),
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
    if (data._pageNavId) {
      _navRequestCounts.set(data._pageNavId, (_navRequestCounts.get(data._pageNavId) ?? 0) + 1);
    }
    _providerCounts[data.provider] = (_providerCounts[data.provider] ?? 0) + 1;
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
    console.error('[TagDragon] Error processing request', err);
  }
}

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────

function receivePageNavigation(nav: PageNavigation): void {
  state.addPageNavigation(nav);

  const $list = DOM.list;
  if (!$list) return;

  // Hide empty state if visible
  const $empty = DOM.empty;
  if ($empty) $empty.style.display = 'none';

  const divider = createPageDivider(nav);

  // Insert position based on sort order
  if (state.getConfig().sortOrder === 'desc') {
    // Desc: divider goes at top (new page requests will be prepended above it)
    $list.insertBefore(divider, $list.firstChild);
  } else {
    // Asc: divider goes at bottom (new page requests will be appended after it)
    $list.appendChild(divider);
  }

  updateDividerCounts();
  updateVisibleRowCache();
}

function updateDividerCounts(): void {
  const $list = DOM.list;
  if (!$list) return;

  const navs = state.getPageNavigations();
  for (const nav of navs) {
    const divider = $list.querySelector(`.page-divider[data-nav-id="${nav.id}"]`);
    if (!divider) continue;
    const count = _navRequestCounts.get(nav.id) ?? 0;
    const countEl = divider.querySelector('.page-divider-count');
    if (countEl) countEl.textContent = String(count);
  }
}

function initDividerInteractions(): void {
  const $list = DOM.list;
  if (!$list) return;

  $list.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const divider = target.closest('.page-divider') as HTMLElement;
    if (divider) {
      toggleCollapse(divider);
      e.stopPropagation();
    }
  });
}

function toggleCollapse(divider: HTMLElement): void {
  divider.classList.toggle('collapsed');

  const isCollapsed = divider.classList.contains('collapsed');
  const navId = divider.dataset.navId;
  if (!navId) return;

  const $list = DOM.list;
  if (!$list) return;

  // Find all req-rows belonging to this navigation by data attribute
  const rows = $list.querySelectorAll(`.req-row[data-page-nav-id="${navId}"]`);
  for (const row of rows) {
    if (isCollapsed) {
      row.classList.add('page-collapsed');
    } else {
      row.classList.remove('page-collapsed');
    }
  }

  updateVisibleRowCache();
}

// ─── INIT ────────────────────────────────────────────────────────────────────

export function initNetworkController(): void {
  window.receiveRequest = receiveRequest;
  window.flushPendingRequests = flushPendingRequests;
  window.receivePageNavigation = receivePageNavigation;
  initDividerInteractions();
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export { clearNetworkData, getExportRequests, exportCsv, restorePersistedRequests };
