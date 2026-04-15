// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v3.0 - PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';

import * as state from './state';
import * as dlState from './datalayer/state';
import { DOM } from './utils/dom';
import { getEventName, esc } from './utils/format';
import { createRequestRow, updateRowVisibility } from './components/request-list';
import {
  selectRequest,
  initTabHandlers,
  closeDetailPane,
  clearTabCache,
} from './components/detail-pane';
import {
  updateStatusBar,
  updateDlStatusBar,
  updateNetworkStatusBar,
  showPruneNotification,
  clearPruneTimer,
  resetStatusBar,
  initTimestampToggle,
} from './components/status-bar';
import {
  ensureProviderPill,
  initProviderBar,
  updateProviderCounts,
} from './components/provider-bar';
import { updateActiveFilters } from './components/filter-bar';
import { initAdobeEnvSwitcher } from './components/adobe-env-switcher';
import {
  initConsentPanel,
  clearAllCookies,
  clearConsentOverride,
} from './components/consent-panel';
import { initInfoPopover, closeInfoPopover } from './components/info-popover';
import {
  initSettingsDrawer,
  toggleSettings,
  syncSettingsControl,
} from './components/settings-drawer';
import {
  initDlFilterPopover,
  toggleDlFilterPopover,
  closeDlFilterPopover,
} from './components/dl-filter-popover';
import {
  initProviderFilterPopover,
  toggleProviderFilter,
  closeProviderFilter,
} from './components/provider-filter-popover';
import { applyFilters, matchesFilter } from './utils/filter';
import { downloadCsv, downloadJson } from './utils/export';
import {
  createDlPushRow,
  getSourceColor,
  setActiveDlRow,
  dlMatchesFilter,
  exportDlJson,
  exportDlCsv,
  updateDlRowValidation,
  getSortedDlPushIds,
  renderGroupedPushList,
  invalidateDlSortCache,
} from './datalayer/components/push-list';
import {
  selectDlPush,
  closeDlDetail,
  initDlDetailTabHandlers,
} from './datalayer/components/push-detail';
import {
  queueHighlights,
  checkWatchPaths,
  clearLiveState,
} from './datalayer/components/live-inspector';
import { validatePush, loadValidationRules } from './datalayer/utils/validator';
import {
  clearValidationErrors,
  setValidationRules,
  setValidationLoaded,
  getDlSortField,
  getDlSortOrder,
  toggleDlSortOrder,
  getDlGroupBySource,
  initDlSortState,
} from './datalayer/state';
import { initTheme } from './theme';
import { savePanelSetting, loadPanelSetting } from './utils/persistence';
import { init as initTooltip } from './utils/tooltip';
import { initSplitter } from './splitter';
import { initKeyboardHandlers } from './keyboard-shortcuts';
import {
  scheduleSaveRequests,
  loadPersistedRequests,
  clearPersistedRequests,
} from './utils/session-persist';
import { initDetailCopyHandlers } from './components/detail-pane';
import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';
import { USER_ID_PARAM_KEYS } from '@/shared/constants';
import {
  createIcons,
  Cable,
  Database,
  ChevronDown,
  Eraser,
  Cookie,
  Sun,
  Moon,
  Trash2,
  Upload,
  Settings,
  CircleHelp,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Download,
  Pause,
  Play,
  SlidersHorizontal,
} from 'lucide';

declare global {
  interface Window {
    clearDataLayer: () => void;
    setPanelPaused: (paused: boolean) => void;
    isPanelPaused: () => boolean;
    receiveRequest: (data: import('@/types/request').ParsedRequest) => void;
    receiveDataLayerPush: (push: import('@/types/datalayer').DataLayerPush) => void;
    receiveDataLayerSources: (
      sources: import('@/types/datalayer').DataLayerSource[],
      labels: Record<import('@/types/datalayer').DataLayerSource, string>
    ) => void;
    _deleteHeavyData: (ids: number[]) => void;
    _clearHeavyData: () => void;
    triggerReinject: () => void;
    flushPendingRequests: () => void;
    flushPendingDlPushes: () => void;
  }
}

// ─── TIMING CONSTANTS ───────────────────────────────────────────────────────
const FILTER_DEBOUNCE_MS = 150;
const COOKIE_RESET_TIMEOUT_MS = 2000;

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

  data._hasUserId = USER_ID_PARAM_KEYS.some(
    (key) => !!(data.decoded?.[key as keyof typeof data.decoded] ?? data.allParams?.[key])
  );

  data._statusPrefix = data.status ? String(data.status)[0] : null;
}

