// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v3.0 - PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';

import * as state from './state';
import * as dlState from './datalayer/state';
import { DOM } from './utils/dom';
import { getEventName, formatBytes } from './utils/format';
import { createRequestRow, navigateList, navigateToEdge, updateRowVisibility } from './components/request-list';
import { selectRequest, initTabHandlers, closeDetailPane, clearTabCache } from './components/detail-pane';
import { updateStatusBar } from './components/status-bar';
import { ensureProviderPill, initProviderBarHandlers, updateProviderCounts, updateFilterBarVisibility } from './components/provider-bar';
import { initFilterPopoverHandlers, updateActiveFilters } from './components/filter-bar';
import { initAdobeEnvSwitcher } from './components/adobe-env-switcher';
import { initConsentPanel, clearAllCookies, clearConsentOverride } from './components/consent-panel';
import { initInfoPopover, closeInfoPopover } from './components/info-popover';
import { applyFilters, matchesFilter } from './utils/filter';
import { createDlPushRow, getSourceColor, setActiveDlRow, updateDlStatusText, dlMatchesFilter, exportDlJson, exportDlCsv } from './datalayer/push-list';
import { selectDlPush, closeDlDetail, initDlDetailTabHandlers } from './datalayer/push-detail';
import { initTheme } from './theme';

// ─── LOCAL HELPERS ───────────────────────────────────────────────────────────

/**
 * Pre-index a request for fast filtering and display.
 * Computes _searchIndex, _eventName, _hasUserId, _statusPrefix once.
 */
function indexRequest(data: ParsedRequest, getEventNameFn: (d: ParsedRequest) => string): void {
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

  if (getEventNameFn) {
    data._eventName = getEventNameFn(data);
  }

  data._hasUserId = !!(
    data.decoded?.client_id ||
    data.decoded?.['Client ID'] ||
    data.allParams?.cid ||
    data.allParams?.uid ||
    data.allParams?.user_id ||
    data.allParams?.client_id
  );

  data._statusPrefix = data.status ? String(data.status)[0] : null;
}

/**
 * Update the status bar with DataLayer-specific info.
 */
function updateDlStatusBar(): void {
  const $statusText = DOM.statusText;
  if (!$statusText) return;

  const visible = dlState.getDlVisibleCount();
  const total = dlState.getDlTotalCount();
  const pushes = dlState.getAllDlPushes();
  const parts = [`${visible} / ${total} pushes`];

  const ecCount = pushes.filter(p => p._ecommerceType).length;
  if (ecCount > 0) {
    parts.push(`${ecCount} e-commerce`);
  }

  $statusText.textContent = parts.join(' · ');
  $statusText.style.color = '';
}

/**
 * Show prune notification in status bar.
 */
let pruneNotificationTimer: ReturnType<typeof setTimeout>;

function showPruneNotification(count: number): void {
  const $statusText = DOM.statusText;
  if (!$statusText) return;

  const visibleCount = state.getStatsVisibleCount();
  const totalSize = state.getStatsTotalSize();
  const totalDuration = state.getStatsTotalDuration();
  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  const allRequests = state.getAllRequests();

  $statusText.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'} · (${count} oldest removed)`;
  $statusText.style.color = 'var(--orange)';

  clearTimeout(pruneNotificationTimer);
  pruneNotificationTimer = setTimeout(() => {
    $statusText.style.color = '';
    updateStatusBar(visibleCount, totalSize, totalDuration);
  }, 3000);
}

function clearPruneTimer(): void {
  clearTimeout(pruneNotificationTimer);
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
    window._deleteHeavyData(removed.map(r => r.id));
  }

  // Remove from DOM
  const $list = DOM.list;
  if (!$list) return;

  const rows = $list.querySelectorAll('.req-row');
  let domRemoved = 0;
  for (let i = 0; i < rows.length && domRemoved < removeCount; i++) {
    const id = rows[i].dataset.id;
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

  // Update provider counts
  updateProviderCounts();

  // Recalculate stats
  let visibleCount = 0;
  let totalSize = 0;
  let totalDuration = 0;
  const filteredIds = state.getFilteredIds();
  for (const r of state.getAllRequests()) {
    if (filteredIds.has(String(r.id))) {
      visibleCount++;
      totalSize += r.size || 0;
      totalDuration += r.duration || 0;
    }
  }
  state.updateStats(visibleCount, totalSize, totalDuration);
  showPruneNotification(removeCount);
}

// ─── BATCHED RENDERING ───────────────────────────────────────────────────────

