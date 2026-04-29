// ─── PROVIDER FILTER — PILL RENDERING ───────────────────────────────────────
// Functions for creating and updating provider pills in the filter popover.

import type { ParsedRequest } from '@/types/request';
import { DOM, qsa } from '../../utils/dom';
import { esc } from '../../utils/format';
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
} from '../../state';
import { getProviderGroup, UNGROUPED_ID, UNGROUPED_LABEL } from '@/shared/provider-groups';
import { getCachedIcon } from '../../utils/icon-builder';
import { GROUP_ICONS } from '../../utils/group-icons';

// ─── ICONS ────────────────────────────────────────────────────────────────────

const CHECK_SVG =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const DASH_SVG = '<span style="font-size:11px;line-height:1;font-weight:600;">—</span>';

function getGroupIconSvg(groupId: string): string {
  return GROUP_ICONS[groupId] ?? '';
}

// ─── GROUP DOM ───────────────────────────────────────────────────────────────

// Cache DOM elements to avoid repeated querySelector calls
const _groupCache = new Map<string, HTMLElement>();

type GroupState = 'all' | 'partial' | 'none';

/**
 * Ensure a provider group element exists in #provider-group-list. Returns the .pgroup-pills container.
 */
export function ensureProviderGroup(
  groupId: string,
  groupLabel: string,
  applyFiltersCallback: () => void,
  updateActiveFiltersCallback: () => void
): HTMLElement | null {
  const groupList = DOM.providerGroupList;
  if (!groupList) return null;

  // Check cache first
  const cached = _groupCache.get(groupId);
  if (cached && cached.parentElement) {
    return cached.querySelector('.pgroup-pills') as HTMLElement;
  }

  // Fall back to DOM query
  const existing = groupList.querySelector(
    `.pgroup[data-group="${CSS.escape(groupId)}"]`
  ) as HTMLElement | null;
  if (existing) {
    _groupCache.set(groupId, existing);
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
      <span class="pgroup-icon">${getGroupIconSvg(groupId)}</span>
      <span class="pgroup-state all">${CHECK_SVG}</span>
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
    qsa('.ppill', $pills).forEach((p) => {
      const name = (p as HTMLElement).dataset.provider!;
      hiddenProviders.delete(name);
      p.classList.replace('inactive', 'active');
      const iconEl = p.querySelector('.ppill-icon');
      iconEl?.classList.remove('icon-hidden');
    });
    syncHiddenProviders();
    applyFiltersCallback();
    updateActiveFiltersCallback();
    updateGroupStates();
    updateFooterSummary();
    updateHiddenBadge();
  });

  $groupNone.addEventListener('click', () => {
    qsa('.ppill', $pills).forEach((p) => {
      const name = (p as HTMLElement).dataset.provider!;
      hiddenProviders.add(name);
      p.classList.replace('active', 'inactive');
      const iconEl = p.querySelector('.ppill-icon');
      iconEl?.classList.add('icon-hidden');
    });
    syncHiddenProviders();
    applyFiltersCallback();
    updateActiveFiltersCallback();
    updateGroupStates();
    updateFooterSummary();
    updateHiddenBadge();
  });

  groupList.appendChild($group);
  _groupCache.set(groupId, $group);
  return $pills;
}

// ─── PILL ─────────────────────────────────────────────────────────────────────

/**
 * Ensure provider pill exists, create if not.
 */
export function ensureProviderPill(
  data: ParsedRequest,
  applyFiltersCallback: () => void,
  updateActiveFiltersCallback: () => void
): void {
  const activeProviders = getActiveProviders();
  if (activeProviders.has(data.provider)) {
    updateProviderCounts();
    return;
  }
  activeProviders.add(data.provider);

  const group = getProviderGroup(data.provider);
  const groupId = group?.id ?? UNGROUPED_ID;
  const groupLabel = group?.label ?? UNGROUPED_LABEL;

  const $pillsContainer = ensureProviderGroup(
    groupId,
    groupLabel,
    applyFiltersCallback,
    updateActiveFiltersCallback
  );
  if (!$pillsContainer) return;

  const hiddenProviders = getHiddenProviders();
  const isHidden = hiddenProviders.has(data.provider);

  const pill = document.createElement('div');
  pill.className = `ppill ${isHidden ? 'inactive' : 'active'}`;
  pill.dataset.provider = data.provider;
  pill.innerHTML = `
    <span class="ppill-icon" style="--pill-color:${data.color}"></span>
    <span class="ppill-name">${esc(data.provider)}</span>
    <sup class="ppill-count">0</sup>
  `;
  const iconEl = pill.querySelector('.ppill-icon') as HTMLElement;
  const iconFragment = getCachedIcon(data.provider);
  if (iconFragment) {
    iconEl.appendChild(iconFragment.cloneNode(true));
  }
  if (isHidden) {
    iconEl?.classList.add('icon-hidden');
  }
  pill.addEventListener('click', () =>
    toggleProvider(data.provider, pill, applyFiltersCallback, updateActiveFiltersCallback)
  );
  pill.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    showProviderContextMenu(
      e,
      data.provider,
      pill,
      applyFiltersCallback,
      updateActiveFiltersCallback
    );
  });
  $pillsContainer.appendChild(pill);

  updateProviderCounts();
  updateFilterBarVisibility();
  updateGroupStates();
  updateFooterSummary();
  updateHiddenBadge();
}