/**
 * Navigate to a network request row from DataLayer correlation view.
 * Makes the row visible if it's hidden by filter or provider filter.
 */
function gotoNetworkRequest(reqId: number): void {
  switchView('network');
  const reqData = state.getRequestMap().get(String(reqId));
  if (!reqData) return;
  const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
  if (!row) return;
  if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
    row.classList.remove('filtered-out', 'provider-hidden');
    row.style.display = '';
  }
  selectRequest(reqData, row);
}

/**
 * Navigate to a DataLayer push from the Network view.
 */
function gotoDatalayerPush(pushId: number): void {
  switchView('datalayer');

  const push = dlState.getDlPushById(pushId);
  if (!push) return;

  const $list = DOM.dlPushList;
  if (!$list) return;
  const row = $list.querySelector(`.dl-push-row[data-id="${pushId}"]`) as HTMLElement | null;
  if (row) {
    row.click();
    row.scrollIntoView({ block: 'nearest' });
  }
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

  // Update provider counts
  updateProviderCounts();

  // Recalculate stats
  let visibleCount = 0;
  let totalSize = 0;
  let totalDuration = 0;
  const filteredIds = state.getFilteredIds();
  const hiddenProviders = state.getHiddenProviders();
  for (const r of state.getAllRequests()) {
    if (filteredIds.has(String(r.id)) && !hiddenProviders.has(r.provider)) {
      visibleCount++;
      totalSize += r.size || 0;
      totalDuration += r.duration || 0;
    }
  }
  state.updateStats(visibleCount, totalSize, totalDuration);
  showPruneNotification(removeCount);
  scheduleSaveRequests(state.getAllRequests());
}

// ─── BATCHED RENDERING ───────────────────────────────────────────────────────

function flushPendingRequests(): void {
  state.setRafId(null);
  if (state.getPendingRequests().length === 0) return;

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

function doSelectPush(push: DataLayerPush, row: HTMLElement): void {
  dlState.setDlSelectedId(push.id);
  setActiveDlRow(row);
  selectDlPush(push, row, gotoNetworkRequest);
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
    updateNetworkStatusBar();
    const stats = state.getStats();
    updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);
  } else {
    updateDlStatusBar();
  }

  // Update status hint
  const $hint = document.querySelector('.status-hint') as HTMLElement | null;
  if ($hint) {
    if (view === 'datalayer') {
      $hint.textContent = 'Backspace clear · / filter · ↑↓ navigate · Esc close';
    } else {
      $hint.textContent = 'Backspace to clear';
    }
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
    indexRequest(data, getEventName);
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

// ─── DATALAYER CLEAR ──────────────────────────────────────────────────────────

function dlClearAll(): void {
  dlState.clearDlPushes();
  dlState.clearDlFilteredIds();
  dlState.clearDlPendingPushes();

  const $list = DOM.dlPushList;
  if ($list) $list.innerHTML = '';

  const $empty = DOM.dlEmptyState;
  if ($empty) $empty.style.display = '';

  closeDlDetail();
  updateDlStatusBar();

  const $dlBadge = DOM.tabBadgeDatalayer;
  if ($dlBadge) $dlBadge.textContent = '0';

  const $count = document.getElementById('dl-push-count');
  if ($count) $count.textContent = '0 pushes';

  // Reset filter bar
  const $dlFilterBar = DOM.dlFilterBar;
  if ($dlFilterBar) $dlFilterBar.classList.remove('visible');
}

// ─── DATALAYER FILTER ─────────────────────────────────────────────────────────

function dlApplyFilter(): void {
  const text = dlState.getDlFilterText();
  dlState.clearDlFilteredIds();

  for (const push of dlState.getAllDlPushes()) {
    if (
      dlMatchesFilter(
        push,
        text,
        dlState.getDlFilterSource(),
        dlState.getDlFilterEventName(),
        dlState.getDlFilterHasKey(),
        dlState.getDlEcommerceOnly()
      )
    ) {
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
    $empty.style.display =
      dlState.getDlVisibleCount() === 0 && dlState.getDlTotalCount() === 0 ? '' : 'none';
  }

  updateDlStatusBar();
}

// ─── DATALAYER FILTER CHIPS ─────────────────────────────────────────────────

function createDlFilterChip(label: string, value: string, onRemove: () => void): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'filter-chip';
  chip.innerHTML = `
    <span class="chip-label">${esc(label)}:</span>
    <span class="chip-value">${esc(value)}</span>
  `;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'chip-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove();
  });
  chip.appendChild(removeBtn);

  return chip;
}