function flushPendingRequests(): void {
  state.setRafId(null);
  if (state.getPendingRequests().length === 0) return;

  const empty = DOM.empty;
  if (empty) empty.style.display = 'none';

  const fragment = document.createDocumentFragment();
  for (const { data, isVisible } of state.getPendingRequests()) {
    ensureProviderPill(data, doApplyFilters, doUpdateActiveFilters);
    const row = createRequestRow(data, isVisible);
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
}

// ─── CALLBACKS ───────────────────────────────────────────────────────────────

function doApplyFilters(): void {
  applyFilters(updateRowVisibility, updateStatusBar);
}

function doUpdateActiveFilters(): void {
  updateActiveFilters(doApplyFilters);
}

function doSelectRequest(data: ParsedRequest, row: HTMLElement): void {
  selectRequest(data, row);
}

// ─── VIEW SWITCHING ───────────────────────────────────────────────────────────

let activeView: 'network' | 'datalayer' = 'network';

function switchView(view: 'network' | 'datalayer'): void {
  activeView = view;

  // Toggle context toolbars
  const $networkCtx = DOM.networkContext;
  const $dlCtx = DOM.datalayerContext;
  if ($networkCtx) $networkCtx.style.display = view === 'network' ? '' : 'none';
  if ($dlCtx) $dlCtx.style.display = view === 'datalayer' ? '' : 'none';

  // Toggle main views
  const $main = DOM.main;
  const $dlView = DOM.dlView;
  if ($main) $main.style.display = view === 'network' ? '' : 'none';
  if ($dlView) $dlView.style.display = view === 'datalayer' ? 'block' : 'none';

  // Toggle filter bars
  const $filterBar = DOM.filterBar;
  const $dlFilterBar = DOM.dlFilterBar;
  if ($filterBar) $filterBar.style.display = view === 'network' ? '' : 'none';
  if ($dlFilterBar) $dlFilterBar.style.display = view === 'datalayer' ? '' : 'none';

  // Update tab buttons
  document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
    (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset['view'] === view);
  });

  // Update status bar
  if (view === 'network') {
    const stats = state.getStats();
    updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);
  } else {
    updateDlStatusBar();
  }
}

// ─── DATALAYER CLEAR ──────────────────────────────────────────────────────────

function dlClearAll(): void {
  dlState.clearDlPushes();
  dlState.clearDlFilteredIds();

  const $list = DOM.dlPushList;
  if ($list) $list.innerHTML = '';

  const $empty = DOM.dlEmptyState;
  if ($empty) $empty.style.display = '';

  closeDlDetail();
  updateDlStatusText(0, 0);

  const $dlBadge = DOM.tabBadgeDatalayer;
  if ($dlBadge) $dlBadge.textContent = '0';

  const $count = document.getElementById('dl-push-count');
  if ($count) $count.textContent = '0 pushes';
}

// ─── DATALAYER FILTER ─────────────────────────────────────────────────────────

function dlApplyFilter(): void {
  const text = dlState.getDlFilterText();
  dlState.clearDlFilteredIds();

  for (const push of dlState.getAllDlPushes()) {
    if (dlMatchesFilter(push, text, dlState.getDlFilterSource(), dlState.getDlFilterEventName(), dlState.getDlFilterHasKey(), dlState.getDlEcommerceOnly())) {
      dlState.addDlFilteredId(push.id);
    }
  }

  const $list = DOM.dlPushList;
  if ($list) {
    $list.querySelectorAll('.dl-push-row').forEach((row) => {
      const id = Number((row as HTMLElement).dataset['id']);
      (row as HTMLElement).style.display = dlState.getDlFilteredIds().has(id) ? '' : 'none';
    });
  }

  const $empty = DOM.dlEmptyState;
  if ($empty) {
    $empty.style.display = dlState.getDlVisibleCount() === 0 && dlState.getDlTotalCount() === 0 ? '' : 'none';
  }

  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());
}

// ─── DATALAYER RECEIVERS ──────────────────────────────────────────────────────

