// ═══════════════════════════════════════════════════════════════════════════
// DATALAYER CONTROLLER
// Handles all DataLayer-related state, rendering, and event binding.
// Extracted from src/panel/index.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { DataLayerPush, DataLayerSource, DlNavMarker } from '@/types/datalayer';
import { isDlNavMarker } from '@/types/datalayer';
import { generateId } from '@/shared/id-gen';
import { computeChangedPaths } from '../datalayer/utils/changed-paths';
import { findCorrelatedRequests } from '../datalayer/utils/correlation';

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
  renderDlNavMarker,
} from '../datalayer/components/push-list';
import {
  selectDlPush,
  closeDlDetail,
  initDlDetailTabHandlers,
  incrementLiveTabBadge,
  resetLiveTabBadge,
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
  getDlNavMarkerCount,
} from '../datalayer/state';

import { initExportFormatMenu } from '../utils/export-menu';
import { syncDlQuickButtons } from './toolbar-controller';

import { SOURCE_DESCRIPTIONS } from '@/shared/datalayer-constants';
import { updateDlStatusBar } from '../components/status-bar';
import { toggleDlFilterPopover } from '../components/dl-filter-popover';
import { FILTER_DEBOUNCE_MS } from '@/shared/constants';

// ─── MODULE-LEVEL STATE ─────────────────────────────────────────────────────

// Module-level flag — set to true after init completes
let isPanelReady = false;

// Module-level buffer for pushes arriving before init completes
const earlyDlPushBuffer: DataLayerPush[] = [];

/** Track the most recent nav marker ID for push stamping */
let _currentDlNavMarkerId: number | undefined;

// ─── EXTERNAL HELPERS (imported from index.ts) ──────────────────────────────

// These are set by initDatalayerController() after index.ts initializes them
let gotoNetworkRequestRef: ((reqId: number) => void) | null = null;
let switchViewRef: ((view: 'network' | 'datalayer') => void) | null = null;
let syncPauseUIRef: ((paused: boolean) => void) | null = null;

export function setGotoNetworkRequest(fn: (reqId: number) => void): void {
  gotoNetworkRequestRef = fn;
}

export function getGotoNetworkRequest(): ((reqId: number) => void) | null {
  return gotoNetworkRequestRef;
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
  applyDlSectionHighlight(r);
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
  resetLiveTabBadge();
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
        dlState.getDlEcommerceOnly(),
        dlState.getDlHideGtmSystem()
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

  if (dlState.getDlHideGtmSystem()) {
    const chip = createDlFilterChip('GTM', 'system events hidden', () => {
      dlState.setDlHideGtmSystem(false);
      const $btn = document.getElementById('dl-btn-hide-gtm');
      if ($btn) $btn.classList.remove('active');
      dlApplyFilter();
      updateDlFilterChips();
    });
    chips.push(chip);
  }

  chips.forEach((c) => $bar.appendChild(c));
  $bar.classList.toggle('visible', chips.length > 0);
}

// ─── DATALAYER FULL LIST RENDER ─────────────────────────────────────────────

export function renderDlPushListFull(): void {
  // Invalidate sort cache before rendering (cache may be stale after prune)
  invalidateDlSortCache();

  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if (!$list) return;

  $list.innerHTML = '';

  if (dlState.getDlTotalCount() === 0 && getDlNavMarkerCount() === 0) {
    if ($empty) $empty.style.display = '';
    return;
  }

  if ($empty) $empty.style.display = 'none';

  if (getDlGroupBySource()) {
    renderGroupedPushList($list, dlState.getDlFilteredIds(), handleDlPushSelect);
  } else {
    const sortedIds = getSortedDlPushIds();
    const filteredIds = dlState.getDlFilteredIds();
    const sessionStart = dlState.getAllDlPushes()[0]?.timestamp;
    const fragment = document.createDocumentFragment();

    for (const id of sortedIds) {
      const entry = dlState.getDlEntryById(id);
      if (!entry) continue;

      // DD-5: Render marker or push based on discriminator
      if (isDlNavMarker(entry)) {
        const markerRow = renderDlNavMarker(entry);
        fragment.appendChild(markerRow);
      } else {
        const isVisible = filteredIds.has(id);
        try {
          const row = createDlPushRow(entry, isVisible, handleDlPushSelect, sessionStart);
          fragment.appendChild(row);
        } catch (e) {
          console.warn('[TagDragon] Failed to create push row:', e);
        }
      }
    }

    $list.appendChild(fragment);
  }

  updateDlStatusBar();

  // Update divider counts after full render
  updateDlDividerCounts();
}

