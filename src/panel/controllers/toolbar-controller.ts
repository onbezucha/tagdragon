// ═══════════════════════════════════════════════════════════════════════════
// TOOLBAR CONTROLLER
// Handles all toolbar event wiring, quick actions, pause UI, and search/filter.
// Extracted from src/panel/index.ts
// ═══════════════════════════════════════════════════════════════════════════

import * as state from '../state';
import * as dlState from '../datalayer/state';
import { DOM } from '../utils/dom';
import { selectRequest, closeDetailPane } from '../components/detail-pane';

import { clearAllCookies, clearConsentOverride } from '../components/consent-panel';
import { closeInfoPopover } from '../components/info-popover';
import { toggleSettings } from '../components/settings-drawer';
import { toggleProviderFilter, closeProviderFilter } from '../components/provider-filter';
import { closeDlFilterPopover } from '../components/dl-filter-popover';
import { setActiveDlRow } from '../datalayer/components/push-list';
import { selectDlPush } from '../datalayer/components/push-detail';
import { dlClearAll } from './datalayer-controller';
import { clearNetworkData, getExportRequests, exportCsv } from './network-controller';
import { downloadJson } from '../utils/export';

import { initExportFormatMenu } from '../utils/export-menu';
import { doApplyFilters, doUpdateActiveFilters } from './filter-callbacks';
import { FILTER_DEBOUNCE_MS } from '@/shared/constants';

// ─── TIMING CONSTANTS ───────────────────────────────────────────────────────

const COOKIE_RESET_TIMEOUT_MS = 2000;

// ─── CALLBACKS ───────────────────────────────────────────────────────────────

function doSelectRequest(data: import('@/types/request').ParsedRequest, row: HTMLElement): void {
  selectRequest(data, row);
}

function doSelectPush(push: import('@/types/datalayer').DataLayerPush, row: HTMLElement): void {
  dlState.setDlSelectedId(push.id);
  setActiveDlRow(row);
  selectDlPush(push, row, gotoNetworkRequest!);
}

// Reference to the gotoNetworkRequest function (set via setter before initToolbarHandlers)
let gotoNetworkRequest: ((reqId: number) => void) | null = null;

export function setGotoNetworkRequestRef(fn: (reqId: number) => void): void {
  gotoNetworkRequest = fn;
}

// ─── PAUSE UI SYNC ───────────────────────────────────────────────────────────

/**
 * Toggle pause/play icon and text visibility on a pause button.
 */
function togglePauseButtonState(
  btn: HTMLElement | null,
  paused: boolean,
  tooltipActive: string,
  tooltipInactive: string
): void {
  if (!btn) return;
  btn.classList.toggle('active', paused);
  const pauseIcon = btn.querySelector('.pause-icon') as HTMLElement;
  const playIcon = btn.querySelector('.play-icon') as HTMLElement;
  const pauseText = btn.querySelector('.pause-text') as HTMLElement;
  const playText = btn.querySelector('.play-text') as HTMLElement;
  if (pauseIcon) pauseIcon.style.display = paused ? 'none' : '';
  if (playIcon) playIcon.style.display = paused ? '' : 'none';
  if (pauseText) pauseText.style.display = paused ? 'none' : '';
  if (playText) playText.style.display = paused ? '' : 'none';
  btn.dataset.tooltip = paused ? tooltipActive : tooltipInactive;
}

/**
 * Synchronize all pause-related UI elements across Network and DataLayer views.
 * This is the single source of truth for pause UI state.
 */
export function syncPauseUI(paused: boolean): void {
  // Sync state
  state.setIsPaused(paused);
  dlState.setDlIsPaused(paused);
  document.body.classList.toggle('paused', paused);

  // Network pause button
  const btnPause = document.getElementById('btn-pause');
  togglePauseButtonState(btnPause, paused, 'Resume capture', 'Pause capture');

  // DataLayer pause button
  const $dlPause = document.getElementById('dl-btn-pause');
  togglePauseButtonState($dlPause, paused, 'Resume DataLayer capture', 'Pause DataLayer capture');
}

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────

function applyWrapValuesClass(): void {
  document.body.classList.toggle('wrap-values', state.getConfig().wrapValues);
}

function applyCompactRowsClass(): void {
  document.body.classList.toggle('compact-rows', state.getConfig().compactRows);
}

export function syncQuickButtons(): void {
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

export function syncDlQuickButtons(): void {
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  const order = dlState.getDlSortOrder();

  if ($dlSortBtn) {
    $dlSortBtn.classList.toggle('active', order === 'desc');
    $dlSortBtn.dataset.tooltip =
      order === 'desc'
        ? 'Newest first (click for oldest first)'
        : 'Oldest first (click for newest first)';
  }
}

// ─── EXPORT TOOLTIP SYNC ─────────────────────────────────────────────────────

function syncExportTooltip(): void {
  const fmt = state.getConfig().exportFormat.toUpperCase();

  // Network export tooltip
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.dataset.tooltip = `Export as ${fmt}`;
  }

  // DataLayer export tooltip
  const btnDlExport = document.getElementById('dl-btn-export');
  if (btnDlExport) {
    btnDlExport.dataset.tooltip = `Export as ${fmt}`;
  }

  // Update ALL format menu active states (both toolbars)
  document.querySelectorAll('.export-format-option').forEach((el) => {
    const format = (el as HTMLElement).dataset.format;
    el.classList.toggle('active', format === state.getConfig().exportFormat);
  });
}

// ─── TOOLBAR EVENTS ─────────────────────────────────────────────────────────

/**
 * Initialize all toolbar event handlers.
 * Sets up click handlers for pause, clear, search, settings, popovers, export, cookies.
 */
export function initToolbarHandlers(): void {
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

  // ─── PAUSE UI SYNC ─────────────────────────────────────────────────────────

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

  // ─── EXPORT FORMAT MENUS (popover-managed) ──────────────────────────────

  // Wire up Network export format menu
  initExportFormatMenu('btn-export-format', 'export-format-menu', 'export-format', (format) => {
    state.updateConfig('exportFormat', format);
    syncExportTooltip();
  });

  // Wire up DataLayer export format menu
  initExportFormatMenu(
    'dl-btn-export-format',
    'dl-export-format-menu',
    'dl-export-format',
    (format) => {
      state.updateConfig('exportFormat', format);
      syncExportTooltip();
    }
  );

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

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export {
  doSelectRequest,
  doSelectPush,
  applyWrapValuesClass,
  applyCompactRowsClass,
  initRequestListHandler,
};