window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (dlState.getDlIsPaused()) return;

  // Compute cumulative state
  const allPushes = dlState.getAllDlPushes();
  const prevState = allPushes.length > 0 ? allPushes[allPushes.length - 1].cumulativeState : {};
  const cumulativeState: Record<string, unknown> = { ...prevState };
  for (const [k, v] of Object.entries(push.data)) {
    cumulativeState[k] = v;
  }

  const enrichedPush: DataLayerPush = {
    ...push,
    cumulativeState,
    diffFromPrevious: null,
    _eventName: push._eventName ?? (typeof push.data['event'] === 'string' ? push.data['event'] : undefined),
    sourceLabel: push.sourceLabel || push.source.toUpperCase(),
  };

  dlState.addDlPush(enrichedPush);

  const filterText = dlState.getDlFilterText();
  const isVisible = dlMatchesFilter(enrichedPush, filterText, dlState.getDlFilterSource(), dlState.getDlFilterEventName(), dlState.getDlFilterHasKey(), dlState.getDlEcommerceOnly());
  if (isVisible) dlState.addDlFilteredId(push.id);

  // Render row synchronously — avoids RAF throttling (DevTools window may be in background
  // when user reloads the page, causing requestAnimationFrame to never fire)
  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if ($empty && dlState.getDlTotalCount() > 0) {
    $empty.style.display = 'none';
  }
  if ($list) {
    try {
      const row = createDlPushRow(enrichedPush, isVisible, (p, r) => {
        dlState.setDlSelectedId(p.id);
        setActiveDlRow(r);
        selectDlPush(p, r, (reqId) => {
          switchView('network');

          const reqData = state.getRequestMap().get(String(reqId));
          if (!reqData) return;

          const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
          if (!row) return;

          // Make row visible if hidden by filter or provider filter
          if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
            row.classList.remove('filtered-out', 'provider-hidden');
            row.style.display = '';
          }

          selectRequest(reqData, row);
        });
      });
      $list.appendChild(row);
    } catch (e) {
      console.warn('[TagDragon] Failed to create push row:', e);
    }
  }
  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());

  // Update datalayer tab badge
  const $dlBadge = DOM.tabBadgeDatalayer;
  if ($dlBadge) $dlBadge.textContent = String(dlState.getDlTotalCount());
  const $count = document.getElementById('dl-push-count');
  if ($count) {
    const n = dlState.getDlTotalCount();
    $count.textContent = `${n} push${n !== 1 ? 'es' : ''}`;
  }
};

window.receiveDataLayerSources = function (sources: DataLayerSource[], labels: Record<DataLayerSource, string>): void {
  sources.forEach((s) => dlState.addDlSource(s));
  const $status = document.getElementById('dl-source-status');
  if (!$status) return;
  $status.innerHTML = '';
  sources.forEach((s) => {
    const pill = document.createElement('span');
    pill.className = 'dl-source-pill';
    pill.textContent = labels[s] ?? s.toUpperCase();
    pill.style.setProperty('--pill-color', getSourceColor(s));
    $status.appendChild(pill);
  });
};

window.receiveDataLayerSnapshot = function (_data: Record<string, unknown>): void {
  // Future use: snapshot-based state update
};

window.clearDataLayer = function (): void {
  const $status = document.getElementById('dl-source-status');
  if ($status) $status.innerHTML = '';
  dlClearAll();
};

// ─── ENTRY POINT (from devtools.js) ──────────────────────────────────────────

window.receiveRequest = function (data: ParsedRequest): void {
  try {
    if (state.getIsPaused()) return;

    // Index and store
    indexRequest(data, getEventName);
    state.addRequest(data);

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
};

// ─── SPLITTER DRAG ───────────────────────────────────────────────────────────

let isDragging = false;

function initSplitter(): void {
  const $splitter = DOM.splitter;
  const $main = DOM.main;
  if (!$splitter || !$main) return;

  $splitter.addEventListener('mousedown', (e: Event) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    (e as MouseEvent).preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const width = Math.max(280, Math.min(e.clientX, window.innerWidth - 300));
    $main.style.gridTemplateColumns = `${width}px 4px 1fr`;
    localStorage.setItem('rt-list-width', String(width));
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Restore saved width
  const savedWidth = localStorage.getItem('rt-list-width');
  if (savedWidth) {
    $main.style.gridTemplateColumns = `${savedWidth}px 4px 1fr`;
  }
}

// ─── KEYBOARD NAVIGATION ─────────────────────────────────────────────────────

function initKeyboardHandlers(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+L = clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      if (activeView === 'network') {
        document.getElementById('btn-clear')?.click();
      } else {
        document.getElementById('dl-btn-clear')?.click();
      }
      return;
    }

    // Ctrl+F = focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      if (activeView === 'network') {
        DOM.filterInput?.focus();
      } else {
        DOM.dlFilterInput?.focus();
      }
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      if (DOM.filterPopover?.classList.contains('visible')) return;
      if (document.activeElement === DOM.filterInput) {
        state.setFilterText('');
        if (DOM.filterInput) DOM.filterInput.value = '';
        DOM.filterInput?.blur();
        doApplyFilters();
        doUpdateActiveFilters();
      } else if (!DOM.detail?.classList.contains('hidden')) {
        closeDetailPane();
      }
      return;
    }

    // Arrow keys for list navigation
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
        document.activeElement !== DOM.filterInput) {
      e.preventDefault();
      navigateList(e.key === 'ArrowDown' ? 1 : -1, doSelectRequest);
      return;
    }

    // Home/End
    if (e.key === 'Home' && document.activeElement !== DOM.filterInput) {
      e.preventDefault();
      navigateToEdge('first', doSelectRequest);
      return;
    }
    if (e.key === 'End' && document.activeElement !== DOM.filterInput) {
      e.preventDefault();
      navigateToEdge('last', doSelectRequest);
      return;
    }
  });
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