// ─── DATALAYER BATCHED RENDERING ─────────────────────────────────────────────

export function flushPendingDlPushes(): void {
  dlState.setDlRafId(null);
  const pending = dlState.getDlPendingPushes();
  if (pending.length === 0) return;

  // 1. Compute highlights + validation in batch
  // Use getAllDlEntries() so indices align with dlState.all (used by computeCumulativeState)
  const allEntries = dlState.getAllDlEntries();
  let pendingCount = pending.length;

  for (let i = allEntries.length - 1; i >= 0 && pendingCount > 0; i--) {
    const entry = allEntries[i];
    if (isDlNavMarker(entry)) continue;

    pendingCount--;
    if (i < 1) continue;

    const prevState = dlState.computeCumulativeState(i - 1);
    const currState = dlState.computeCumulativeState(i);
    const changedPaths = computeChangedPaths(prevState, currState);
    // Cache diff count for push row badge
    (entry as { _diffCount?: number })._diffCount = changedPaths.size;
    if (changedPaths.size > 0) {
      queueHighlights(changedPaths, prevState, currState);
      checkWatchPaths(prevState, currState);
    }

    if (dlState.isValidationLoaded()) {
      const rules = dlState.getValidationRules();
      const errors = validatePush(entry, rules);
      if (errors.length > 0) {
        dlState.setValidationErrors(entry.id, errors);
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
      const sessionStart = dlState.getAllDlPushes()[0]?.timestamp;
      const fragment = document.createDocumentFragment();

      for (const { push, isVisible } of pendingToRender) {
        try {
          const row = createDlPushRow(push, isVisible, handleDlPushSelect, sessionStart);
          fragment.appendChild(row);
        } catch (e) {
          console.warn('[TagDragon] Failed to create push row:', e);
        }
      }
      if (isDesc) {
        // Insert after the first divider so the nav marker stays at the top of its section
        const $firstDivider = $list.querySelector(':scope > .dl-page-divider');
        if ($firstDivider) {
          $list.insertBefore(fragment, $firstDivider.nextSibling);
        } else {
          $list.insertBefore(fragment, $list.firstChild);
        }
      } else {
        $list.appendChild(fragment);
      }

      // Update divider counts after incremental DOM update
      updateDlDividerCounts();
    }
  }

  dlState.clearDlPendingPushes();

  // Notify Live tab about new pushes (for notification badge)
  for (const _ of pending) {
    incrementLiveTabBadge();
  }

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

  // Auto-highlight the latest nav section
  highlightLatestDlSection();
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

  // Pre-compute correlation count for push row badge
  const allRequests = state.getAllRequests();
  const windowMs = dlState.getCorrelationWindow();
  (enrichedPush as { _correlatedCount?: number })._correlatedCount = findCorrelatedRequests(
    enrichedPush,
    allRequests,
    windowMs
  ).length;

  // Invalidate cached search index so enriched fields are included
  delete (enrichedPush as { _searchIndex?: string })._searchIndex;

  // Stamp push with current nav marker ID
  if (_currentDlNavMarkerId !== undefined) {
    (enrichedPush as { _dlNavMarkerId?: number })._dlNavMarkerId = _currentDlNavMarkerId;
    dlState.incrementNavPushCount(_currentDlNavMarkerId);
  }

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
    const $dlBadge = DOM.tabBadgeDatalayer;
    if ($dlBadge) $dlBadge.textContent = String(dlState.getDlTotalCount());
    const $count = document.getElementById('dl-push-count');
    if ($count) {
      const n = dlState.getDlTotalCount();
      $count.textContent = `${n} push${n !== 1 ? 'es' : ''}`;
    }
    updateDlFilterChips();
    highlightLatestDlSection();
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
    dlState.getDlEcommerceOnly(),
    dlState.getDlHideGtmSystem()
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

  // Update empty state hint based on detected sources
  const $emptyHint = document.getElementById('dl-empty-hint');
  if ($emptyHint) {
    if (sources.length > 0) {
      const detectedLabels = sources.map((s) => labels[s] ?? s.toUpperCase()).join(', ');
      $emptyHint.textContent = `${detectedLabels} detected but no pushes captured yet. Try interacting with the page or click Re-inject Scripts.`;
    } else {
      $emptyHint.textContent =
        'Open a page with GTM, Tealium, Adobe, or Segment to see DataLayer pushes';
    }
  }
};

// ─── NAVIGATION MARKER ────────────────────────────────────────────────────

function updateDlDividerCounts(): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  const markers = dlState.getDlNavMarkers();
  const pushCounts = dlState.getNavPushCounts();
  for (const marker of markers) {
    const divider = $list.querySelector(`.dl-page-divider[data-nav-id="${marker.id}"]`);
    if (!divider) continue;

    const count = pushCounts.get(marker.id) ?? 0;
    const countEl = divider.querySelector('.dl-page-divider-count');
    if (countEl) countEl.textContent = String(count);
  }
}

