// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v3.0 - PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';

import * as state from './state';
import * as dlState from './datalayer/state';
import { DOM } from './utils/dom';
import { getEventName, esc } from './utils/format';
import {
  createRequestRow,
  navigateList,
  navigateToEdge,
  updateRowVisibility,
} from './components/request-list';
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
} from './components/status-bar';
import {
  ensureProviderPill,
  initProviderBarHandlers,
  initProviderBar,
  updateProviderCounts,
  updateFilterBarVisibility,
} from './components/provider-bar';
import { initFilterPopoverHandlers, updateActiveFilters } from './components/filter-bar';
import { initAdobeEnvSwitcher } from './components/adobe-env-switcher';
import {
  initConsentPanel,
  clearAllCookies,
  clearConsentOverride,
} from './components/consent-panel';
import { initInfoPopover, closeInfoPopover } from './components/info-popover';
import { applyFilters, matchesFilter } from './utils/filter';
import { downloadCsv, downloadJson } from './utils/export';
import {
  createDlPushRow,
  getSourceColor,
  setActiveDlRow,
  updateDlStatusText,
  dlMatchesFilter,
  exportDlJson,
  exportDlCsv,
  updateDlRowValidation,
  getSortedDlPushIds,
  renderGroupedPushList,
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
import {
  validatePush,
  loadValidationRules,
  saveValidationRules,
} from './datalayer/utils/validator';
import {
  clearValidationErrors,
  getValidationRules,
  setValidationRules,
  isValidationLoaded,
  setValidationLoaded,
  getDlSortField,
  setDlSortField,
  getDlSortOrder,
  toggleDlSortOrder,
  getDlGroupBySource,
  setDlGroupBySource,
  initDlSortState,
} from './datalayer/state';
import { initTheme } from './theme';
import { savePanelSetting, loadPanelSetting } from './utils/persistence';
import { init as initTooltip } from './utils/tooltip';
import { initSplitter } from './splitter';
import { initKeyboardHandlers } from './keyboard-shortcuts';
import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';
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
  Settings,
  CircleHelp,
  Search,
  X,
  ArrowUpDown,
  WrapText,
  Maximize2,
  AlignJustify,
  Filter,
  Download,
  Pause,
  Play,
  SlidersHorizontal,
  ShoppingCart,
  CheckCircle,
} from 'lucide';

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
      $hint.innerHTML = 'Ctrl+L clear · Ctrl+F filter · ↑↓ navigate · Esc close';
    } else {
      $hint.textContent = 'Ctrl+L to clear';
    }
  }

  // Close DL popovers when switching views
  const $dlFilterPopover = document.getElementById('dl-filter-popover');
  if ($dlFilterPopover) $dlFilterPopover.classList.remove('visible');
  const $dlSubmenu = document.getElementById('dl-filter-submenu-dl');
  if ($dlSubmenu) $dlSubmenu.classList.remove('visible');
  const $dlValPopover = document.getElementById('dl-validation-popover');
  if ($dlValPopover) $dlValPopover.classList.remove('visible');
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
  updateDlStatusText(0, 0);

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

  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());
}

// ─── DATALAYER FILTER CHIPS ─────────────────────────────────────────────────