function exportCsv(): void {
  const requests = state.getAllRequests();
  if (requests.length === 0) return;

  const allKeys = new Set<string>();
  requests.forEach(r => Object.keys(r.allParams || {}).forEach(k => allKeys.add(k)));
  const paramKeys = [...allKeys].sort();

  const metaCols = ['id', 'timestamp', 'provider', 'method', 'status', 'url', 'duration', 'size'];
  const headers = [...metaCols, ...paramKeys];

  const escCsv = (v: unknown): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows = requests.map(r => {
    const meta = [r.id, r.timestamp, r.provider, r.method, r.status, r.url, r.duration ?? '', r.size ?? ''];
    const params = paramKeys.map(k => r.allParams?.[k] ?? '');
    return [...meta, ...params].map(escCsv).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `requests-${Date.now()}.csv`;
  a.click();
}

// ─── TOOLBAR EVENTS ──────────────────────────────────────────────────────────

function initToolbarHandlers(): void {
  const btnClear = document.getElementById('btn-clear');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnExport = document.getElementById('btn-export');
  const btnClearCookies = document.getElementById('btn-clear-cookies');
  const btnSettings = document.getElementById('btn-settings');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  // Clear button
  btnClear?.addEventListener('click', () => {
    state.clearRequests();
    state.resetFilters();
    state.resetProviders();
    state.resetStats();
    state.clearPendingRequests();

    const rafId = state.getRafId();
    if (rafId) {
      cancelAnimationFrame(rafId);
      state.setRafId(null);
    }

    if (DOM.filterInput) DOM.filterInput.value = '';

    const clearFilter = DOM.clearFilter;
    if (clearFilter) clearFilter.style.display = 'none';

    const list = DOM.list;
    if (list) {
      list.innerHTML = '';
      const empty = DOM.empty;
      if (empty) list.appendChild(empty);
    }

    const empty = DOM.empty;
    if (empty) empty.style.display = '';

    const detail = DOM.detail;
    if (detail) detail.classList.add('hidden');

    const groupList = DOM.providerGroupList;
    if (groupList) groupList.innerHTML = '';

    const searchInput = DOM.providerSearchInput;
    if (searchInput) searchInput.value = '';

    const filters = DOM.activeFilters;
    if (filters) filters.innerHTML = '';

    clearPruneTimer();
    clearTabCache();

    if (window._clearHeavyData) window._clearHeavyData();

    DOM.providerPopover?.classList.remove('visible');
    DOM.btnProviders?.classList.remove('active');

    const filterBar = DOM.filterBar;
    if (filterBar) filterBar.classList.remove('visible');

    updateStatusBar(0, 0, 0);
    updateFilterBarVisibility();
  });

  // Pause button
  const btnPause = document.getElementById('btn-pause');
  btnPause?.addEventListener('click', () => {
    const isPaused = !state.getIsPaused();
    state.setIsPaused(isPaused);
    document.body.classList.toggle('paused', isPaused);
    btnPause.classList.toggle('active', isPaused);
    (btnPause.querySelector('.pause-icon') as HTMLElement).style.display = isPaused ? 'none' : '';
    (btnPause.querySelector('.play-icon') as HTMLElement).style.display = isPaused ? '' : 'none';
    (btnPause.querySelector('.pause-text') as HTMLElement).style.display = isPaused ? 'none' : '';
    (btnPause.querySelector('.play-text') as HTMLElement).style.display = isPaused ? '' : 'none';
    btnPause.title = isPaused ? 'Resume capture' : 'Pause capture';
  });

  // Search input
  let filterTimer: ReturnType<typeof setTimeout>;
  DOM.filterInput?.addEventListener('input', (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    state.setFilterText(value);
    const clearFilter = DOM.clearFilter;
    if (clearFilter) {
      clearFilter.style.display = value ? 'flex' : 'none';
    }
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      doApplyFilters();
      doUpdateActiveFilters();
    }, 150);
  });

  DOM.clearFilter?.addEventListener('click', () => {
    state.setFilterText('');
    if (DOM.filterInput) DOM.filterInput.value = '';
    const clearFilter = DOM.clearFilter;
    if (clearFilter) clearFilter.style.display = 'none';
    doApplyFilters();
    doUpdateActiveFilters();
  });

  const clearFilter = DOM.clearFilter;
  if (clearFilter) clearFilter.style.display = 'none';

  // Close detail button
  btnCloseDetail?.addEventListener('click', () => {
    closeDetailPane();
  });

  // Export button
  btnExport?.addEventListener('click', () => {
    if (state.getConfig().exportFormat === 'csv') {
      exportCsv();
    } else {
      const blob = new Blob([JSON.stringify(state.getAllRequests(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `requests-${Date.now()}.json`;
      a.click();
    }
  });

  // Clear cookies button
  btnClearCookies?.addEventListener('click', async () => {
    const originalTitle = btnClearCookies.title;
    btnClearCookies.disabled = true;
    btnClearCookies.title = 'Deleting...';
    try {
      const count = await clearAllCookies();
      await clearConsentOverride();
      btnClearCookies.title = `Deleted ${count} cookies`;
      setTimeout(() => {
        btnClearCookies.title = originalTitle;
        btnClearCookies.disabled = false;
      }, 2000);
    } catch {
      btnClearCookies.title = 'Error';
      setTimeout(() => {
        btnClearCookies.title = originalTitle;
        btnClearCookies.disabled = false;
      }, 2000);
    }
  });

  // Settings popover
  btnSettings?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    DOM.settingsPopover?.classList.toggle('visible');
    DOM.providerPopover?.classList.remove('visible');
    DOM.consentPopover?.classList.remove('visible');
    closeInfoPopover();
  });

  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (!DOM.settingsPopover?.contains(target) && !target.closest('#btn-settings')) {
      DOM.settingsPopover?.classList.remove('visible');
    }
    if (!DOM.providerPopover?.contains(target) && !target.closest('#btn-providers')) {
      DOM.providerPopover?.classList.remove('visible');
    }
    if (!DOM.infoPopover?.contains(target) && !target.closest('#btn-info')) {
      closeInfoPopover();
    }
  });

  // Provider popover
  const btnProviders = document.getElementById('btn-providers');
  btnProviders?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    DOM.providerPopover?.classList.toggle('visible');
    DOM.settingsPopover?.classList.remove('visible');
    DOM.consentPopover?.classList.remove('visible');
    closeInfoPopover();
  });

  // Reset filters button
  btnResetFilters?.addEventListener('click', () => {
    state.resetFilters();
    state.clearHiddenProviders();
    state.syncHiddenProviders();
    if (DOM.filterInput) DOM.filterInput.value = '';
    const clearFilter = DOM.clearFilter;
    if (clearFilter) clearFilter.style.display = 'none';
    document.querySelectorAll('.ppill.inactive').forEach((p) => p.classList.replace('inactive', 'active'));
    DOM.btnProviders?.classList.remove('active');
    doApplyFilters();
    doUpdateActiveFilters();
    DOM.settingsPopover?.classList.remove('visible');
  });
}

