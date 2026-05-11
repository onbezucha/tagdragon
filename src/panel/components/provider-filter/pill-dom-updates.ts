// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FILTER — PILL DOM UPDATES
// Pure DOM update functions for provider filter UI.
// Extracted from pill-rendering.ts to break circular dependency with popover.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { DOM, qsa } from '../../utils/dom';
import { getActiveProviders, getHiddenProviders } from '../../state';

// ─── ICONS ────────────────────────────────────────────────────────────────────

const CHECK_SVG =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const DASH_SVG = '<span style="font-size:11px;line-height:1;font-weight:600;">—</span>';

type GroupState = 'all' | 'partial' | 'none';

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