function createDlFilterChip(label: string, value: string, onRemove: () => void): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'filter-chip';
  chip.innerHTML = `
    <span class="chip-label">${label}:</span>
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
      dlState.setDlHasKey('');
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  if (dlState.getDlEcommerceOnly()) {
    const chip = createDlFilterChip('E-commerce', 'only', () => {
      dlState.setDlEcommerceOnly(false);
      const $btn = document.getElementById('dl-btn-ecommerce');
      if ($btn) $btn.classList.remove('active');
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
  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());

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

  dlState.addDlPush(enrichedPush);

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

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

function exportCsv(): void {
  const requests = state.getAllRequests();
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

// ─── TOOLBAR EVENTS ──────────────────────────────────────────────────────────

function initToolbarHandlers(): void {
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnExport = document.getElementById('btn-export');
  const btnClearCookies = document.getElementById('btn-clear-cookies');
  const btnSettings = document.getElementById('btn-settings');
  const btnResetFilters = document.getElementById('btn-reset-filters');

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

  // Pause button
  const btnPause = document.getElementById('btn-pause');
  btnPause?.addEventListener('click', () => {
    const isPaused = !state.getIsPaused();
    setPanelPaused(isPaused);
  });

  // Expose for DevTools popup ↔ panel pause sync
  window['setPanelPaused'] = function (paused: boolean): void {
    state.setIsPaused(paused);
    document.body.classList.toggle('paused', paused);
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
  };

  window['isPanelPaused'] = function (): boolean {
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
      downloadJson(state.getAllRequests(), `requests-${Date.now()}.json`);
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
      }, 2000);
    } catch {
      btnClearCookies.dataset.tooltip = 'Error';
      setTimeout(() => {
        btnClearCookies.dataset.tooltip = originalTitle;
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
    // Do NOT clear hidden providers — user configured those intentionally
    if (DOM.filterInput) DOM.filterInput.value = '';
    const clearFilter = DOM.clearFilter;
    if (clearFilter) clearFilter.style.display = 'none';
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
    sortBtn.dataset.tooltip =
      cfg.sortOrder === 'desc'
        ? 'Newest first (click for oldest first)'
        : 'Oldest first (click for newest first)';
  }
  if (wrapBtn) {
    wrapBtn.classList.toggle('active', cfg.wrapValues);
    wrapBtn.dataset.tooltip = cfg.wrapValues ? 'Wrap values: on' : 'Wrap values: off';
  }
  if (expandBtn) {
    expandBtn.classList.toggle('active', cfg.autoExpand);
    expandBtn.dataset.tooltip = cfg.autoExpand ? 'Auto-expand: on' : 'Auto-expand: off';
  }
  if (compactBtn) {
    compactBtn.classList.toggle('active', cfg.compactRows);
    compactBtn.dataset.tooltip = cfg.compactRows ? 'Compact list: on' : 'Compact list: off';
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

// ─── EXPORT TOOLTIP SYNC ─────────────────────────────────────────────────────

function syncExportTooltip(): void {
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    const fmt = state.getConfig().exportFormat.toUpperCase();
    btnExport.dataset.tooltip = `Export as ${fmt}`;
  }
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

  const cfgTimestampEl = document.getElementById(
    'cfg-timestamp-format'
  ) as HTMLSelectElement | null;
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
    syncExportTooltip();
    cfgExportFmtEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      state.updateConfig('exportFormat', value);
      syncExportTooltip();
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

// ─── DATALAYER FULL LIST RENDER ─────────────────────────────────────────────

function renderDlPushListFull(): void {
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

  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());
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
    dlState.setDlIsPaused(isPaused);
    $dlPause.classList.toggle('active', isPaused);
    ($dlPause.querySelector('.pause-icon') as HTMLElement).style.display = isPaused ? 'none' : '';
    ($dlPause.querySelector('.play-icon') as HTMLElement).style.display = isPaused ? '' : 'none';
    ($dlPause.querySelector('.pause-text') as HTMLElement).style.display = isPaused ? 'none' : '';
    ($dlPause.querySelector('.play-text') as HTMLElement).style.display = isPaused ? '' : 'none';
    $dlPause.dataset.tooltip = isPaused ? 'Resume DataLayer capture' : 'Pause DataLayer capture';
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
      }, 150);
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
    window['triggerReinject']?.();
  });

  // DL E-commerce filter toggle
  const $dlEcBtn = document.getElementById('dl-btn-ecommerce');
  $dlEcBtn?.addEventListener('click', () => {
    const newVal = !dlState.getDlEcommerceOnly();
    dlState.setDlEcommerceOnly(newVal);
    $dlEcBtn.classList.toggle('active', newVal);
    dlApplyFilter();
    updateDlFilterChips();
  });

  // DL Sort toggle
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  $dlSortBtn?.addEventListener('click', () => {
    const newOrder = toggleDlSortOrder();
    $dlSortBtn.classList.toggle('active', newOrder === 'desc');
    // Re-render list with new sort order
    renderDlPushListFull();
  });

  // DL Filter popover
  const $dlFilterBtn = document.getElementById('dl-btn-filter');
  const $dlFilterPopover = document.getElementById('dl-filter-popover');
  const $dlSubmenu = document.getElementById('dl-filter-submenu-dl');

  $dlFilterBtn?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    closeDlFilterPopover();
    closeDlValidationPopover();
    if ($dlFilterPopover) {
      const isVisible = $dlFilterPopover.classList.contains('visible');
      $dlFilterPopover.classList.toggle('visible', !isVisible);
      if (!isVisible) {
        positionDlFilterPopover();
      }
    }
  });

  function closeDlFilterPopover(): void {
    if ($dlFilterPopover) $dlFilterPopover.classList.remove('visible');
    if ($dlSubmenu) $dlSubmenu.classList.remove('visible');
  }

  function positionDlFilterPopover(): void {
    if (!$dlFilterBtn || !$dlFilterPopover) return;
    const rect = $dlFilterBtn.getBoundingClientRect();
    $dlFilterPopover.style.top = `${rect.bottom + 4}px`;
    $dlFilterPopover.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;
  }

  // DL Filter popover item clicks
  $dlFilterPopover?.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.filter-popover-item') as HTMLElement | null;
    if (!target) return;

    const action = target.dataset['action'];
    const submenu = target.dataset['submenu'];

    if (action === 'open-dl-submenu' && submenu) {
      openDlSubmenu(submenu, target);
    } else if (action === 'toggle-dl-ecommerce') {
      const newVal = !dlState.getDlEcommerceOnly();
      dlState.setDlEcommerceOnly(newVal);
      target.classList.toggle('active-filter', newVal);
      const $ecBtn = document.getElementById('dl-btn-ecommerce');
      if ($ecBtn) $ecBtn.classList.toggle('active', newVal);
      dlApplyFilter();
      updateDlFilterChips();
    }
  });

  function openDlSubmenu(type: string, anchor: HTMLElement): void {
    if (!$dlSubmenu) return;
    const $content = document.getElementById('dl-filter-submenu-content');
    if (!$content) return;

    // Position submenu
    const rect = anchor.getBoundingClientRect();
    $dlSubmenu.style.top = `${rect.top}px`;
    $dlSubmenu.style.left = `${rect.right + 4}px`;
    $dlSubmenu.classList.add('visible');

    switch (type) {
      case 'dl-source':
        renderDlSourceSubmenu($content);
        break;
      case 'dl-event':
        renderDlEventSubmenu($content);
        break;
      case 'dl-haskey':
        renderDlHasKeySubmenu($content);
        break;
      case 'dl-sort':
        renderDlSortSubmenu($content);
        break;
    }
  }

  // === SOURCE SUBMENU ===
  function renderDlSourceSubmenu($content: HTMLElement): void {
    const sources: DataLayerSource[] = ['gtm', 'tealium', 'adobe', 'segment', 'digitalData'];
    const currentSource = dlState.getDlFilterSource();

    let html = `
      <div class="filter-submenu-item ${currentSource === '' ? 'selected' : ''}" data-source="">
        <span class="item-label">All sources</span>
        <span class="item-count">${dlState.getAllDlPushes().length}</span>
      </div>
    `;

    for (const src of sources) {
      const count = dlState.getAllDlPushes().filter((p) => p.source === src).length;
      const label = SOURCE_DESCRIPTIONS[src as keyof typeof SOURCE_DESCRIPTIONS] ?? src;
      const color = getSourceColor(src);
      html += `
        <div class="filter-submenu-item ${currentSource === src ? 'selected' : ''}" data-source="${src}">
          <span class="item-label" style="color:${color}">${esc(label)}</span>
          <span class="item-count">${count}</span>
        </div>
      `;
    }

    $content.innerHTML = html;

    $content.querySelectorAll('.filter-submenu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const src = (item as HTMLElement).dataset['source'] as DataLayerSource | '';
        dlState.setDlFilterSource(src);
        dlApplyFilter();
        updateDlFilterChips();
        closeDlFilterPopover();
      });
    });
  }

  // === EVENT NAME SUBMENU ===
  function renderDlEventSubmenu($content: HTMLElement): void {
    const pushes = dlState.getAllDlPushes();
    const eventCounts = new Map<string, number>();
    for (const p of pushes) {
      if (p._eventName) {
        eventCounts.set(p._eventName, (eventCounts.get(p._eventName) ?? 0) + 1);
      }
    }

    const currentEvent = dlState.getDlFilterEventName();

    let html = `
      <div class="filter-submenu-search">
        <input type="text" id="dl-event-search" placeholder="Search events...">
      </div>
      <div class="filter-submenu-item ${currentEvent === '' ? 'selected' : ''}" data-event="">
        <span class="item-label">All events</span>
        <span class="item-count">${pushes.length}</span>
      </div>
      <div class="filter-submenu-divider"></div>
    `;

    const sorted = [...eventCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      html += `
        <div class="filter-submenu-item ${currentEvent === name ? 'selected' : ''}" data-event="${esc(name)}">
          <span class="item-label">${esc(name)}</span>
          <span class="item-count">${count}</span>
        </div>
      `;
    }

    $content.innerHTML = html;

    const $search = document.getElementById('dl-event-search') as HTMLInputElement | null;
    $search?.addEventListener('input', () => {
      const query = $search.value.toLowerCase();
      $content.querySelectorAll('.filter-submenu-item[data-event]').forEach((item) => {
        const event = (item as HTMLElement).dataset['event'] ?? '';
        item.style.display = event === '' || event.toLowerCase().includes(query) ? '' : 'none';
      });
    });

    $content.querySelectorAll('.filter-submenu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const event = (item as HTMLElement).dataset['event'] ?? '';
        dlState.setDlFilterEventName(event);
        dlApplyFilter();
        updateDlFilterChips();
        closeDlFilterPopover();
      });
    });
  }

  // === HAS KEY SUBMENU ===
  function renderDlHasKeySubmenu($content: HTMLElement): void {
    const keyCounts = new Map<string, number>();
    for (const p of dlState.getAllDlPushes()) {
      for (const key of Object.keys(p.data)) {
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      }
    }

    const sorted = [...keyCounts.entries()]
      .filter(([k]) => !k.includes('.'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const currentKey = dlState.getDlFilterHasKey();

    const quickpicks = [
      'ecommerce',
      'page_location',
      'page_title',
      'user_id',
      'transaction_id',
      'items',
      'currency',
      'value',
    ];
    const availableQuickpicks = quickpicks.filter((q) => keyCounts.has(q));

    let html = `
      <div class="filter-submenu-input-row">
        <input type="text" id="dl-haskey-input" placeholder="Enter key name..." value="${esc(currentKey)}">
        <button id="dl-haskey-apply">Filter</button>
      </div>
    `;

    if (availableQuickpicks.length > 0) {
      html += '<div class="filter-submenu-quickpicks">';
      for (const qp of availableQuickpicks) {
        html += `<span class="filter-submenu-quickpick" data-key="${esc(qp)}">${esc(qp)}</span>`;
      }
      html += '</div>';
    }

    html += '<div class="filter-submenu-divider"></div>';

    for (const [key, count] of sorted) {
      html += `
        <div class="filter-submenu-item ${currentKey === key ? 'selected' : ''}" data-key="${esc(key)}">
          <span class="item-label">${esc(key)}</span>
          <span class="item-count">${count}</span>
        </div>
      `;
    }

    $content.innerHTML = html;

    document.getElementById('dl-haskey-apply')?.addEventListener('click', () => {
      const val = (document.getElementById('dl-haskey-input') as HTMLInputElement)?.value.trim();
      dlState.setDlHasKey(val);
      dlApplyFilter();
      updateDlFilterChips();
      closeDlFilterPopover();
    });

    (document.getElementById('dl-haskey-input') as HTMLInputElement)?.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter') {
          document.getElementById('dl-haskey-apply')?.click();
        }
      }
    );

    $content.querySelectorAll('.filter-submenu-quickpick').forEach((qp) => {
      qp.addEventListener('click', () => {
        const key = (qp as HTMLElement).dataset['key'] ?? '';
        dlState.setDlHasKey(key);
        dlApplyFilter();
        updateDlFilterChips();
        closeDlFilterPopover();
      });
    });

    $content.querySelectorAll('.filter-submenu-item[data-key]').forEach((item) => {
      item.addEventListener('click', () => {
        const key = (item as HTMLElement).dataset['key'] ?? '';
        dlState.setDlHasKey(key);
        dlApplyFilter();
        updateDlFilterChips();
        closeDlFilterPopover();
      });
    });
  }

  // === SORT SUBMENU ===
  function renderDlSortSubmenu($content: HTMLElement): void {
    const currentField = getDlSortField();
    const currentOrder = getDlSortOrder();

    type DlSortField = 'time' | 'keycount' | 'source';
    const options: { field: DlSortField; label: string; icon: string }[] = [
      { field: 'time', label: 'Time', icon: '🕐' },
      { field: 'keycount', label: 'Key count', icon: '🔢' },
      { field: 'source', label: 'Source', icon: '🏷️' },
    ];

    let html = '';
    for (const opt of options) {
      const isSelected = currentField === opt.field;
      html += `
        <div class="filter-submenu-item ${isSelected ? 'selected' : ''}" data-sort="${opt.field}">
          <span class="item-label">${opt.icon} ${opt.label}</span>
          ${isSelected ? `<span style="font-size:10px;color:var(--accent)">${currentOrder === 'asc' ? '↑ asc' : '↓ desc'}</span>` : ''}
        </div>
      `;
    }

    html += '<div class="filter-submenu-divider"></div>';
    html += `
      <div class="filter-submenu-item" data-action="toggle-sort-order" style="justify-content:center;">
        <span class="item-label" style="color:var(--accent)">
          ${currentOrder === 'asc' ? '↑ Switch to newest first' : '↓ Switch to oldest first'}
        </span>
      </div>
    `;

    html += '<div class="filter-submenu-divider"></div>';
    html += `
      <div class="filter-submenu-item ${getDlGroupBySource() ? 'selected' : ''}" data-action="toggle-group-by-source">
        <span class="item-label">🏷️ Group by source</span>
      </div>
    `;

    $content.innerHTML = html;

    $content.querySelectorAll('.filter-submenu-item[data-sort]').forEach((item) => {
      item.addEventListener('click', () => {
        const field = (item as HTMLElement).dataset['sort'] as DlSortField;
        setDlSortField(field);
        renderDlPushListFull();
        closeDlFilterPopover();
      });
    });

    $content.querySelector('[data-action="toggle-sort-order"]')?.addEventListener('click', () => {
      const newOrder = toggleDlSortOrder();
      renderDlPushListFull();
      // Sync toolbar button visual state
      const $dlSortBtn = document.getElementById('dl-btn-sort');
      $dlSortBtn?.classList.toggle('active', newOrder === 'desc');
      closeDlFilterPopover();
    });

    $content
      .querySelector('[data-action="toggle-group-by-source"]')
      ?.addEventListener('click', () => {
        setDlGroupBySource(!getDlGroupBySource());
        renderDlPushListFull();
        closeDlFilterPopover();
      });
  }

  // DL Validation popover
  const $dlValBtn = document.getElementById('dl-btn-validation');
  const $dlValPopover = document.getElementById('dl-validation-popover');

  function closeDlValidationPopover(): void {
    if ($dlValPopover) $dlValPopover.classList.remove('visible');
  }

  $dlValBtn?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    closeDlFilterPopover();
    closeDlValidationPopover();
    if ($dlValPopover) {
      const isVisible = $dlValPopover.classList.contains('visible');
      $dlValPopover.classList.toggle('visible', !isVisible);
      if (!isVisible) {
        renderDlValidationRules();
        updateDlValidationSummary();
      }
    }
  });

  function renderDlValidationRules(): void {
    const $list = document.getElementById('dl-val-rules-list');
    if (!$list) return;

    const rules = dlState.getValidationRules();
    $list.innerHTML = '';

    for (const rule of rules) {
      const row = document.createElement('div');
      row.className = 'dl-val-rule';

      const toggle = document.createElement('button');
      toggle.className = `dl-val-rule-toggle ${rule.enabled ? 'enabled' : ''}`;
      toggle.addEventListener('click', () => {
        rule.enabled = !rule.enabled;
        toggle.classList.toggle('enabled', rule.enabled);
        saveValidationRules(dlState.getValidationRules());
        revalidateAllDlPushes();
      });

      const name = document.createElement('span');
      name.className = 'dl-val-rule-name';
      name.textContent = rule.name;

      const scope = document.createElement('span');
      scope.className = 'dl-val-rule-scope';
      const scopeParts: string[] = [];
      if (rule.scope.eventName) {
        const events = Array.isArray(rule.scope.eventName)
          ? rule.scope.eventName
          : rule.scope.eventName;
        scopeParts.push(String(events));
      }
      if (rule.scope.ecommerceType) scopeParts.push(rule.scope.ecommerceType);
      if (rule.scope.source) scopeParts.push(rule.scope.source);
      scope.textContent = scopeParts.length > 0 ? scopeParts.join(' · ') : 'all';

      row.appendChild(toggle);
      row.appendChild(name);
      row.appendChild(scope);
      $list.appendChild(row);
    }
  }

  function renderDlCustomRules(): void {
    const $list = document.getElementById('dl-val-custom-rules');
    if (!$list) return;

    const rules = dlState.getValidationRules().filter((r) => r.id.startsWith('custom-'));
    $list.innerHTML = '';

    for (const rule of rules) {
      const row = document.createElement('div');
      row.className = 'dl-val-rule';

      const toggle = document.createElement('button');
      toggle.className = `dl-val-rule-toggle ${rule.enabled ? 'enabled' : ''}`;
      toggle.addEventListener('click', () => {
        rule.enabled = !rule.enabled;
        toggle.classList.toggle('enabled', rule.enabled);
        saveValidationRules(dlState.getValidationRules());
        revalidateAllDlPushes();
      });

      const name = document.createElement('span');
      name.className = 'dl-val-rule-name';
      name.textContent = rule.name;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText =
        'background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0 4px;';
      deleteBtn.addEventListener('click', () => {
        const updated = dlState.getValidationRules().filter((r) => r.id !== rule.id);
        dlState.setValidationRules(updated);
        saveValidationRules(updated);
        renderDlCustomRules();
        revalidateAllDlPushes();
        updateDlValidationSummary();
      });

      row.appendChild(toggle);
      row.appendChild(name);
      row.appendChild(deleteBtn);
      $list.appendChild(row);
    }
  }

  function updateDlValidationSummary(): void {
    const $count = document.getElementById('dl-val-error-count');
    if (!$count) return;

    const pushes = dlState.getAllDlPushes();
    let affectedCount = 0;
    for (const p of pushes) {
      if (dlState.getValidationErrors(p.id).length > 0) affectedCount++;
    }
    $count.textContent = String(affectedCount);

    const $btn = document.getElementById('dl-btn-validation');
    if ($btn) {
      $btn.classList.toggle('active', affectedCount > 0);
    }

    // Also render custom rules
    renderDlCustomRules();
  }

  function revalidateAllDlPushes(): void {
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
    updateDlValidationSummary();
  }

  // Add custom rule handler
  document.getElementById('dl-val-add-rule')?.addEventListener('click', () => {
    const $container = document.getElementById('dl-val-custom-rules');
    if (!$container) return;
    if ($container.querySelector('.dl-val-add-form')) return;

    const form = document.createElement('div');
    form.className = 'dl-val-add-form';
    form.style.cssText = 'padding:8px 0;';
    form.innerHTML = `
      <div style="margin-bottom:6px;">
        <input type="text" id="dl-val-new-name" placeholder="Rule name" class="dl-val-add-form">
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <select id="dl-val-new-type" class="dl-val-add-form">
          <option value="required_key">Required key</option>
          <option value="forbidden_key">Forbidden key</option>
        </select>
      </div>
      <div style="margin-bottom:6px;">
        <input type="text" id="dl-val-new-key" placeholder="Key path (e.g. ecommerce.transaction_id)" class="dl-val-add-form">
      </div>
      <div style="display:flex;gap:4px;">
        <input type="text" id="dl-val-new-event" placeholder="Event name (optional)" class="dl-val-add-form">
        <button id="dl-val-save-new" style="
          padding:4px 12px;background:var(--accent);color:#fff;border:none;
          border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;
        ">Add</button>
        <button id="dl-val-cancel-new" style="
          padding:4px 8px;background:var(--bg-2);color:var(--text-1);border:1px solid var(--border);
          border-radius:4px;font-size:11px;cursor:pointer;
        ">Cancel</button>
      </div>
    `;

    $container.appendChild(form);
    (document.getElementById('dl-val-new-name') as HTMLInputElement)?.focus();

    document.getElementById('dl-val-cancel-new')?.addEventListener('click', () => form.remove());
    document.getElementById('dl-val-save-new')?.addEventListener('click', () => {
      const name = (document.getElementById('dl-val-new-name') as HTMLInputElement)?.value.trim();
      const type = (document.getElementById('dl-val-new-type') as HTMLSelectElement)?.value;
      const key = (document.getElementById('dl-val-new-key') as HTMLInputElement)?.value.trim();
      const event = (document.getElementById('dl-val-new-event') as HTMLInputElement)?.value.trim();

      if (!name || !key) return;

      const newRule = {
        id: `custom-${Date.now()}`,
        name,
        enabled: true,
        scope: event ? { eventName: event } : {},
        checks: [
          {
            type,
            key,
            message: `${type === 'required_key' ? 'Missing' : 'Forbidden'} ${key}`,
          },
        ],
      };

      const rules = [...dlState.getValidationRules(), newRule];
      dlState.setValidationRules(rules);
      saveValidationRules(rules);
      revalidateAllDlPushes();
      form.remove();
    });
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
      WrapText,
      Maximize2,
      AlignJustify,
      Filter,
      Download,
      Pause,
      Play,
      SlidersHorizontal,
      ShoppingCart,
      CheckCircle,
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

  // Initialize DataLayer sort state from persisted config
  initDlSortState();

  // Sync DataLayer sort button visual state
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  $dlSortBtn?.classList.toggle('active', getDlSortOrder() === 'desc');

  // Initialize all handlers
  initTabHandlers();
  initProviderBarHandlers(doApplyFilters, doUpdateActiveFilters);
  initProviderBar();
  initFilterPopoverHandlers(doApplyFilters, doUpdateActiveFilters);
  initToolbarHandlers();
  initKeyboardHandlers({
    getActiveView: () => activeView,
    doApplyFilters,
    doUpdateActiveFilters,
    doSelectRequest,
  });
  await initSplitter();
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

  // Close DL popovers on outside click
  document.addEventListener('click', (e: Event) => {
    const $dlFilterPopover = document.getElementById('dl-filter-popover');
    const $dlSubmenu = document.getElementById('dl-filter-submenu-dl');
    const $dlValPopover = document.getElementById('dl-validation-popover');
    const $dlFilterBtn = document.getElementById('dl-btn-filter');
    const $dlValBtn = document.getElementById('dl-btn-validation');

    if (
      $dlFilterPopover?.classList.contains('visible') &&
      !$dlFilterPopover.contains(e.target as Node) &&
      !$dlFilterBtn?.contains(e.target as Node)
    ) {
      $dlFilterPopover.classList.remove('visible');
      $dlSubmenu?.classList.remove('visible');
    }

    if (
      $dlValPopover?.classList.contains('visible') &&
      !$dlValPopover.contains(e.target as Node) &&
      !$dlValBtn?.contains(e.target as Node)
    ) {
      $dlValPopover.classList.remove('visible');
    }
  });

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
