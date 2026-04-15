// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FILTER POPOVER — Standalone provider filter UI
// ═══════════════════════════════════════════════════════════════════════════

import { DOM, qsa } from '../utils/dom';
import { closeAllPopovers, registerPopover } from '../utils/popover-manager';
import { getActiveProviders, getHiddenProviders, syncHiddenProviders } from '../state';
import { updateGroupStates, updateHiddenBadge, updateFooterSummary } from './provider-bar';

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface ProviderFilterContext {
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
}

// ─── STATE ────────────────────────────────────────────────────────────────

let ctx: ProviderFilterContext | null = null;
let providerFilterOpen = false;

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export function initProviderFilterPopover(context: ProviderFilterContext): void {
  ctx = context;

  // Close button
  DOM.btnProviderPopoverClose?.addEventListener('click', closeProviderFilter);

  // Search input — filter pills in real-time
  DOM.providerSearchInput?.addEventListener('input', () => {
    const q = DOM.providerSearchInput!.value.toLowerCase();
    document.querySelectorAll('.ppill').forEach((pill) => {
      const name = ((pill as HTMLElement).dataset.provider ?? '').toLowerCase();
      pill.classList.toggle('search-hidden', !name.includes(q));
    });
    // Hide/show groups that have no visible pills
    document.querySelectorAll('.pgroup').forEach((group) => {
      const visiblePills = group.querySelectorAll('.ppill:not(.search-hidden)');
      group.classList.toggle('search-empty', visiblePills.length === 0);
    });
  });

  // Show all button
  document.getElementById('btn-show-all-providers')?.addEventListener('click', () => {
    const hiddenProviders = getHiddenProviders();
    hiddenProviders.clear();
    // Update all pills to active state
    qsa('.ppill').forEach((p) => {
      p.classList.remove('inactive');
      p.classList.add('active');
      const iconEl = p.querySelector('.ppill-icon');
      iconEl?.classList.remove('icon-hidden');
    });
    syncHiddenProviders();
    updateGroupStates();
    updateFooterSummary();
    updateHiddenBadge();
    ctx?.doApplyFilters();
    ctx?.doUpdateActiveFilters();
  });

  // Hide all button
  document.getElementById('btn-hide-all-providers')?.addEventListener('click', () => {
    const hiddenProviders = getHiddenProviders();
    const activeProviders = getActiveProviders();
    for (const p of activeProviders) hiddenProviders.add(p);
    // Update all pills to inactive state
    qsa('.ppill').forEach((p) => {
      p.classList.remove('active');
      p.classList.add('inactive');
      const iconEl = p.querySelector('.ppill-icon');
      iconEl?.classList.add('icon-hidden');
    });
    syncHiddenProviders();
    updateGroupStates();
    updateFooterSummary();
    updateHiddenBadge();
    ctx?.doApplyFilters();
    ctx?.doUpdateActiveFilters();
  });

  // Register with popover manager
  registerPopover('provider-filter', closeProviderFilter);
}

export function openProviderFilter(): void {
  closeAllPopovers();
  DOM.providerFilterPopover?.classList.add('visible');
  providerFilterOpen = true;
}

export function closeProviderFilter(): void {
  DOM.providerFilterPopover?.classList.remove('visible');
  providerFilterOpen = false;
  // Clear search input on close
  if (DOM.providerSearchInput) {
    DOM.providerSearchInput.value = '';
    // Reset pill visibility
    qsa('.ppill').forEach((pill) => {
      pill.classList.remove('search-hidden');
    });
    qsa('.pgroup').forEach((group) => {
      group.classList.remove('search-empty');
    });
  }
}

export function toggleProviderFilter(): void {
  if (providerFilterOpen) {
    closeProviderFilter();
  } else {
    openProviderFilter();
  }
}

export function isOpen(): boolean {
  return providerFilterOpen;
}