// ─── COUNTS ───────────────────────────────────────────────────────────────────

/**
 * Update provider counts in pills and group badges.
 */
export function updateProviderCounts(): void {
  const counts: Record<string, number> = {};
  getAllRequests().forEach((req) => {
    counts[req.provider] = (counts[req.provider] || 0) + 1;
  });

  qsa('.ppill').forEach((pill) => {
    const provider = (pill as HTMLElement).dataset.provider!;
    const count = counts[provider] || 0;
    const countEl = pill.querySelector('.ppill-count') as HTMLElement;
    if (countEl) countEl.textContent = String(count);
  });

  // Update group count badges
  const groupList = DOM.providerGroupList;
  if (!groupList) return;
  qsa('.pgroup', groupList).forEach((group) => {
    const $badge = group.querySelector('.pgroup-count') as HTMLElement;
    if (!$badge) return;
    let total = 0;
    qsa('.ppill', group).forEach((pill) => {
      const provider = (pill as HTMLElement).dataset.provider!;
      total += counts[provider] || 0;
    });
    $badge.textContent = total > 0 ? String(total) : '';
  });
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

function toggleProvider(
  name: string,
  pill: HTMLElement,
  applyFiltersCallback: () => void,
  updateActiveFiltersCallback: () => void
): void {
  const hiddenProviders = getHiddenProviders();
  const isCurrentlyHidden = hiddenProviders.has(name);

  if (isCurrentlyHidden) {
    hiddenProviders.delete(name);
    pill.classList.replace('inactive', 'active');
  } else {
    hiddenProviders.add(name);
    pill.classList.replace('active', 'inactive');
  }

  // Toggle icon visibility
  const iconEl = pill.querySelector('.ppill-icon');
  if (iconEl) {
    iconEl.classList.toggle('icon-hidden', !isCurrentlyHidden);
  }

  // Toggle animation
  pill.classList.add('toggling');
  pill.addEventListener('animationend', () => pill.classList.remove('toggling'), { once: true });

  syncHiddenProviders();
  applyFiltersCallback();
  updateActiveFiltersCallback();
  updateGroupStates();
  updateFooterSummary();
  updateHiddenBadge();
}

// ─── VISIBILITY ───────────────────────────────────────────────────────────────

/**
 * Update filter bar visibility and provider button active state.
 */
export function updateFilterBarVisibility(): void {
  const hiddenProviders = getHiddenProviders();
  const hasFilters = !!(
    getFilterText() ||
    getFilterEventType() ||
    getFilterUserId() ||
    getFilterStatus() ||
    getFilterMethod() ||
    getFilterHasParam() ||
    hiddenProviders.size > 0
  );

  // Indicator on the button
  const $btn = DOM.btnProviders;
  const hasHttpFilter = !!(getFilterStatus() || getFilterMethod());
  $btn?.classList.toggle('active', hiddenProviders.size > 0 || hasHttpFilter);

  DOM.filterBar?.classList.toggle('visible', hasFilters);

  updateHiddenBadge();
}

// ─── TRI-STATE GROUP INDICATORS ───────────────────────────────────────────────

/**
 * Update tri-state indicators on all group headers.
 */
export function updateGroupStates(): void {
  const groupList = DOM.providerGroupList;
  if (!groupList) return;

  qsa('.pgroup', groupList).forEach((group) => {
    const stateEl = group.querySelector('.pgroup-state') as HTMLElement | null;
    if (!stateEl) return;

    const pills = qsa('.ppill', group);
    if (pills.length === 0) return;

    let hiddenCount = 0;
    pills.forEach((p) => {
      if ((p as HTMLElement).classList.contains('inactive')) hiddenCount++;
    });

    let state: GroupState;
    if (hiddenCount === 0) state = 'all';
    else if (hiddenCount === pills.length) state = 'none';
    else state = 'partial';

    stateEl.className = `pgroup-state ${state}`;
    stateEl.innerHTML = state === 'all' ? CHECK_SVG : state === 'partial' ? DASH_SVG : '';
  });
}

// ─── HIDDEN COUNT BADGE ───────────────────────────────────────────────────────

/**
 * Update the hidden count badge on the #btn-providers button.
 */
export function updateHiddenBadge(): void {
  const hiddenProviders = getHiddenProviders();
  const badge = document.getElementById('provider-hidden-badge') as HTMLElement | null;
  if (!badge) return;

  const count = hiddenProviders.size;
  badge.textContent = count > 0 ? String(count) : '';
  badge.classList.toggle('visible', count > 0);
}

// ─── FOOTER SUMMARY ───────────────────────────────────────────────────────────

/**
 * Update the "X of Y visible" footer text.
 */
export function updateFooterSummary(): void {
  const activeProviders = getActiveProviders();
  const hiddenProviders = getHiddenProviders();
  const total = activeProviders.size;
  const visible = total - hiddenProviders.size;

  const countEl = document.getElementById('provider-footer-count');
  const totalEl = document.getElementById('provider-footer-total');
  if (countEl) countEl.textContent = String(visible);
  if (totalEl) totalEl.textContent = String(total);
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────

/**
 * Show context menu on right-click for "Show only" / "Hide" actions.
 */
export function showProviderContextMenu(
  e: MouseEvent,
  providerName: string,
  pill: HTMLElement,
  applyFiltersCallback: () => void,
  updateActiveFiltersCallback: () => void
): void {
  // Remove any existing context menu
  closeProviderContextMenu();

  const hiddenProviders = getHiddenProviders();
  const isHidden = hiddenProviders.has(providerName);

  const menu = document.createElement('div');
  menu.className = 'ppill-context-menu';
  menu.id = 'ppill-context-menu';

  menu.innerHTML = `
    <div class="ppill-context-item" data-action="${isHidden ? 'show' : 'hide'}">
      ${isHidden ? '👁 Show this provider' : '👁‍🗨 Hide this provider'}
    </div>
    <div class="ppill-context-item" data-action="show-only">
      ⊙ Show only ${esc(providerName)}
    </div>
  `;

  document.body.appendChild(menu);

  // Position
  let left = e.clientX;
  let top = e.clientY;
  if (left + 170 > window.innerWidth) left = window.innerWidth - 170;
  if (top + 80 > window.innerHeight) top = window.innerHeight - 80;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';

  // Handlers
  menu.addEventListener('click', (ev: MouseEvent) => {
    const target = (ev.target as HTMLElement).closest('.ppill-context-item') as HTMLElement;
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'show' || action === 'hide') {
      toggleProvider(providerName, pill, applyFiltersCallback, updateActiveFiltersCallback);
    } else if (action === 'show-only') {
      // Hide all, then show only this one
      const activeProviders = getActiveProviders();
      activeProviders.forEach((name) => hiddenProviders.add(name));
      hiddenProviders.delete(providerName);

      qsa('.ppill').forEach((p) => {
        const name = (p as HTMLElement).dataset.provider!;
        if (name === providerName) {
          p.classList.replace('inactive', 'active');
          const iconEl = p.querySelector('.ppill-icon');
          iconEl?.classList.remove('icon-hidden');
        } else {
          p.classList.replace('active', 'inactive');
          const iconEl = p.querySelector('.ppill-icon');
          iconEl?.classList.add('icon-hidden');
        }
      });

      syncHiddenProviders();
      applyFiltersCallback();
      updateActiveFiltersCallback();
      updateGroupStates();
      updateFooterSummary();
      updateHiddenBadge();
    }

    closeProviderContextMenu();
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', closeProviderContextMenu, { once: true });
    document.addEventListener('contextmenu', closeProviderContextMenu, { once: true });
  }, 0);
}

function closeProviderContextMenu(): void {
  const existing = document.getElementById('ppill-context-menu');
  if (existing) existing.remove();
}