function updateDlFilterChips(): void {
  const $bar = document.getElementById('dl-filter-bar');
  if (!$bar) return;
  $bar.innerHTML = '';

  const chips: HTMLElement[] = [];

  const text = dlState.getDlFilterText();
  if (text) {
    const chip = createDlFilterChip('Search', text, () => {
      dlState.setDlFilterText('');
      const $input = DOM.dlFilterInput;
      if ($input) $input.value = '';
      const $clearBtn = document.getElementById('dl-clear-filter');
      if ($clearBtn) $clearBtn.style.display = 'none';
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  const source = dlState.getDlFilterSource();
  if (source) {
    const label = SOURCE_DESCRIPTIONS[source as keyof typeof SOURCE_DESCRIPTIONS] ?? source;
    const chip = createDlFilterChip('Source', label, () => {
      dlState.setDlFilterSource('');
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  const eventName = dlState.getDlFilterEventName();
  if (eventName) {
    const chip = createDlFilterChip('Event', eventName, () => {
      dlState.setDlFilterEventName('');
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  const hasKey = dlState.getDlFilterHasKey();
  if (hasKey) {
    const chip = createDlFilterChip('Key', hasKey, () => {
      dlState.setDlFilterHasKey('');
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  if (dlState.getDlEcommerceOnly()) {
    const chip = createDlFilterChip('E-commerce', 'only', () => {
      dlState.setDlEcommerceOnly(false);
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  chips.forEach((c) => $bar.appendChild(c));
  $bar.classList.toggle('visible', chips.length > 0);
}

// ─── DATALAYER BATCHED RENDERING ─────────────────────────────────────────

function flushPendingDlPushes(): void {
  dlState.setDlRafId(null);
  const pending = dlState.getDlPendingPushes();
  if (pending.length === 0) return;

  // 1. Compute highlights + validation in batch
  const allPushes = dlState.getAllDlPushes();
  for (let i = allPushes.length - pending.length; i < allPushes.length; i++) {
    if (i < 1) continue;
    const prevPush = allPushes[i - 1];
    const currPush = allPushes[i];
    const changedPaths = computeChangedPaths(prevPush.cumulativeState, currPush.cumulativeState);
    if (changedPaths.size > 0) {
      queueHighlights(changedPaths, prevPush.cumulativeState, currPush.cumulativeState);
      checkWatchPaths(prevPush.cumulativeState, currPush.cumulativeState);
    }

    if (dlState.isValidationLoaded()) {
      const rules = dlState.getValidationRules();
      const errors = validatePush(currPush, rules);
      if (errors.length > 0) {
        dlState.setValidationErrors(currPush.id, errors);
      }
    }
  }

  // 2. Batch DOM updates using DocumentFragment
  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if ($empty && dlState.getDlTotalCount() > 0) {
    $empty.style.display = 'none';
  }

  if ($list) {
    if (getDlSortField() !== 'time' || getDlGroupBySource()) {
      // Non-time sort or grouped view: incremental insertion can't place rows correctly,
      // full re-render is needed to respect sort order / grouping
      renderDlPushListFull();
    } else {
      // Time-based sort: incremental DOM update
      // For desc, reverse the batch so newest push ends up at the top of the prepended fragment
      const isDesc = getDlSortOrder() === 'desc';
      const pendingToRender = isDesc ? [...pending].reverse() : pending;
      const fragment = document.createDocumentFragment();
      for (const { push, isVisible } of pendingToRender) {
        try {
          const row = createDlPushRow(push, isVisible, (p, r) => {
            dlState.setDlSelectedId(p.id);
            setActiveDlRow(r);
            selectDlPush(p, r, gotoNetworkRequest);
          });
          fragment.appendChild(row);
        } catch (e) {
          console.warn('[TagDragon] Failed to create push row:', e);
        }
      }
      if (isDesc) {
        $list.insertBefore(fragment, $list.firstChild);
      } else {
        $list.appendChild(fragment);
      }
    }
  }

  dlState.clearDlPendingPushes();

  // 3. Single status update
  updateDlStatusBar();

  // 4. Update badges (single write)
  const $dlBadge = DOM.tabBadgeDatalayer;
  if ($dlBadge) $dlBadge.textContent = String(dlState.getDlTotalCount());
  const $count = document.getElementById('dl-push-count');
  if ($count) {
    const n = dlState.getDlTotalCount();
    $count.textContent = `${n} push${n !== 1 ? 'es' : ''}`;
  }

  // 5. Update filter chips
  updateDlFilterChips();
}

// ─── DATALAYER RECEIVERS ──────────────────────────────────────────────────────

// Module-level flag — set to true after init completes
let isPanelReady = false;

// Module-level buffer for pushes arriving before init completes
const earlyDlPushBuffer: DataLayerPush[] = [];

window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (!isPanelReady) {
    // Buffer until init completes — will be flushed by init()
    earlyDlPushBuffer.push(push);
    return;
  }
  if (dlState.getDlIsPaused()) return;

  // Mutate shared cumulative state in-place (2.2)
  const sharedState = dlState.getSharedCumulativeState();
  for (const [k, v] of Object.entries(push.data)) {
    sharedState[k] = v;
  }

  const enrichedPush: DataLayerPush = {
    ...push,
    _ts: Date.parse(push.timestamp),
    cumulativeState: dlState.snapshotCumulativeState(),
    _eventName:
      push._eventName ?? (typeof push.data['event'] === 'string' ? push.data['event'] : undefined),
    sourceLabel: push.sourceLabel || push.source.toUpperCase(),
  };

  // Invalidate cached search index so enriched fields are included
  delete (enrichedPush as { _searchIndex?: string })._searchIndex;

  const pruned = dlState.addDlPush(enrichedPush);
  if (pruned) {
    // Prune occurred — filter pending queue to remove pruned IDs instead of clearing
    const remainingIds = new Set(dlState.getAllDlPushes().map((p) => p.id));
    const pending = dlState.getDlPendingPushes();
    const validPending = pending.filter((item) => remainingIds.has(item.push.id));
    // Replace pending with filtered (must mutate in place since state holds reference)
    pending.length = 0;
    pending.push(...validPending);
    const rafId = dlState.getDlRafId();
    if (rafId !== null) cancelAnimationFrame(rafId);
    dlState.setDlRafId(null);
    renderDlPushListFull();
    dlApplyFilter();
    dlState.trimCumulativeState();
    updateDlStatusBar();
    const $dlBadge = DOM.tabBadgeDatalayer;
    if ($dlBadge) $dlBadge.textContent = String(dlState.getDlTotalCount());
    const $count = document.getElementById('dl-push-count');
    if ($count) {
      const n = dlState.getDlTotalCount();
      $count.textContent = `${n} push${n !== 1 ? 'es' : ''}`;
    }
    updateDlFilterChips();
    return; // skip normal pending queue
  }

  // Queue for batched rendering — instead of immediate DOM operations (1.3)
  const filterText = dlState.getDlFilterText();
  const isVisible = dlMatchesFilter(
    enrichedPush,
    filterText,
    dlState.getDlFilterSource(),
    dlState.getDlFilterEventName(),
    dlState.getDlFilterHasKey(),
    dlState.getDlEcommerceOnly()
  );
  if (isVisible) dlState.addDlFilteredId(push.id);

  dlState.addDlPendingPush({ push: enrichedPush, isVisible });
  if (!dlState.getDlRafId()) {
    dlState.setDlRafId(requestAnimationFrame(flushPendingDlPushes));
  }
};

window.receiveDataLayerSources = function (
  sources: DataLayerSource[],
  labels: Record<DataLayerSource, string>
): void {
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

  // Update source detection status in empty state
  const $detection = document.getElementById('dl-source-detection');
  if ($detection) {
    const allSources: DataLayerSource[] = ['gtm', 'tealium', 'adobe', 'segment', 'digitalData'];
    $detection.innerHTML = '';
    for (const source of allSources) {
      const detected = sources.includes(source);
      const statusPill = document.createElement('span');
      statusPill.className = `dl-source-status-pill ${detected ? 'detected' : 'not-detected'}`;
      const label =
        SOURCE_DESCRIPTIONS[source as keyof typeof SOURCE_DESCRIPTIONS] ?? source.toUpperCase();
      statusPill.textContent = `${detected ? '✓ ' : '○ '}${label}`;
      $detection.appendChild(statusPill);
    }
  }
};

window.clearDataLayer = function (): void {
  const $status = document.getElementById('dl-source-status');
  if ($status) $status.innerHTML = '';
  clearLiveState();
  clearValidationErrors();
  dlState.resetCumulativeState();
  dlClearAll();
};

// ─── LIVE INSPECTOR HELPERS ────────────────────────────────────────────────

function computeChangedPaths(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>
): Map<string, 'added' | 'changed' | 'removed'> {
  const result = new Map<string, 'added' | 'changed' | 'removed'>();
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of allKeys) {
    if (!(key in prev)) {
      result.set(key, 'added');
    } else if (!(key in curr)) {
      result.set(key, 'removed');
    } else {
      const prevVal = prev[key];
      const currVal = curr[key];

      // Fast path: reference equality
      if (prevVal === currVal) continue;

      // Fast path: null/undefined comparison
      if (prevVal == null && currVal == null) continue;

      // Primitives: direct comparison (covers string, number, boolean)
      if (typeof prevVal !== 'object' && typeof currVal !== 'object') {
        if (prevVal !== currVal) result.set(key, 'changed');
        continue;
      }

      // One is object, other is not — definitely changed
      if ((prevVal === null) !== (currVal === null) || typeof prevVal !== typeof currVal) {
        result.set(key, 'changed');
        continue;
      }

      // Both are objects/arrays — use JSON.stringify as fallback
      // (only for actual objects, which is rarer)
      if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        result.set(key, 'changed');
      }
    }
  }
  return result;
}

// ─── ENTRY POINT (from devtools.js) ──────────────────────────────────────────

window.receiveRequest = function (data: ParsedRequest): void {
  try {
    if (state.getIsPaused()) return;

    // Index and store
    indexRequest(data, getEventName);
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
};

// Expose flush functions for devtools page to call on panel shown
window.flushPendingRequests = flushPendingRequests;
window.flushPendingDlPushes = flushPendingDlPushes;

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

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

function exportCsv(): void {
  const requests = getExportRequests();
  if (requests.length === 0) return;

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

  downloadCsv(headers, rows, `requests-${Date.now()}.csv`);
}

// ─── PAUSE UI SYNC ───────────────────────────────────────────────────────────

/**
 * Synchronize all pause-related UI elements across Network and DataLayer views.
 * This is the single source of truth for pause UI state.
 */
function syncPauseUI(paused: boolean): void {
  // Sync state
  state.setIsPaused(paused);
  dlState.setDlIsPaused(paused);
  document.body.classList.toggle('paused', paused);

  // Network pause button
  const btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.classList.toggle('active', paused);
    const pauseIcon = btnPause.querySelector('.pause-icon') as HTMLElement;
    const playIcon = btnPause.querySelector('.play-icon') as HTMLElement;
    const pauseText = btnPause.querySelector('.pause-text') as HTMLElement;
    const playText = btnPause.querySelector('.play-text') as HTMLElement;
    if (pauseIcon) pauseIcon.style.display = paused ? 'none' : '';
    if (playIcon) playIcon.style.display = paused ? '' : 'none';
    if (pauseText) pauseText.style.display = paused ? 'none' : '';
    if (playText) playText.style.display = paused ? '' : 'none';
    btnPause.dataset.tooltip = paused ? 'Resume capture' : 'Pause capture';
  }

  // DataLayer pause button
  const $dlPause = document.getElementById('dl-btn-pause');
  if ($dlPause) {
    $dlPause.classList.toggle('active', paused);
    const dlPauseIcon = $dlPause.querySelector('.pause-icon') as HTMLElement;
    const dlPlayIcon = $dlPause.querySelector('.play-icon') as HTMLElement;
    const dlPauseText = $dlPause.querySelector('.pause-text') as HTMLElement;
    const dlPlayText = $dlPause.querySelector('.play-text') as HTMLElement;
    if (dlPauseIcon) dlPauseIcon.style.display = paused ? 'none' : '';
    if (dlPlayIcon) dlPlayIcon.style.display = paused ? '' : 'none';
    if (dlPauseText) dlPauseText.style.display = paused ? 'none' : '';
    if (dlPlayText) dlPlayText.style.display = paused ? '' : 'none';
    $dlPause.dataset.tooltip = paused ? 'Resume DataLayer capture' : 'Pause DataLayer capture';
  }
}

// ─── TOOLBAR EVENTS ──────────────────────────────────────────────────────────

function initToolbarHandlers(): void {
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnExport = document.getElementById('btn-export');
  const btnClearCookies = document.getElementById('btn-clear-cookies') as HTMLButtonElement | null;
  const btnSettings = document.getElementById('btn-settings');

  // Clear button — clears ALL data (both network and datalayer)
  btnClearAll?.addEventListener('click', () => {
    clearNetworkData();
    dlClearAll();
  });

  // Per-tab clear — Network
  const btnClearNetwork = document.getElementById('btn-clear-network');
  btnClearNetwork?.addEventListener('click', () => {
    clearNetworkData();
  });

  // Per-tab clear — DataLayer
  const btnDlClear = document.getElementById('dl-btn-clear');
  btnDlClear?.addEventListener('click', () => {
    dlClearAll();
  });

  // ─── PAUSE UI SYNC ───────────────────────────────────────────────────────────

  // Pause button
  const btnPause = document.getElementById('btn-pause');
  btnPause?.addEventListener('click', () => {
    const isPaused = !state.getIsPaused();
    syncPauseUI(isPaused);
  });

  // Expose for DevTools popup ↔ panel pause sync
  window.setPanelPaused = function (paused: boolean): void {
    syncPauseUI(paused);
  };

  window.isPanelPaused = function (): boolean {
    return state.getIsPaused();
  };

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
    }, FILTER_DEBOUNCE_MS);
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
      downloadJson(getExportRequests(), `requests-${Date.now()}.json`);
    }
  });

  // Export format split button
  const btnExportFormat = document.getElementById('btn-export-format');
  const exportFormatMenu = document.getElementById('export-format-menu');

  btnExportFormat?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    exportFormatMenu?.classList.toggle('visible');
  });

  exportFormatMenu?.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.export-format-option') as HTMLElement;
    if (!target) return;
    const format = target.dataset.format as 'json' | 'csv';
    if (format) {
      state.updateConfig('exportFormat', format);
      syncExportTooltip();
    }
    exportFormatMenu?.classList.remove('visible');
  });

  // Close export format menu on outside click
  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target.closest('#export-split-btn')) {
      exportFormatMenu?.classList.remove('visible');
    }
  });

  // Clear cookies button
  btnClearCookies?.addEventListener('click', async () => {
    const originalTitle = btnClearCookies.dataset.tooltip || 'Delete all cookies on this site';
    btnClearCookies.disabled = true;
    btnClearCookies.dataset.tooltip = 'Deleting...';
    try {
      const count = await clearAllCookies();
      await clearConsentOverride();
      btnClearCookies.dataset.tooltip = `Deleted ${count} cookies`;
      setTimeout(() => {
        btnClearCookies.dataset.tooltip = originalTitle;
        btnClearCookies.disabled = false;
      }, COOKIE_RESET_TIMEOUT_MS);
    } catch {
      btnClearCookies.dataset.tooltip = 'Error';
      setTimeout(() => {
        btnClearCookies.dataset.tooltip = originalTitle;
        btnClearCookies.disabled = false;
      }, COOKIE_RESET_TIMEOUT_MS);
    }
  });

  // Settings drawer
  btnSettings?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    toggleSettings();
  });

  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (!DOM.infoPopover?.contains(target) && !target.closest('#btn-info')) {
      closeInfoPopover();
    }
    if (!DOM.providerFilterPopover?.contains(target) && !target.closest('#btn-providers')) {
      closeProviderFilter();
    }
    if (
      !document.getElementById('dl-filter-popover')?.contains(target) &&
      !target.closest('#dl-btn-filter')
    ) {
      closeDlFilterPopover();
    }
  });

  // Provider button — open provider filter popover
  const btnProviders = document.getElementById('btn-providers');
  btnProviders?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    toggleProviderFilter();
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
  const cfg = state.getConfig();

  if (sortBtn) {
    sortBtn.classList.toggle('active', cfg.sortOrder === 'desc');
    sortBtn.dataset.tooltip =
      cfg.sortOrder === 'desc'
        ? 'Newest first (click for oldest first)'
        : 'Oldest first (click for newest first)';
  }
}