// ─── QUICK ACTIONS ───────────────────────────────────────────────────────────

function applyWrapValuesClass(): void {
  document.body.classList.toggle('wrap-values', state.getConfig().wrapValues);
}

function applyCompactRowsClass(): void {
  document.body.classList.toggle('compact-rows', state.getConfig().compactRows);
}

function syncQuickButtons(): void {
  const sortBtn = document.getElementById('btn-quick-sort');
  const wrapBtn = document.getElementById('btn-quick-wrap');
  const expandBtn = document.getElementById('btn-quick-expand');
  const compactBtn = document.getElementById('btn-quick-compact');
  const cfg = state.getConfig();

  if (sortBtn) {
    sortBtn.classList.toggle('active', cfg.sortOrder === 'desc');
    sortBtn.title = cfg.sortOrder === 'desc' ? 'Newest first (click for oldest first)' : 'Oldest first (click for newest first)';
  }
  if (wrapBtn) {
    wrapBtn.classList.toggle('active', cfg.wrapValues);
    wrapBtn.title = cfg.wrapValues ? 'Wrap values: on' : 'Wrap values: off';
  }
  if (expandBtn) {
    expandBtn.classList.toggle('active', cfg.autoExpand);
    expandBtn.title = cfg.autoExpand ? 'Auto-expand: on' : 'Auto-expand: off';
  }
  if (compactBtn) {
    compactBtn.classList.toggle('active', cfg.compactRows);
    compactBtn.title = cfg.compactRows ? 'Compact list: on' : 'Compact list: off';
  }
}

