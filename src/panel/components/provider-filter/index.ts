// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FILTER — Public API
// Re-exports from pill-rendering and popover for backward compatibility.
// ═══════════════════════════════════════════════════════════════════════════

import { updateGroupStates, updateFooterSummary, updateHiddenBadge } from './pill-rendering';

// ─── FROM PILL-RENDERING ──────────────────────────────────────────────────────

export {
  ensureProviderPill,
  updateProviderCounts,
  resetProviderCounts,
  setProviderCounts,
  updateFilterBarVisibility,
  updateGroupStates,
  updateHiddenBadge,
  updateFooterSummary,
  ensureProviderGroup,
  showProviderContextMenu,
} from './pill-rendering';

// ─── FROM POPOVER ────────────────────────────────────────────────────────────

export {
  initProviderFilterPopover,
  toggleProviderFilter,
  closeProviderFilter,
  isProviderFilterOpen, // Renamed from isOpen
  refreshHttpFilterPillStates,
  type ProviderFilterContext,
} from './popover';

// ─── INIT PROVIDER BAR ────────────────────────────────────────────────────────

/**
 * Initialize provider bar UI state (tri-state indicators, footer, badge).
 * Safe to call at any time — reads current state and updates DOM.
 */
export function initProviderBar(): void {
  updateGroupStates();
  updateFooterSummary();
  updateHiddenBadge();
}