// ─── EXPORT TOOLTIP SYNC ─────────────────────────────────────────────────────

function syncExportTooltip(): void {
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    const fmt = state.getConfig().exportFormat.toUpperCase();
    btnExport.dataset.tooltip = `Export as ${fmt}`;
  }
  // Update format menu active state
  document.querySelectorAll('.export-format-option').forEach((el) => {
    const format = (el as HTMLElement).dataset.format;
    el.classList.toggle('active', format === state.getConfig().exportFormat);
  });
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
    const catKey = (header.closest('.category-section') as HTMLElement | null)?.dataset.category;
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

// ─── DATALAYER FULL LIST RENDER ─────────────────────────────────────────────

function renderDlPushListFull(): void {
  // Invalidate sort cache before rendering (cache may be stale after prune)
  invalidateDlSortCache();

  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if (!$list) return;

  $list.innerHTML = '';

  if (dlState.getDlTotalCount() === 0) {
    if ($empty) $empty.style.display = '';
    return;
  }

  if ($empty) $empty.style.display = 'none';

  const onSelect = (p: DataLayerPush, r: HTMLElement) => {
    dlState.setDlSelectedId(p.id);
    setActiveDlRow(r);
    selectDlPush(p, r, gotoNetworkRequest);
  };

  if (getDlGroupBySource()) {
    renderGroupedPushList($list, dlState.getDlFilteredIds(), onSelect);
  } else {
    const sortedIds = getSortedDlPushIds();
    const filteredIds = dlState.getDlFilteredIds();
    const fragment = document.createDocumentFragment();

    for (const id of sortedIds) {
      const push = dlState.getDlPushById(id);
      if (!push) continue;
      const isVisible = filteredIds.has(id);
      try {
        const row = createDlPushRow(push, isVisible, onSelect);
        fragment.appendChild(row);
      } catch (e) {
        console.warn('[TagDragon] Failed to create push row:', e);
      }
    }

    $list.appendChild(fragment);
  }

  updateDlStatusBar();
}

