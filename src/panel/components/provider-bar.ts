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
  syncHiddenProviders,
} from '../state';
import { PROVIDER_GROUPS, getProviderGroup, UNGROUPED_ID, UNGROUPED_LABEL } from '@/shared/provider-groups';

// ─── GROUP DOM ───────────────────────────────────────────────────────────────

/**
 * Ensure a provider group element exists in #provider-group-list. Returns the .pgroup-pills container.
 */
function ensureProviderGroup(groupId: string, groupLabel: string, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): HTMLElement {
  const groupList = DOM.providerGroupList!;
  const existing = groupList.querySelector(`.pgroup[data-group="${CSS.escape(groupId)}"]`) as HTMLElement | null;
  if (existing) {
    return existing.querySelector('.pgroup-pills') as HTMLElement;
  }

  const $group = document.createElement('div');
  $group.className = 'pgroup';
  $group.dataset.group = groupId;
  $group.innerHTML = `
    <div class="pgroup-header">
      <button class="pgroup-toggle" aria-expanded="true" title="Expand/collapse group">
        <svg class="pgroup-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="pgroup-label">${esc(groupLabel)}</span>
      <span class="pgroup-count"></span>
      <button class="pgroup-all" title="Show all in group">✓</button>
      <button class="pgroup-none" title="Hide all in group">—</button>
    </div>
    <div class="pgroup-pills-wrap"><div class="pgroup-pills"></div></div>
  `;

  // Collapse toggle (session-only, not persisted)
  const $toggle = $group.querySelector('.pgroup-toggle') as HTMLButtonElement;
  const $pillsWrap = $group.querySelector('.pgroup-pills-wrap') as HTMLElement;
  const $pills = $group.querySelector('.pgroup-pills') as HTMLElement;
  $toggle.addEventListener('click', () => {
    const expanded = $toggle.getAttribute('aria-expanded') === 'true';
    $toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    $pillsWrap.classList.toggle('collapsed', expanded);
  });

  // Per-group All/None
  const $groupAll = $group.querySelector('.pgroup-all') as HTMLButtonElement;
  const $groupNone = $group.querySelector('.pgroup-none') as HTMLButtonElement;
  const hiddenProviders = getHiddenProviders();

  $groupAll.addEventListener('click', () => {
    qsa('.ppill', $pills).forEach(p => {
      const name = (p as HTMLElement).dataset.provider!;
      hiddenProviders.delete(name);
      p.classList.replace('inactive', 'active');
    });
    syncHiddenProviders();
    applyFiltersCallback();
    updateActiveFiltersCallback();
  });

  $groupNone.addEventListener('click', () => {
    qsa('.ppill', $pills).forEach(p => {
      const name = (p as HTMLElement).dataset.provider!;
      hiddenProviders.add(name);
      p.classList.replace('active', 'inactive');
    });
    syncHiddenProviders();
    applyFiltersCallback();
    updateActiveFiltersCallback();
  });

  groupList.appendChild($group);
  return $pills;
}

// ─── PILL ─────────────────────────────────────────────────────────────────────

/**
 * Ensure provider pill exists, create if not.
 */
export function ensureProviderPill(data: ParsedRequest, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const activeProviders = getActiveProviders();
  if (activeProviders.has(data.provider)) {
    updateProviderCounts();
    return;
  }
  activeProviders.add(data.provider);

  const group = getProviderGroup(data.provider);
  const groupId = group?.id ?? UNGROUPED_ID;
  const groupLabel = group?.label ?? UNGROUPED_LABEL;

  const $pillsContainer = ensureProviderGroup(groupId, groupLabel, applyFiltersCallback, updateActiveFiltersCallback);

  const hiddenProviders = getHiddenProviders();
  const isHidden = hiddenProviders.has(data.provider);

  const pill = document.createElement('div');
  pill.className = `ppill ${isHidden ? 'inactive' : 'active'}`;
  pill.dataset.provider = data.provider;
  pill.innerHTML = `
    <span class="ppill-dot" style="background:${data.color}"></span>
    <span class="ppill-name">${esc(data.provider)}</span>
    <sup class="ppill-count">0</sup>
  `;
  pill.addEventListener('click', () => toggleProvider(data.provider, pill, applyFiltersCallback, updateActiveFiltersCallback));
  $pillsContainer.appendChild(pill);

  updateProviderCounts();
  updateFilterBarVisibility();
}

