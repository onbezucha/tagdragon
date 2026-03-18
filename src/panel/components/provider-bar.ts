// ─── PROVIDER BAR COMPONENT ──────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';
import { DOM, qsa } from '../utils/dom';
import { esc } from '../utils/format';
import {
  getActiveProviders,
  getHiddenProviders,
  getAllRequests,
  getFilterText,
  getFilterEventType,
  getFilterUserId,
  getFilterStatus,
  getFilterMethod,
  getFilterHasParam,
} from '../state';

/**
 * Ensure provider pill exists, create if not.
 * @param data Request data
 * @param applyFiltersCallback Callback to apply filters
 * @param updateActiveFiltersCallback Callback to update active filters
 */
export function ensureProviderPill(data: ParsedRequest, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const activeProviders = getActiveProviders();
  if (activeProviders.has(data.provider)) {
    updateProviderCounts();
    return;
  }
  activeProviders.add(data.provider);

  const pill = document.createElement('div');
  pill.className = 'ppill active';
  pill.dataset.provider = data.provider;
  pill.innerHTML = `
    <span class="ppill-dot" style="background:${data.color}"></span>
    <span class="ppill-name">${esc(data.provider)}</span>
    <sup class="ppill-count">0</sup>
  `;
  pill.addEventListener('click', () => toggleProvider(data.provider, pill, applyFiltersCallback, updateActiveFiltersCallback));
  DOM.providerPills!.appendChild(pill);
  
  updateProviderCounts();
  updateFilterBarVisibility();
}

/**
 * Update provider counts in pills.
 */
export function updateProviderCounts(): void {
  const counts: Record<string, number> = {};
  getAllRequests().forEach(req => {
    counts[req.provider] = (counts[req.provider] || 0) + 1;
  });
  
  qsa('.ppill').forEach(pill => {
    const provider = (pill as HTMLElement).dataset.provider!;
    const count = counts[provider] || 0;
    const countEl = pill.querySelector('.ppill-count') as HTMLElement;
    if (countEl) countEl.textContent = String(count);
  });
}

/**
 * Toggle provider visibility.
 * @param name Provider name
 * @param pill Pill element
 * @param applyFiltersCallback Callback to apply filters
 * @param updateActiveFiltersCallback Callback to update active filters
 */
function toggleProvider(name: string, pill: HTMLElement, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const hiddenProviders = getHiddenProviders();
  if (hiddenProviders.has(name)) {
    hiddenProviders.delete(name);
    pill.classList.replace('inactive', 'active');
  } else {
    hiddenProviders.add(name);
    pill.classList.replace('active', 'inactive');
  }
  applyFiltersCallback();
  updateActiveFiltersCallback();
}

/**
 * Update filter bar visibility.
 */
export function updateFilterBarVisibility(): void {
  const activeProviders = getActiveProviders();
  const hiddenProviders = getHiddenProviders();
  const hasProviders = activeProviders.size > 0;
  const hasFilters = getFilterText() || getFilterEventType() || getFilterUserId() || 
                     getFilterStatus() || getFilterMethod() || getFilterHasParam() || 
                     hiddenProviders.size > 0;
  
  DOM.providerBar!.classList.toggle('visible', !!hasProviders);
  DOM.filterBar!.classList.toggle('visible', !!(hasProviders || hasFilters));
}

/**
 * Initialize provider bar button handlers.
 * @param applyFiltersCallback Callback to apply filters
 * @param updateActiveFiltersCallback Callback to update active filters
 */
export function initProviderBarHandlers(applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const $btnAll = document.getElementById('btn-providers-all') as HTMLElement;
  const $btnNone = document.getElementById('btn-providers-none') as HTMLElement;
  const hiddenProviders = getHiddenProviders();
  const activeProviders = getActiveProviders();
  
  if ($btnAll) {
    $btnAll.addEventListener('click', () => {
      hiddenProviders.clear();
      qsa('.ppill.inactive').forEach(p => p.classList.replace('inactive', 'active'));
      applyFiltersCallback();
      updateActiveFiltersCallback();
    });
  }
  
  if ($btnNone) {
    $btnNone.addEventListener('click', () => {
      for (const provider of activeProviders) {
        hiddenProviders.add(provider);
      }
      qsa('.ppill.active').forEach(p => p.classList.replace('active', 'inactive'));
      applyFiltersCallback();
      updateActiveFiltersCallback();
    });
  }
}