function initQuickActions(): void {
  document.getElementById('btn-quick-sort')?.addEventListener('click', () => {
    const next = state.getConfig().sortOrder === 'asc' ? 'desc' : 'asc';
    state.updateConfig('sortOrder', next);
    syncQuickButtons();
  });

  document.getElementById('btn-quick-wrap')?.addEventListener('click', () => {
    state.updateConfig('wrapValues', !state.getConfig().wrapValues);
    applyWrapValuesClass();
    syncQuickButtons();
  });

  document.getElementById('btn-quick-expand')?.addEventListener('click', () => {
    state.updateConfig('autoExpand', !state.getConfig().autoExpand);
    syncQuickButtons();
  });

  document.getElementById('btn-quick-compact')?.addEventListener('click', () => {
    state.updateConfig('compactRows', !state.getConfig().compactRows);
    applyCompactRowsClass();
    syncQuickButtons();
  });
}

// ─── CONFIG UI ───────────────────────────────────────────────────────────────

function initConfigUI(): void {
  const cfgMaxEl = document.getElementById('cfg-max-requests') as HTMLInputElement | null;
  const cfgPruneEl = document.getElementById('cfg-auto-prune') as HTMLInputElement | null;

  if (cfgMaxEl) {
    cfgMaxEl.value = String(state.getConfig().maxRequests);
    cfgMaxEl.addEventListener('change', (e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10) || 0;
      state.updateConfig('maxRequests', value);
      pruneIfNeeded();
    });
  }

  if (cfgPruneEl) {
    cfgPruneEl.checked = state.getConfig().autoPrune;
    cfgPruneEl.addEventListener('change', (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      state.updateConfig('autoPrune', checked);
    });
  }

  const cfgSortEl = document.getElementById('cfg-sort-order') as HTMLSelectElement | null;
  if (cfgSortEl) {
    cfgSortEl.value = state.getConfig().sortOrder;
    cfgSortEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      state.updateConfig('sortOrder', value);
      syncQuickButtons();
    });
  }

  const cfgWrapEl = document.getElementById('cfg-wrap-values') as HTMLInputElement | null;
  if (cfgWrapEl) {
    cfgWrapEl.checked = state.getConfig().wrapValues;
    cfgWrapEl.addEventListener('change', (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      state.updateConfig('wrapValues', checked);
      applyWrapValuesClass();
      syncQuickButtons();
    });
  }

  const cfgExpandEl = document.getElementById('cfg-auto-expand') as HTMLInputElement | null;
  if (cfgExpandEl) {
    cfgExpandEl.checked = state.getConfig().autoExpand;
    cfgExpandEl.addEventListener('change', (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      state.updateConfig('autoExpand', checked);
      syncQuickButtons();
    });
  }

  const cfgDefaultTabEl = document.getElementById('cfg-default-tab') as HTMLSelectElement | null;
  if (cfgDefaultTabEl) {
    cfgDefaultTabEl.value = state.getConfig().defaultTab;
    cfgDefaultTabEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      state.updateConfig('defaultTab', value);
    });
  }

  const cfgCompactEl = document.getElementById('cfg-compact-rows') as HTMLInputElement | null;
  if (cfgCompactEl) {
    cfgCompactEl.checked = state.getConfig().compactRows;
    cfgCompactEl.addEventListener('change', (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      state.updateConfig('compactRows', checked);
      applyCompactRowsClass();
    });
  }

  const cfgTimestampEl = document.getElementById('cfg-timestamp-format') as HTMLSelectElement | null;
  if (cfgTimestampEl) {
    cfgTimestampEl.value = state.getConfig().timestampFormat;
    cfgTimestampEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      state.updateConfig('timestampFormat', value);
    });
  }

  const cfgExportFmtEl = document.getElementById('cfg-export-format') as HTMLSelectElement | null;
  if (cfgExportFmtEl) {
    cfgExportFmtEl.value = state.getConfig().exportFormat;
    cfgExportFmtEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      state.updateConfig('exportFormat', value);
    });
  }
}

// ─── CATEGORY TOGGLE ─────────────────────────────────────────────────────────

