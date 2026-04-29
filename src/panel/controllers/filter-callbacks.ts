// ─── SHARED FILTER CALLBACKS ──────────────────────────────────────────────────
// Centralized filter callback definitions used by both network and toolbar controllers.

import { applyFilters } from '../utils/filter';
import { updateRowVisibility } from '../components/request-list';
import { updateStatusBar } from '../components/status-bar';
import { refreshHttpFilterPillStates } from '../components/provider-filter';
import { updateActiveFilters } from '../components/filter-bar';

export function doApplyFilters(): void {
  applyFilters(updateRowVisibility, updateStatusBar);
  refreshHttpFilterPillStates();
}

export function doUpdateActiveFilters(): void {
  updateActiveFilters(doApplyFilters);
}