// ─── DATALAYER HANDLERS ───────────────────────────────────────────────────────

async function initDatalayerHandlers(): Promise<void> {
  // View switching
  document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset['view'] as 'network' | 'datalayer';
      if (view) switchView(view);
    });
  });

  // DL Pause button
  const $dlPause = document.getElementById('dl-btn-pause');
  $dlPause?.addEventListener('click', () => {
    const isPaused = !dlState.getDlIsPaused();
    syncPauseUI(isPaused);
  });

  // DL active filter pills — delegates to shared function
  function updateDlActiveFilters(): void {
    updateDlFilterChips();
  }

  // DL filter input
  const $dlInput = DOM.dlFilterInput;
  const $dlClearBtn = document.getElementById('dl-clear-filter');
  let dlFilterTimer: ReturnType<typeof setTimeout>;
  if ($dlInput) {
    $dlInput.addEventListener('input', () => {
      const hasText = $dlInput.value.length > 0;
      if ($dlClearBtn) $dlClearBtn.style.display = hasText ? '' : 'none';
      dlState.setDlFilterText($dlInput.value);
      // Debounce — same as network filter
      clearTimeout(dlFilterTimer);
      dlFilterTimer = setTimeout(() => {
        dlApplyFilter();
        updateDlActiveFilters();
      }, FILTER_DEBOUNCE_MS);
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

  // DL Export button — respects AppConfig.exportFormat (json or csv), exports only visible pushes
  document.getElementById('dl-btn-export')?.addEventListener('click', () => {
    const filteredIds = dlState.getDlFilteredIds();
    const pushes = dlState.getAllDlPushes().filter((p) => filteredIds.has(p.id));
    const fmt = state.getConfig().exportFormat;
    if (fmt === 'csv') exportDlCsv(pushes);
    else exportDlJson(pushes);
  });

  // DL Re-inject button (shown in empty state)
  document.getElementById('dl-btn-reinject')?.addEventListener('click', () => {
    if (window.triggerReinject) {
      window.triggerReinject();
    } else {
      chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER' }).catch(() => {});
    }
  });

  // DL Sort toggle
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  $dlSortBtn?.addEventListener('click', () => {
    const newOrder = toggleDlSortOrder();
    $dlSortBtn.classList.toggle('active', newOrder === 'desc');
    renderDlPushListFull();
    syncSettingsControl('cfg-dl-sort-order', newOrder);
  });

  // DL Filter button — open DL filter popover
  const $dlFilterBtn = document.getElementById('dl-btn-filter');
  $dlFilterBtn?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    toggleDlFilterPopover();
  });

  // Listen for revalidate events from the settings drawer
  document.addEventListener('tagdragon:revalidate', () => {
    const rules = dlState.getValidationRules().filter((r) => r.enabled);
    const pushes = dlState.getAllDlPushes();

    dlState.clearValidationErrors();

    for (const push of pushes) {
      const errors = validatePush(push, rules);
      if (errors.length > 0) {
        dlState.setValidationErrors(push.id, errors);
      }
    }

    updateDlRowValidation();
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
  initDlDetailTabHandlers(currentPushGetter, gotoNetworkRequest);

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
      void savePanelSetting('dl-list-width', String(width));
    });
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
    const savedWidth = await loadPanelSetting('dl-list-width');
    if (savedWidth) {
      $dlMain.style.gridTemplateColumns = `${savedWidth}px 6px 1fr`;
    }
  }
}

