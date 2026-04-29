// ═══════════════════════════════════════════════════════════════════════════
// DATALAYER CONTROLLER
// Handles all DataLayer-related state, rendering, and event binding.
// Extracted from src/panel/index.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';
import { computeChangedPaths } from '../datalayer/utils/changed-paths';

import * as state from '../state';
import * as dlState from '../datalayer/state';
import { DOM } from '../utils/dom';
import { esc } from '../utils/format';
import {
  createDlPushRow,
  getSourceColor,
  setActiveDlRow,
  dlMatchesFilter,
  exportDlJson,
  exportDlCsv,
  getSortedDlPushIds,
  renderGroupedPushList,
  invalidateDlSortCache,
  updateDlRowValidation,
} from '../datalayer/components/push-list';
import {
  selectDlPush,
  closeDlDetail,
  initDlDetailTabHandlers,
} from '../datalayer/components/push-detail';
import {
  queueHighlights,
  checkWatchPaths,
  clearLiveState,
} from '../datalayer/components/live-inspector';
import { validatePush } from '../datalayer/utils/validator';
import {
  clearValidationErrors,
  toggleDlSortOrder,
  getDlSortField,
  getDlSortOrder,
  getDlGroupBySource,
} from '../datalayer/state';

import { initExportFormatMenu } from '../utils/export-menu';

import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';
import { updateDlStatusBar as _updateDlStatusBar } from '../components/status-bar';
import { toggleDlFilterPopover } from '../components/dl-filter-popover';
import { FILTER_DEBOUNCE_MS } from '@/shared/constants';

// ─── MODULE-LEVEL STATE ─────────────────────────────────────────────────────

// Module-level flag — set to true after init completes
let isPanelReady = false;

// Module-level buffer for pushes arriving before init completes
const earlyDlPushBuffer: DataLayerPush[] = [];

// ─── EXTERNAL HELPERS (imported from index.ts) ──────────────────────────────

// These are set by initDatalayerController() after index.ts initializes them
let gotoNetworkRequestRef: ((reqId: number) => void) | null = null;
let switchViewRef: ((view: 'network' | 'datalayer') => void) | null = null;
let syncPauseUIRef: ((paused: boolean) => void) | null = null;

export function setGotoNetworkRequest(fn: (reqId: number) => void): void {
  gotoNetworkRequestRef = fn;
}

export function setSwitchView(fn: (view: 'network' | 'datalayer') => void): void {
  switchViewRef = fn;
}

export function setSyncPauseUI(fn: (paused: boolean) => void): void {
  syncPauseUIRef = fn;
}

// ─── SHARED DATALAYER SELECT HANDLER ─────────────────────────────────────────

/**
 * Shared onSelect callback for DataLayer push rows.
 * Sets the selected push ID, highlights the active row, and triggers network correlation.
 */
function handleDlPushSelect(p: DataLayerPush, r: HTMLElement): void {
  dlState.setDlSelectedId(p.id);
  setActiveDlRow(r);
  if (gotoNetworkRequestRef) {
    selectDlPush(p, r, gotoNetworkRequestRef);
  }
}

// ─── DATALAYER CLEAR ──────────────────────────────────────────────────────────

