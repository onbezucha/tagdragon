// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';
import { DOM } from './utils/dom';
import { closeDetailPane } from './components/detail-pane';
import { navigateList, navigateToEdge } from './components/request-list';
import * as state from './state';
import { isMac } from './utils/platform';

export interface KeyboardContext {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  doSelectRequest: (data: ParsedRequest, row: HTMLElement) => void;
}

export function initKeyboardHandlers(ctx: KeyboardContext): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+L = clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      document.getElementById('btn-clear-all')?.click();
      return;
    }

    // Ctrl+F = focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      if (ctx.getActiveView() === 'network') {
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
        ctx.doApplyFilters();
        ctx.doUpdateActiveFilters();
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
      navigateList(e.key === 'ArrowDown' ? 1 : -1, ctx.doSelectRequest);
      return;
    }

    // Home/End (on Mac: Cmd+ArrowUp / Cmd+ArrowDown)
    if (
      (e.key === 'Home' || (isMac && e.metaKey && e.key === 'ArrowUp')) &&
      document.activeElement !== DOM.filterInput
    ) {
      e.preventDefault();
      navigateToEdge('first', ctx.doSelectRequest);
      return;
    }
    if (
      (e.key === 'End' || (isMac && e.metaKey && e.key === 'ArrowDown')) &&
      document.activeElement !== DOM.filterInput
    ) {
      e.preventDefault();
      navigateToEdge('last', ctx.doSelectRequest);
      return;
    }
  });
}