// ─── INITIALIZE ──────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // ─── GLOBAL ERROR BOUNDARY ─────────────────────────────────────────────
  window.addEventListener('error', (e) => {
    console.error('[TagDragon] Unhandled error:', e.error);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[TagDragon] Unhandled promise rejection:', e.reason);
  });

  // Lucide icons — replace <i data-lucide="..."> placeholders with SVGs
  createIcons({
    icons: {
      Cable,
      Database,
      ChevronDown,
      Eraser,
      Cookie,
      Sun,
      Moon,
      Trash2,
      Settings,
      CircleHelp,
      Search,
      X,
      ArrowUpDown,
      Filter,
      Download,
      Pause,
      Play,
      SlidersHorizontal,
      Upload,
    },
  });

  // Remove data-lucide attributes from processed SVGs to prevent re-processing
  // by subsequent createIcons() calls (e.g., in info-popover.ts renderToolbarIcons)
  document.querySelectorAll('svg[data-lucide]').forEach((svg) => {
    svg.removeAttribute('data-lucide');
  });

  // Remove inline width/height attributes from Lucide SVGs so CSS controls sizing
  document
    .querySelectorAll('#global-tab-bar svg.lucide, .context-toolbar svg.lucide')
    .forEach((svg) => {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
    });

  // Initialize tooltip system
  initTooltip();

  // Load config first
  await state.loadConfig();
  await initTheme();

  // Restore requests from previous panel session (survives DevTools panel reload)
  restorePersistedRequests();

  // Initialize DataLayer sort state from persisted config
  initDlSortState();

  // Sync DataLayer sort button visual state
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  $dlSortBtn?.classList.toggle('active', getDlSortOrder() === 'desc');

  // Initialize all handlers
  initTabHandlers();
  initProviderBar();
  initToolbarHandlers();
  initKeyboardHandlers({
    getActiveView: () => activeView,
    doApplyFilters,
    doUpdateActiveFilters,
    doSelectRequest,
    doSelectPush,
    toggleSettingsDrawer: toggleSettings,
  });
  await initSplitter();
  document.getElementById('btn-quick-sort')?.addEventListener('click', () => {
    const next = state.getConfig().sortOrder === 'asc' ? 'desc' : 'asc';
    state.updateConfig('sortOrder', next);
    syncQuickButtons();
    syncSettingsControl('cfg-sort-order', next);
  });
  syncQuickButtons();
  applyWrapValuesClass();
  initCategoryToggle();
  initCopyHandler();
  initDetailCopyHandlers();
  initRequestListHandler();
  applyCompactRowsClass();

  initSettingsDrawer({
    getActiveView: () => activeView,
    doApplyFilters,
    doUpdateActiveFilters,
    syncQuickButtons,
    applyWrapValuesClass,
    applyCompactRowsClass,
  });

  initProviderFilterPopover({
    doApplyFilters,
    doUpdateActiveFilters,
  });

  initDlFilterPopover({
    doApplyFilters: dlApplyFilter,
    updateDlFilterChips,
  });

  initTimestampToggle();

  // Initialize Adobe env switcher
  initAdobeEnvSwitcher();

  // Initialize Consent Panel
  void initConsentPanel();

  // Initialize Info Popover
  initInfoPopover();

  // Initialize DataLayer handlers
  await initDatalayerHandlers();

  // Cross-tab navigation: Network → DataLayer
  document.addEventListener('goto-datalayer-push', (e) => {
    const pushId = (e as CustomEvent).detail as number;
    gotoDatalayerPush(pushId);
  });

  // Load validation rules
  loadValidationRules()
    .then((rules) => {
      setValidationRules(rules);
      setValidationLoaded(true);
      updateDlRowValidation();
    })
    .catch(() => {
      /* ignore */
    });

  // Mark panel as ready and flush early pushes
  isPanelReady = true;

  // Replay any pushes that arrived before init completed
  if (earlyDlPushBuffer.length > 0) {
    const buffered = [...earlyDlPushBuffer];
    earlyDlPushBuffer.length = 0;
    for (const push of buffered) {
      try {
        window.receiveDataLayerPush(push);
      } catch {
        /* ignore */
      }
    }
  }
}

// Start initialization
init();