function initCategoryToggle(): void {
  document.addEventListener('click', (e: Event) => {
    const header = (e.target as HTMLElement).closest('.category-header');
    if (!header) return;

    header.classList.toggle('collapsed');
    const content = header.nextElementSibling;
    if (content && content.classList.contains('category-content')) {
      content.classList.toggle('collapsed');
    }

    // Persist collapsed state
    const catKey = header.closest('.category-section')?.dataset.category;
    if (catKey) {
      const isNowCollapsed = header.classList.contains('collapsed');
      const current = new Set(state.getConfig().collapsedGroups);
      if (isNowCollapsed) current.add(catKey);
      else current.delete(catKey);
      state.updateConfig('collapsedGroups', [...current]);
    }
  });
}

// ─── COPY TO CLIPBOARD ───────────────────────────────────────────────────────

function initCopyHandler(): void {
  document.addEventListener('click', (e: Event) => {
    const copyBtn = (e.target as HTMLElement).closest('.param-copy-btn');
    if (!copyBtn) return;

    const value = (copyBtn as HTMLElement).dataset.copy;
    if (!value) return;

    navigator.clipboard
      .writeText(value)
      .then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 800);
      })
      .catch((err) => console.error('Copy failed:', err));
  });
}

// ─── REQUEST LIST CLICK ──────────────────────────────────────────────────────

function initRequestListHandler(): void {
  DOM.list?.addEventListener('click', (e: Event) => {
    const row = (e.target as HTMLElement).closest('.req-row');
    if (!row) return;
    const id = (row as HTMLElement).dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (data) selectRequest(data, row as HTMLElement);
  });
}

// ─── DATALAYER HANDLERS ───────────────────────────────────────────────────────

