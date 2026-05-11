// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FILTER POPOVER — Standalone provider filter UI
// ═══════════════════════════════════════════════════════════════════════════

import { DOM, qsa } from '../../utils/dom';
import { closeAllPopovers, registerPopover } from '../../utils/popover-manager';
import {
  getActiveProviders,
  getHiddenProviders,
  syncHiddenProviders,
  getFilterStatus,
  setFilterStatus,
  getFilterMethod,
  setFilterMethod,
  getAllRequests,
} from '../../state';
import { updateGroupStates, updateHiddenBadge, updateFooterSummary } from './pill-dom-updates';

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface ProviderFilterContext {
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
}

// ─── STATE ────────────────────────────────────────────────────────────────

let ctx: ProviderFilterContext | null = null;
let providerFilterOpen = false;

// ─── HTTP FILTER CONSTANTS ───────────────────────────────────────────────

const STATUS_PREFIXES = ['2xx', '3xx', '4xx', '5xx'] as const;
const METHODS: readonly ('GET' | 'POST')[] = ['GET', 'POST'];

/**
 * Count requests by status prefix.
 */
function countByStatusPrefix(): Record<string, number> {
  const counts: Record<string, number> = {};
  getAllRequests().forEach((req) => {
    const prefix = req.status ? String(req.status)[0] + 'xx' : null;
    if (prefix) counts[prefix] = (counts[prefix] || 0) + 1;
  });
  return counts;
}

/**
 * Count requests by method.
 */
function countByMethod(): Record<string, number> {
  const counts: Record<string, number> = {};
  getAllRequests().forEach((req) => {
    counts[req.method] = (counts[req.method] || 0) + 1;
  });
  return counts;
}

/**
 * Render status and method filter pills in the popover.
 */
function renderHttpFilterPills(): void {
  // ─── Status pills ──────────────────────────────────────────────────────
  const statusContainer = document.getElementById('http-status-pills');
  if (!statusContainer) return;

  statusContainer.innerHTML = '';
  const statusCounts = countByStatusPrefix();
  const activeStatus = getFilterStatus();

  STATUS_PREFIXES.forEach((prefix) => {
    const pill = document.createElement('div');
    pill.className = `hpill${activeStatus === prefix ? ' active' : ''}`;
    pill.dataset.prefix = prefix;
    pill.innerHTML = `${prefix} <span class="hpill-count">${statusCounts[prefix] || 0}</span>`;
    pill.addEventListener('click', () => {
      const current = getFilterStatus();
      setFilterStatus(current === prefix ? '' : prefix);
      refreshHttpFilterPillStates();
      ctx?.doApplyFilters();
      ctx?.doUpdateActiveFilters();
    });
    statusContainer.appendChild(pill);
  });

  // ─── Method pills ──────────────────────────────────────────────────────
  const methodContainer = document.getElementById('http-method-pills');
  if (!methodContainer) return;

  methodContainer.innerHTML = '';
  const methodCounts = countByMethod();
  const activeMethod = getFilterMethod();

  METHODS.forEach((method) => {
    const pill = document.createElement('div');
    pill.className = `hpill${activeMethod === method ? ' active' : ''}`;
    pill.dataset.method = method;
    pill.innerHTML = `${method} <span class="hpill-count">${methodCounts[method] || 0}</span>`;
    pill.addEventListener('click', () => {
      const current = getFilterMethod();
      setFilterMethod(current === method ? '' : method);
      refreshHttpFilterPillStates();
      ctx?.doApplyFilters();
      ctx?.doUpdateActiveFilters();
    });
    methodContainer.appendChild(pill);
  });
}

/**
 * Refresh active states and counts on HTTP filter pills.
 * Called after filter changes and after new requests arrive.
 */
export function refreshHttpFilterPillStates(): void {
  const activeStatus = getFilterStatus();
  const activeMethod = getFilterMethod();
  const statusCounts = countByStatusPrefix();
  const methodCounts = countByMethod();

  // Status pills
  document.querySelectorAll('#http-status-pills .hpill').forEach((pill) => {
    const el = pill as HTMLElement;
    const prefix = el.dataset.prefix;
    el.classList.toggle('active', activeStatus === prefix);
    const countEl = el.querySelector('.hpill-count');
    if (countEl) countEl.textContent = String(statusCounts[prefix || ''] || 0);
  });

  // Method pills
  document.querySelectorAll('#http-method-pills .hpill').forEach((pill) => {
    const el = pill as HTMLElement;
    const method = el.dataset.method;
    el.classList.toggle('active', activeMethod === method);
    const countEl = el.querySelector('.hpill-count');
    if (countEl) countEl.textContent = String(methodCounts[method || ''] || 0);
  });
}

// ─── SHOW/HIDE BUTTON STATES ──────────────────────────────────────────────

/**
 * Update disabled states for Show All / Hide All buttons based on current provider visibility.
 */
function updateShowHideButtons(): void {
  const hiddenProviders = getHiddenProviders();
  const activeProviders = getActiveProviders();
  const $showAll = document.getElementById('btn-show-all-providers') as HTMLButtonElement;
  const $hideAll = document.getElementById('btn-hide-all-providers') as HTMLButtonElement;

  if ($showAll) {
    $showAll.disabled = hiddenProviders.size === 0;
    $showAll.classList.toggle('disabled-action', hiddenProviders.size === 0);
  }
  if ($hideAll) {
    $hideAll.disabled = activeProviders.size > 0 && hiddenProviders.size === activeProviders.size;
    $hideAll.classList.toggle('disabled-action', hiddenProviders.size === activeProviders.size);
  }
}

/**
 * Update show/hide button states when a provider pill is toggled.
 * Exported so pill-rendering.ts can call it after toggleProvider.
 */
export function onProviderPillToggled(): void {
  updateShowHideButtons();
}

// ─── PUBLIC API ────────────────────────────────────────────────────────────

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
    updateShowHideButtons();
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
    updateShowHideButtons();
    ctx?.doApplyFilters();
    ctx?.doUpdateActiveFilters();
  });

  // Render HTTP filter pills
  renderHttpFilterPills();

  registerPopover('provider-filter', closeProviderFilter);
}

function openProviderFilter(): void {
  closeAllPopovers();
  DOM.providerFilterPopover?.classList.add('visible');
  providerFilterOpen = true;
  refreshHttpFilterPillStates();
  updateShowHideButtons();
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

/**
 * Check if the provider filter popover is currently open.
 * (Renamed from isOpen for clarity)
 */
export function isProviderFilterOpen(): boolean {
  return providerFilterOpen;
}