function initDlDividerInteractions(): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  $list.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const divider = target.closest('.dl-page-divider') as HTMLElement | null;
    if (divider) {
      toggleDlCollapse(divider);
      e.stopPropagation();
    }
  });
}

function toggleDlCollapse(divider: HTMLElement): void {
  divider.classList.toggle('collapsed');

  const isCollapsed = divider.classList.contains('collapsed');
  const navId = divider.dataset.navId;
  if (!navId) return;

  const $list = DOM.dlPushList;
  if (!$list) return;

  const rows = $list.querySelectorAll(`.dl-push-row[data-dl-nav-id="${navId}"]`);
  for (const row of rows) {
    if (isCollapsed) {
      row.classList.add('page-collapsed');
    } else {
      row.classList.remove('page-collapsed');
    }
  }
}

function applyDlSectionHighlight(row: HTMLElement): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  // Clear previous highlights
  $list
    .querySelectorAll('.dl-page-divider.section-active')
    .forEach((d) => d.classList.remove('section-active'));
  $list
    .querySelectorAll('.dl-push-row.section-active')
    .forEach((r) => r.classList.remove('section-active'));
  $list
    .querySelectorAll('.dl-page-divider.section-dimmed')
    .forEach((d) => d.classList.remove('section-dimmed'));
  $list
    .querySelectorAll('.dl-push-row.section-dimmed')
    .forEach((r) => r.classList.remove('section-dimmed'));

  const navId = (row.dataset as Record<string, string>).dlNavId;
  if (!navId) return;

  const sectionCfg = state.getConfig();

  // Accent bar
  if (sectionCfg.sectionAccentBar) {
    const divider = $list.querySelector(`.dl-page-divider[data-nav-id="${navId}"]`);
    if (divider) divider.classList.add('section-active');

    $list
      .querySelectorAll(`.dl-push-row[data-dl-nav-id="${navId}"]`)
      .forEach((r) => r.classList.add('section-active'));
  }

  // Dimming
  if (sectionCfg.sectionDimOthers) {
    $list.style.setProperty('--section-dim-opacity', String(sectionCfg.sectionDimOpacity));

    $list
      .querySelectorAll(`.dl-page-divider:not([data-nav-id="${navId}"])`)
      .forEach((d) => d.classList.add('section-dimmed'));

    $list
      .querySelectorAll(`.dl-push-row:not([data-dl-nav-id="${navId}"])`)
      .forEach((r) => r.classList.add('section-dimmed'));
  }
}

