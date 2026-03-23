// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v3.0 - PANEL CONTROLLER
// Main entry point - initializes components and handles request flow
// ═══════════════════════════════════════════════════════════════════════════

import type { ParsedRequest } from '@/types/request';
import { DOM, qsa } from './utils/dom';
import { getEventName } from './utils/format';
import { indexRequest } from './utils/categorize';
import { applyFilters, matchesFilter } from './utils/filter';
import * as state from './state';

// Components
import { createRequestRow, updateRowVisibility, navigateList, navigateToEdge } from './components/request-list';
import { selectRequest, initTabHandlers, closeDetailPane, clearTabCache } from './components/detail-pane';
import { ensureProviderPill, updateProviderCounts, initProviderBarHandlers, updateFilterBarVisibility } from './components/provider-bar';
import { updateActiveFilters, initFilterPopoverHandlers } from './components/filter-bar';
import { updateStatusBar, showPruneNotification, clearPruneTimer } from './components/status-bar';
import { initAdobeEnvSwitcher } from './components/adobe-env-switcher';
import { initConsentPanel, clearAllCookies, clearConsentOverride } from './components/consent-panel';
import { initInfoPopover, closeInfoPopover } from './components/info-popover';
import { initTheme } from './theme';

// Extend Window interface for receiveRequest
declare global {
  interface Window {
    receiveRequest: (data: ParsedRequest) => void;
    _clearHeavyData?: () => void;
    _deleteHeavyData?: (ids: number[]) => void;
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
    window._deleteHeavyData(removed.map(r => r.id));
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
    qsa('.req-row.active').forEach((r) => r.classList.remove('active'));
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
    const isVisible =
      !state.isProviderHidden(data.provider) && matchesFilter(data);

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

  $splitter.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
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
      (document.getElementById('btn-clear') as HTMLButtonElement)?.click();
      return;
    }

    // Ctrl+Shift+F = open filter popover
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      (document.getElementById('btn-add-filter') as HTMLButtonElement)?.click();
      return;
    }

    // Ctrl+F = focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      DOM.filterInput?.focus();
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
    if (
      (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
      document.activeElement !== DOM.filterInput
    ) {
      e.preventDefault();
      navigateList(
        e.key === 'ArrowDown' ? 1 : -1,
        doSelectRequest
      );
      return;
    }

    // Home/End
    if (
      e.key === 'Home' &&
      document.activeElement !== DOM.filterInput
    ) {
      e.preventDefault();
      navigateToEdge('first', doSelectRequest);
      return;
    }
    if (
      e.key === 'End' &&
      document.activeElement !== DOM.filterInput
    ) {
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
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const chkPause = document.getElementById('chk-pause') as HTMLInputElement;
  const btnCloseDetail = document.getElementById('btn-close-detail') as HTMLButtonElement;
  const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
  const btnClearCookies = document.getElementById('btn-clear-cookies') as HTMLButtonElement;
  const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
  const btnResetFilters = document.getElementById('btn-reset-filters') as HTMLButtonElement;

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

  // Pause checkbox
  chkPause?.addEventListener('change', (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    state.setIsPaused(checked);
    document.body.classList.toggle('paused', checked);
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
      const blob = new Blob(
        [JSON.stringify(state.getAllRequests(), null, 2)],
        { type: 'application/json' }
      );
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
  btnSettings?.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    DOM.settingsPopover?.classList.toggle('visible');
    DOM.providerPopover?.classList.remove('visible');
    DOM.consentPopover?.classList.remove('visible');
    closeInfoPopover();
  });

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !DOM.settingsPopover?.contains(target) &&
      !target.closest('#btn-settings')
    ) {
      DOM.settingsPopover?.classList.remove('visible');
    }
    if (
      !DOM.providerPopover?.contains(target) &&
      !target.closest('#btn-providers')
    ) {
      DOM.providerPopover?.classList.remove('visible');
    }
    if (
      !DOM.infoPopover?.contains(target) &&
      !target.closest('#btn-info')
    ) {
      closeInfoPopover();
    }
  });

  // Provider popover
  const btnProviders = document.getElementById('btn-providers') as HTMLButtonElement;
  btnProviders?.addEventListener('click', (e: MouseEvent) => {
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
    qsa('.ppill.inactive').forEach((p) =>
      p.classList.replace('inactive', 'active')
    );
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
  const sortBtn = document.getElementById('btn-quick-sort') as HTMLButtonElement | null;
  const wrapBtn = document.getElementById('btn-quick-wrap') as HTMLButtonElement | null;
  const expandBtn = document.getElementById('btn-quick-expand') as HTMLButtonElement | null;
  const compactBtn = document.getElementById('btn-quick-compact') as HTMLButtonElement | null;

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
  const cfgMaxEl = document.getElementById('cfg-max-requests') as HTMLInputElement;
  const cfgPruneEl = document.getElementById('cfg-auto-prune') as HTMLInputElement;

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
      const value = (e.target as HTMLSelectElement).value as 'asc' | 'desc';
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
      const value = (e.target as HTMLSelectElement).value as 'decoded' | 'query' | 'post' | 'headers' | 'response';
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
      const value = (e.target as HTMLSelectElement).value as 'absolute' | 'relative' | 'elapsed';
      state.updateConfig('timestampFormat', value);
    });
  }

  const cfgExportFmtEl = document.getElementById('cfg-export-format') as HTMLSelectElement | null;
  if (cfgExportFmtEl) {
    cfgExportFmtEl.value = state.getConfig().exportFormat;
    cfgExportFmtEl.addEventListener('change', (e: Event) => {
      const value = (e.target as HTMLSelectElement).value as 'json' | 'csv';
      state.updateConfig('exportFormat', value);
    });
  }
}

// ─── CATEGORY TOGGLE ─────────────────────────────────────────────────────────
function initCategoryToggle(): void {
  document.addEventListener('click', (e: MouseEvent) => {
    const header = (e.target as HTMLElement).closest('.category-header');
    if (!header) return;
    header.classList.toggle('collapsed');
    const content = header.nextElementSibling;
    if (content && content.classList.contains('category-content')) {
      content.classList.toggle('collapsed');
    }
    // Persist collapsed state
    const catKey = (header.closest('.category-section') as HTMLElement)?.dataset.category;
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
  document.addEventListener('click', (e: MouseEvent) => {
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
  DOM.list?.addEventListener('click', (e: MouseEvent) => {
    const row = (e.target as HTMLElement).closest('.req-row');
    if (!row) return;
    const id = (row as HTMLElement).dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (data) selectRequest(data, row as HTMLElement);
  });
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
}

// Start initialization
init();