// ─── COUNTS ───────────────────────────────────────────────────────────────────

/**
 * Update provider counts in pills and group badges.
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

  // Update group count badges
  const groupList = DOM.providerGroupList;
  if (!groupList) return;
  qsa('.pgroup', groupList).forEach(group => {
    const $badge = group.querySelector('.pgroup-count') as HTMLElement;
    if (!$badge) return;
    let total = 0;
    qsa('.ppill', group).forEach(pill => {
      const provider = (pill as HTMLElement).dataset.provider!;
      total += counts[provider] || 0;
    });
    $badge.textContent = total > 0 ? String(total) : '';
  });
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

function toggleProvider(name: string, pill: HTMLElement, applyFiltersCallback: () => void, updateActiveFiltersCallback: () => void): void {
  const hiddenProviders = getHiddenProviders();
  if (hiddenProviders.has(name)) {
    hiddenProviders.delete(name);
    pill.classList.replace('inactive', 'active');
  } else {
    hiddenProviders.add(name);
    pill.classList.replace('active', 'inactive');
  }
  syncHiddenProviders();
  applyFiltersCallback();
  updateActiveFiltersCallback();
}

// ─── VISIBILITY ───────────────────────────────────────────────────────────────

/**
 * Update filter bar visibility and provider button active state.
 */
export function updateFilterBarVisibility(): void {
  const activeProviders = getActiveProviders();
  const hiddenProviders = getHiddenProviders();
  const hasProviders = activeProviders.size > 0;
  const hasFilters = !!(getFilterText() || getFilterEventType() || getFilterUserId() ||
                     getFilterStatus() || getFilterMethod() || getFilterHasParam() ||
                     hiddenProviders.size > 0);

  // Indicator on the button
  const $btn = DOM.btnProviders;
  $btn?.classList.toggle('active', hiddenProviders.size > 0);

  // Empty state v popoveru
  const $empty = document.getElementById('provider-popover-empty') as HTMLElement | null;
  if ($empty) $empty.style.display = hasProviders ? 'none' : '';

  DOM.filterBar!.classList.toggle('visible', hasFilters);
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

function initProviderSearch(): void {
  const $input = DOM.providerSearchInput;
  const $clearBtn = document.getElementById('btn-provider-search-clear') as HTMLButtonElement | null;
  if (!$input) return;

  const doSearch = (query: string) => {
    const q = query.toLowerCase();
    const groupList = DOM.providerGroupList;
    if (!groupList) return;

    qsa('.ppill', groupList).forEach(pill => {
      const name = ((pill as HTMLElement).dataset.provider ?? '').toLowerCase();
      const hidden = q.length > 0 && !name.includes(q);
      pill.classList.toggle('search-hidden', hidden);
    });

    qsa('.pgroup', groupList).forEach(group => {
      const pills = qsa('.ppill', group);
      const allHidden = pills.length > 0 && pills.every(p => p.classList.contains('search-hidden'));
      group.classList.toggle('search-empty', allHidden);
    });

    if ($clearBtn) $clearBtn.classList.toggle('hidden', q.length === 0);
  };

  $input.addEventListener('input', (e: Event) => {
    doSearch((e.target as HTMLInputElement).value);
  });

  $clearBtn?.addEventListener('click', () => {
    $input.value = '';
    doSearch('');
  });
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

/**
 * Initialize provider bar button handlers (search + All/None).
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
      syncHiddenProviders();
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
      syncHiddenProviders();
      applyFiltersCallback();
      updateActiveFiltersCallback();
    });
  }

  initProviderSearch();
}
