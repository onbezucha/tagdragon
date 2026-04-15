// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';
import { DOM } from './utils/dom';
import { closeDetailPane } from './components/detail-pane';
import { navigateList, navigateToEdge } from './components/request-list';
import { navigateDlList, navigateDlToEdge } from './datalayer/components/push-list';
import { closeDlDetail } from './datalayer/components/push-detail';
import * as state from './state';
import * as dlState from './datalayer/state';
import { isMac } from './utils/platform';
import { isOpen as isSettingsOpen, closeSettings } from './components/settings-drawer';
import {
  isOpen as isProviderFilterOpen,
  closeProviderFilter,
} from './components/provider-filter-popover';
import {
  isOpen as isDlFilterPopoverOpen,
  closeDlFilterPopover,
} from './components/dl-filter-popover';
import { isOpen as isInfoPopoverOpen, closeInfoPopover } from './components/info-popover';

export interface KeyboardContext {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  doSelectRequest: (data: ParsedRequest, row: HTMLElement) => void;
  doSelectPush: (push: DataLayerPush, row: HTMLElement) => void;
  toggleSettingsDrawer: () => void;
}

// ─── GUARD HELPERS ────────────────────────────────────────────────────────────

/**
 * Check if any interactive element (input, button, link, etc.) is focused.
 * All single-key shortcuts must be guarded by this to prevent
 * interference with native element behavior (e.g. Space activating a button).
 */