export function dlClearAll(): void {
  dlState.clearDlPushes();
  dlState.clearDlFilteredIds();
  dlState.clearDlPendingPushes();

  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if ($list) {
    $list.innerHTML = '';
    if ($empty) $list.appendChild($empty);
  }
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

export function dlApplyFilter(): void {
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

export function updateDlFilterChips(): void {
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

// ─── STATUS BAR UPDATE (called by flushPendingDlPushes) ─────────────────────

function updateDlStatusBar(): void {
  _updateDlStatusBar();
}

// ─── DATALAYER FULL LIST RENDER ─────────────────────────────────────────────

export function renderDlPushListFull(): void {
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

  if (getDlGroupBySource()) {
    renderGroupedPushList($list, dlState.getDlFilteredIds(), handleDlPushSelect);
  } else {
    const sortedIds = getSortedDlPushIds();
    const filteredIds = dlState.getDlFilteredIds();
    const fragment = document.createDocumentFragment();

    for (const id of sortedIds) {
      const push = dlState.getDlPushById(id);
      if (!push) continue;
      const isVisible = filteredIds.has(id);
      try {
        const row = createDlPushRow(push, isVisible, handleDlPushSelect);
        fragment.appendChild(row);
      } catch (e) {
        console.warn('[TagDragon] Failed to create push row:', e);
      }
    }

    $list.appendChild(fragment);
  }

  updateDlStatusBar();
}

// ─── DATALAYER BATCHED RENDERING ─────────────────────────────────────────────

export function flushPendingDlPushes(): void {
  dlState.setDlRafId(null);
  const pending = dlState.getDlPendingPushes();
  if (pending.length === 0) return;

  // 1. Compute highlights + validation in batch
  const allPushes = dlState.getAllDlPushes();
  for (let i = allPushes.length - pending.length; i < allPushes.length; i++) {
    if (i < 1) continue;
    const currPush = allPushes[i];
    // Use computeCumulativeState for lazy on-demand computation with caching
    // (push.cumulativeState is null to avoid expensive snapshot on every push)
    const prevState = dlState.computeCumulativeState(i - 1);
    const currState = dlState.computeCumulativeState(i);
    const changedPaths = computeChangedPaths(prevState, currState);
    if (changedPaths.size > 0) {
      queueHighlights(changedPaths, prevState, currState);
      checkWatchPaths(prevState, currState);
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
          const row = createDlPushRow(push, isVisible, handleDlPushSelect);
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

window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (!isPanelReady) {
    // Buffer until init completes — will be flushed by init()
    earlyDlPushBuffer.push(push);
    return;
  }
  if (dlState.getDlIsPaused()) return;

  const enrichedPush: DataLayerPush = {
    ...push,
    _ts: Date.parse(push.timestamp),
    cumulativeState: null,
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

  // Queue for batched rendering
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
  dlClearAll();
};

// ─── DATALAYER HANDLERS ───────────────────────────────────────────────────────

async function initDatalayerHandlers(): Promise<void> {
  // View switching
  document.querySelectorAll('.tab-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = (btn as HTMLElement).dataset['view'] as 'network' | 'datalayer';
      if (view && switchViewRef) switchViewRef(view);
    });
  });

  // DL Pause button
  const $dlPause = document.getElementById('dl-btn-pause');
  $dlPause?.addEventListener('click', () => {
    const isPaused = !dlState.getDlIsPaused();
    if (syncPauseUIRef) syncPauseUIRef(isPaused);
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

  // DL Export format split button — wired via initExportFormatMenu
  initExportFormatMenu(
    'dl-btn-export-format',
    'dl-export-format-menu',
    'dl-export-format',
    (format) => {
      state.updateConfig('exportFormat', format);
      // Sync export tooltip via custom event
      const event = new CustomEvent('tagdragon:sync-export-tooltip');
      document.dispatchEvent(event);
    }
  );

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
    // Sync quick button (will be handled by index.ts via custom event)
    const event = new CustomEvent('tagdragon:sync-dl-quick-buttons');
    document.dispatchEvent(event);
    renderDlPushListFull();
    // Sync settings control
    const event2 = new CustomEvent('tagdragon:sync-settings', {
      detail: { key: 'cfg-dl-sort-order', value: newOrder },
    });
    document.dispatchEvent(event2);
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
  initDlDetailTabHandlers(currentPushGetter, gotoNetworkRequestRef ?? (() => {}));
}

// ─── INIT CONTROLLER ─────────────────────────────────────────────────────────

export function setPanelReady(): void {
  isPanelReady = true;
}

export function initDatalayerController(): void {
  // Expose flush functions for devtools page to call on panel shown
  window.flushPendingDlPushes = flushPendingDlPushes;

  // Initialize all event handlers
  void initDatalayerHandlers();
}

// ─── PANEL READY FLUSH ────────────────────────────────────────────────────────

export function flushEarlyDlPushes(): void {
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
