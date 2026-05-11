// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v3.0 - PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

import * as state from './state';
import * as dlState from './datalayer/state';
import { DOM, flashCopyFeedback } from './utils/dom';
import { selectRequest, initTabHandlers } from './components/detail-pane';
import {
  updateStatusBar,
  updateDlStatusBar,
  updateNetworkStatusBar,
  initTimestampToggle,
} from './components/status-bar';
import { initProviderBar, initProviderFilterPopover } from './components/provider-filter';
import { initAdobeEnvSwitcher } from './components/adobe-env-switcher';
import { initConsentPanel } from './components/consent-panel';
import { initInfoPopover } from './components/info-popover';
import {
  initSettingsDrawer,
  toggleSettings,
  syncSettingsControl,
} from './components/settings-drawer';
import { initTheme } from './theme';
import { initSplitter } from './splitter';
import { initKeyboardHandlers } from './keyboard-shortcuts';
import { initDetailCopyHandlers } from './components/detail-pane';
import { initNetworkController, restorePersistedRequests } from './controllers/network-controller';
import {
  initDatalayerController,
  setPanelReady,
  flushEarlyDlPushes,
  updateDlFilterChips,
  dlApplyFilter,
  setGotoNetworkRequest,
  setSwitchView,
  setSyncPauseUI,
} from './controllers/datalayer-controller';
import { initDlFilterPopover } from './components/dl-filter-popover';
import { init as initTooltip } from './utils/tooltip';
import { initDlSortState } from './datalayer/state';
import { loadValidationRules } from './datalayer/utils/validator';
import { setValidationRules, setValidationLoaded } from './datalayer/state';
import { updateDlRowValidation } from './datalayer/components/push-list';
import { createIcons } from 'lucide';
import { PANEL_ICONS } from './utils/lucide-icons';

// Toolbar controller imports
import {
  initToolbarHandlers,
  syncPauseUI,
  syncQuickButtons,
  syncDlQuickButtons,
  doSelectRequest,
  doSelectPush,
  applyWrapValuesClass,
  applyCompactRowsClass,
  initRequestListHandler,
} from './controllers/toolbar-controller';

import { doApplyFilters, doUpdateActiveFilters } from './controllers/filter-callbacks';

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
    insertDlNavMarker: (url: string) => void;
    receivePageNavigation: (nav: import('@/types/request').PageNavigation) => void;
  }
}

// ─── DATALAYER NAVIGATION HELPERS ─────────────────────────────────────────────

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

  // Flash highlight to help user locate the row after cross-tab navigation
  row.classList.add('dl-goto-highlight');
  row.addEventListener(
    'animationend',
    () => {
      row.classList.remove('dl-goto-highlight');
    },
    { once: true }
  );
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
  if ($dlView) $dlView.style.display = view === 'datalayer' ? '' : 'none';

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
    if (copyBtn) {
      const value = (copyBtn as HTMLElement).dataset.copy;
      if (!value) return;

      navigator.clipboard
        .writeText(value)
        .then(() => {
          flashCopyFeedback(copyBtn as HTMLElement);
        })
        .catch((err) => console.error('Copy failed:', err));
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('.param-value') || target.closest('.pv')) {
      const row = target.closest('.param-row, tr');
      if (!row) return;

      const rowCopyBtn = row.querySelector('.param-copy-btn');
      if (!rowCopyBtn) return;

      const value = (rowCopyBtn as HTMLElement).dataset.copy;
      if (!value) return;

      navigator.clipboard
        .writeText(value)
        .then(() => {
          flashCopyFeedback(rowCopyBtn as HTMLElement);
        })
        .catch((err) => console.error('Copy failed:', err));
    }
  });
}

// ─── DATALAYER CONTROLLER INTEGRATION ────────────────────────────────────────

// Register index.ts functions with the datalayer controller
setGotoNetworkRequest(gotoNetworkRequest);
setSwitchView(switchView);
setSyncPauseUI(syncPauseUI);

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
  createIcons({ icons: PANEL_ICONS });

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

  // Initialize network controller (sets up window.receiveRequest and window.flushPendingRequests)
  initNetworkController();

  // Restore requests from previous panel session (survives DevTools panel reload)
  restorePersistedRequests();

  // Initialize DataLayer sort state from persisted config
  initDlSortState();

  // Sync DataLayer quick buttons visual state
  syncDlQuickButtons();

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
  syncQuickButtons(); // Initial arrow state
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
    syncDlQuickButtons,
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
  void initDatalayerController();

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
  setPanelReady();

  // Replay any pushes that arrived before init completed
  flushEarlyDlPushes();
}

// Start initialization
init();