function isInteractiveFocused(): boolean {
  const ae = document.activeElement;
  if (!ae) return false;
  if (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') return true;
  if ((ae as HTMLElement).isContentEditable) return true;
  if (ae.tagName === 'BUTTON' || ae.tagName === 'A' || ae.tagName === 'SELECT') return true;
  const role = ae.getAttribute('role');
  if (role === 'button' || role === 'tab' || role === 'checkbox' || role === 'switch') return true;
  return false;
}

/**
 * Check if any popover or drawer is open.
 * Used to guard shortcuts like `/` from conflicting with
 * popover search inputs.
 */
function isAnyPopoverOpen(): boolean {
  return (
    isProviderFilterOpen() || isDlFilterPopoverOpen() || isInfoPopoverOpen() || isSettingsOpen()
  );
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export function initKeyboardHandlers(ctx: KeyboardContext): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // ── Backspace = Clear all (network or DL based on active view) ──
    if (e.key === 'Backspace' && !isInteractiveFocused()) {
      e.preventDefault();
      const view = ctx.getActiveView();
      if (view === 'datalayer') {
        document.getElementById('dl-btn-clear')?.click();
      } else {
        document.getElementById('btn-clear-all')?.click();
      }
      return;
    }

    // ── / = Focus search ──
    if (e.key === '/' && !isInteractiveFocused() && !isAnyPopoverOpen()) {
      e.preventDefault();
      if (ctx.getActiveView() === 'network') {
        DOM.filterInput?.focus();
      } else {
        DOM.dlFilterInput?.focus();
      }
      return;
    }

    // ── Ctrl+, = Toggle settings drawer (Win + Mac) ──
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      ctx.toggleSettingsDrawer();
      return;
    }

    // ── Space = Pause / Resume capture ──
    if (e.key === ' ' && !isInteractiveFocused()) {
      e.preventDefault();
      document.getElementById('btn-pause')?.click();
      return;
    }

    // ── E = Export captured data ──
    if (e.key === 'e' && !isInteractiveFocused() && !isAnyPopoverOpen()) {
      e.preventDefault();
      const view = ctx.getActiveView();
      if (view === 'datalayer') {
        document.getElementById('dl-btn-export')?.click();
      } else {
        document.getElementById('btn-export')?.click();
      }
      return;
    }

    // ── T = Toggle dark / light theme ──
    if (e.key === 't' && !isInteractiveFocused() && !isAnyPopoverOpen()) {
      e.preventDefault();
      document.getElementById('btn-theme-toggle')?.click();
      return;
    }

    // ── Escape = Close popover → clear search → close detail ──
    if (e.key === 'Escape') {
      // 1. Close provider filter popover
      if (isProviderFilterOpen()) {
        closeProviderFilter();
        return;
      }
      // 2. Close DL filter popover
      if (isDlFilterPopoverOpen()) {
        closeDlFilterPopover();
        return;
      }
      // 3. Close info popover
      if (isInfoPopoverOpen()) {
        closeInfoPopover();
        return;
      }
      // 4. Close settings drawer
      if (isSettingsOpen()) {
        closeSettings();
        return;
      }
      // 5. Clear network search if focused
      if (document.activeElement === DOM.filterInput) {
        state.setFilterText('');
        if (DOM.filterInput) DOM.filterInput.value = '';
        DOM.filterInput?.blur();
        ctx.doApplyFilters();
        ctx.doUpdateActiveFilters();
      }
      // 6. Clear DL search if focused
      else if (document.activeElement === DOM.dlFilterInput) {
        const $input = DOM.dlFilterInput;
        if ($input) {
          $input.value = '';
          $input.blur();
        }
        dlState.setDlFilterText('');
        // Trigger DL filter re-apply
        const event = new Event('input', { bubbles: true });
        $input?.dispatchEvent(event);
      }
      // 7. Close network detail pane
      else if (!DOM.detail?.classList.contains('hidden')) {
        closeDetailPane();
      }
      // 8. Close DataLayer detail pane
      else if (!DOM.dlDetailPane?.classList.contains('hidden')) {
        closeDlDetail();
        dlState.setDlSelectedId(null);
      }
      return;
    }

    // ── Arrow keys = Navigate list (network or DL, based on view) ──
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isInteractiveFocused()) {
      e.preventDefault();
      const view = ctx.getActiveView();
      if (view === 'datalayer') {
        navigateDlList(e.key === 'ArrowDown' ? 1 : -1, ctx.doSelectPush);
      } else {
        navigateList(e.key === 'ArrowDown' ? 1 : -1, ctx.doSelectRequest);
      }
      return;
    }

    // ── Home / ⌘↑ = Jump to first item ──
    if (
      (e.key === 'Home' || (isMac && e.metaKey && e.key === 'ArrowUp')) &&
      !isInteractiveFocused()
    ) {
      e.preventDefault();
      const view = ctx.getActiveView();
      if (view === 'datalayer') {
        navigateDlToEdge('first', ctx.doSelectPush);
      } else {
        navigateToEdge('first', ctx.doSelectRequest);
      }
      return;
    }

    // ── End / ⌘↓ = Jump to last item ──
    if (
      (e.key === 'End' || (isMac && e.metaKey && e.key === 'ArrowDown')) &&
      !isInteractiveFocused()
    ) {
      e.preventDefault();
      const view = ctx.getActiveView();
      if (view === 'datalayer') {
        navigateDlToEdge('last', ctx.doSelectPush);
      } else {
        navigateToEdge('last', ctx.doSelectRequest);
      }
      return;
    }

    // ── Number keys 1-5 = Switch detail tab (when detail pane is open) ──
    if (
      e.key >= '1' &&
      e.key <= '5' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isInteractiveFocused() &&
      !isAnyPopoverOpen()
    ) {
      // Check if either detail pane is open
      const networkDetailOpen = !DOM.detail?.classList.contains('hidden');
      const dlDetailOpen = !DOM.dlDetailPane?.classList.contains('hidden');
      if (!networkDetailOpen && !dlDetailOpen) return;

      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      const view = ctx.getActiveView();
      const tabSelector = view === 'network' ? '.dtab' : '.dl-dtab';
      const tabs = document.querySelectorAll(tabSelector);
      if (tabs[tabIndex] && !(tabs[tabIndex] as HTMLElement).classList.contains('disabled')) {
        (tabs[tabIndex] as HTMLElement).click();
      }
      return;
    }
  });
}