/**
 * Auto-highlights the latest (current) page navigation section.
 * Uses `_currentDlNavMarkerId` to highlight the most recent nav marker section
 * and dims all other sections. No arguments — reads from module state.
 */
function highlightLatestDlSection(): void {
  const $list = DOM.dlPushList;
  if (!$list || _currentDlNavMarkerId === undefined) return;

  const navId = String(_currentDlNavMarkerId);
  const sectionCfg = state.getConfig();

  // Clear previous highlights
  $list
    .querySelectorAll('.dl-page-divider.section-active')
    .forEach((d) => d.classList.remove('section-active'));
  $list
    .querySelectorAll('.dl-push-row.section-active')
    .forEach((r) => r.classList.remove('section-active'));
  $list
    .querySelectorAll('.dl-page-divider.section-dimmed')
    .forEach((d) => d.classList.remove('section-dimmed'));
  $list
    .querySelectorAll('.dl-push-row.section-dimmed')
    .forEach((r) => r.classList.remove('section-dimmed'));

  // Accent bar
  if (sectionCfg.sectionAccentBar) {
    const divider = $list.querySelector(`.dl-page-divider[data-nav-id="${navId}"]`);
    if (divider) divider.classList.add('section-active');

    $list
      .querySelectorAll(`.dl-push-row[data-dl-nav-id="${navId}"]`)
      .forEach((r) => r.classList.add('section-active'));
  }

  // Dimming
  if (sectionCfg.sectionDimOthers) {
    $list.style.setProperty('--section-dim-opacity', String(sectionCfg.sectionDimOpacity));

    $list
      .querySelectorAll(`.dl-page-divider:not([data-nav-id="${navId}"])`)
      .forEach((d) => d.classList.add('section-dimmed'));

    $list
      .querySelectorAll(`.dl-push-row[data-dl-nav-id]:not([data-dl-nav-id="${navId}"])`)
      .forEach((r) => r.classList.add('section-dimmed'));
  }
}

window.insertDlNavMarker = function (url: string): void {
  // DD-3: No marker when paused
  if (dlState.getDlIsPaused()) return;

  // DD-4: Reset live inspector state for the new page context
  clearLiveState();

  const now = new Date();
  const marker: DlNavMarker = {
    id: generateId(),
    _type: 'nav-marker',
    timestamp: now.toISOString(),
    url,
    source: 'navigation',
    sourceLabel: 'Navigation',
    pushIndex: -1,
    data: {},
    cumulativeState: null,
    isReplay: false,
    _ecommerceType: null,
    _eventName: undefined,
    _ts: now.getTime(),
  };

  _currentDlNavMarkerId = marker.id;

  // Insert marker into the unified timeline via existing mechanism
  dlState.addDlPush(marker);

  // Render the marker incrementally
  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if ($empty) $empty.style.display = 'none';

  if ($list) {
    const sortField = getDlSortField();
    const sortOrd = getDlSortOrder();

    if (sortField === 'time' && !getDlGroupBySource()) {
      // Time-based sort: insert at correct position (top for desc, bottom for asc)
      const row = renderDlNavMarker(marker);
      if (sortOrd === 'desc') {
        $list.insertBefore(row, $list.firstChild);
      } else {
        $list.appendChild(row);
      }
    } else {
      // Non-time sort or grouped: full re-render needed
      renderDlPushListFull();
    }
  }

  updateDlDividerCounts();
  highlightLatestDlSection();
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
    syncDlQuickButtons();
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

  // DL Hide GTM system events toggle
  const $dlHideGtm = document.getElementById('dl-btn-hide-gtm');
  $dlHideGtm?.addEventListener('click', () => {
    const current = dlState.getDlHideGtmSystem();
    dlState.setDlHideGtmSystem(!current);
    $dlHideGtm.classList.toggle('active', !current);
    dlApplyFilter();
    updateDlFilterChips();
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

  // Initialize divider click interactions
  initDlDividerInteractions();

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