function initDatalayerHandlers(): void {
  // View switching
  document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset['view'] as 'network' | 'datalayer';
      if (view) switchView(view);
    });
  });

  // DL Clear button
  document.getElementById('dl-btn-clear')?.addEventListener('click', dlClearAll);

  // DL Pause button
  const $dlPause = document.getElementById('dl-btn-pause');
  $dlPause?.addEventListener('click', () => {
    const isPaused = !dlState.getDlIsPaused();
    dlState.setDlIsPaused(isPaused);
    $dlPause.classList.toggle('active', isPaused);
    ($dlPause.querySelector('.pause-icon') as HTMLElement).style.display = isPaused ? 'none' : '';
    ($dlPause.querySelector('.play-icon') as HTMLElement).style.display = isPaused ? '' : 'none';
    ($dlPause.querySelector('.pause-text') as HTMLElement).style.display = isPaused ? 'none' : '';
    ($dlPause.querySelector('.play-text') as HTMLElement).style.display = isPaused ? '' : 'none';
    $dlPause.title = isPaused ? 'Resume DataLayer capture' : 'Pause DataLayer capture';
  });

  // DL active filter pills
  function updateDlActiveFilters(): void {
    const $bar = document.getElementById('dl-filter-bar');
    if (!$bar) return;
    $bar.innerHTML = '';

    const pills: { label: string; onRemove: () => void }[] = [];

    const text = dlState.getDlFilterText();
    const $dlInput = DOM.dlFilterInput;
    const $dlClearBtn = document.getElementById('dl-clear-filter');

    if (text) {
      pills.push({
        label: `"${text}"`,
        onRemove: () => {
          dlState.setDlFilterText('');
          if ($dlInput) $dlInput.value = '';
          if ($dlClearBtn) $dlClearBtn.style.display = 'none';
          dlApplyFilter();
          updateDlActiveFilters();
        },
      });
    }

    const src = dlState.getDlFilterSource();
    const srcLabels: Record<string, string> = { gtm: 'GTM', digitalData: 'W3C', tealium: 'Tealium', adobe: 'Adobe', segment: 'Segment' };
    if (src) {
      pills.push({
        label: `Source: ${srcLabels[src] ?? src}`,
        onRemove: () => {
          dlState.setDlFilterSource('');
          const $sel = document.getElementById('dl-filter-source');
          if ($sel) $sel.value = '';
          dlApplyFilter();
          updateDlActiveFilters();
        },
      });
    }

    pills.forEach((p) => {
      const el = document.createElement('span');
      el.className = 'filter-pill filter-pill--search';
      el.innerHTML = `<span class="filter-pill-label" style="font-size:11px">${p.label}</span><span class="filter-pill-remove" style="margin-left:4px;cursor:pointer;opacity:0.6">&times;</span>`;
      el.querySelector('.filter-pill-remove')?.addEventListener('click', p.onRemove);
      $bar.appendChild(el);
    });

    $bar.classList.toggle('visible', pills.length > 0);
  }

  // DL filter input
  const $dlInput = DOM.dlFilterInput;
  const $dlClearBtn = document.getElementById('dl-clear-filter');
  if ($dlInput) {
    $dlInput.addEventListener('input', () => {
      const hasText = $dlInput.value.length > 0;
      if ($dlClearBtn) $dlClearBtn.style.display = hasText ? '' : 'none';
      dlState.setDlFilterText($dlInput.value);
      dlApplyFilter();
      updateDlActiveFilters();
    });
  }

  // DL clear filter button (✕ inside filter input)
  $dlClearBtn?.addEventListener('click', () => {
    if ($dlInput) $dlInput.value = '';
    $dlClearBtn.style.display = 'none';
    dlState.setDlFilterText('');
    dlApplyFilter();
    updateDlActiveFilters();
  });

  // DL source filter select
  const $dlSourceSelect = document.getElementById('dl-filter-source') as HTMLSelectElement | null;
  $dlSourceSelect?.addEventListener('change', () => {
    dlState.setDlFilterSource($dlSourceSelect.value);
    dlApplyFilter();
    updateDlActiveFilters();
  });

  // DL E-commerce toggle button
  document.getElementById('dl-ecommerce-toggle')?.addEventListener('click', () => {
    const current = dlState.getDlEcommerceOnly();
    dlState.setDlEcommerceOnly(!current);
    dlApplyFilter();
    updateDlActiveFilters();
    document.getElementById('dl-ecommerce-toggle')?.classList.toggle('active', !current);
    updateDlStatusBar();
  });

  // DL Export button — respects AppConfig.exportFormat (json or csv), exports only visible pushes
  document.getElementById('dl-btn-export')?.addEventListener('click', () => {
    const filteredIds = dlState.getDlFilteredIds();
    const pushes = dlState.getAllDlPushes().filter(p => filteredIds.has(p.id));
    const fmt = state.getConfig().exportFormat;
    if (fmt === 'csv') exportDlCsv(pushes);
    else exportDlJson(pushes);
  });

  // DL Re-inject button (shown in empty state)
  document.getElementById('dl-btn-reinject')?.addEventListener('click', () => {
    window['triggerReinject']?.();
  });

  // DL Detail close button
  document.getElementById('dl-detail-close')?.addEventListener('click', () => {
    closeDlDetail();
    dlState.setDlSelectedId(null);
  });

  // DL Detail tab handlers
  const currentPushGetter = (): DataLayerPush | null => {
    const id = dlState.getDlSelectedId();
    if (id == null) return null;
    return dlState.getDlPushById(id) ?? null;
  };
  initDlDetailTabHandlers(currentPushGetter, (reqId) => {
    switchView('network');

    const reqData = state.getRequestMap().get(String(reqId));
    if (!reqData) return;

    const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
    if (!row) return;

    // Make row visible if hidden by filter or provider filter
    if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
      row.classList.remove('filtered-out', 'provider-hidden');
      row.style.display = '';
    }

    selectRequest(reqData, row);
  });

  // DL Splitter drag
  const $dlSplitter = DOM.dlSplitter;
  const $dlMain = DOM.dlMain;
  if ($dlSplitter && $dlMain) {
    let isDragging = false;
    $dlSplitter.addEventListener('mousedown', (e: Event) => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      (e as MouseEvent).preventDefault();
    });
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      const width = Math.max(240, Math.min(e.clientX, window.innerWidth - 280));
      $dlMain.style.gridTemplateColumns = `${width}px 6px 1fr`;
      localStorage.setItem('rt-dl-list-width', String(width));
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
    const savedWidth = localStorage.getItem('rt-dl-list-width');
    if (savedWidth) {
      $dlMain.style.gridTemplateColumns = `${savedWidth}px 6px 1fr`;
    }
  }
}

// ─── INITIALIZE ──────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Load config first
  await state.loadConfig();
  await initTheme();

  // Initialize all handlers
  initTabHandlers();
  initProviderBarHandlers(doApplyFilters, doUpdateActiveFilters);
  initFilterPopoverHandlers(doApplyFilters, doUpdateActiveFilters);
  initToolbarHandlers();
  initKeyboardHandlers();
  initSplitter();
  initConfigUI();
  initQuickActions();
  syncQuickButtons();
  applyWrapValuesClass();
  initCategoryToggle();
  initCopyHandler();
  initRequestListHandler();
  applyCompactRowsClass();

  // Initialize Adobe env switcher
  initAdobeEnvSwitcher();

  // Initialize Consent Panel
  void initConsentPanel();

  // Initialize Info Popover
  initInfoPopover();

  // Initialize DataLayer handlers
  initDatalayerHandlers();
}

// Start initialization
init();
