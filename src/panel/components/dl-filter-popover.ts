// ═══════════════════════════════════════════════════════════════════════════
// DL FILTER POPOVER — DataLayer filter dropdown popover
// ═══════════════════════════════════════════════════════════════════════════

import { esc } from '../utils/format';
import { closeAllPopovers, registerPopover } from '../utils/popover-manager';
import * as dlState from '../datalayer/state';
import type { DataLayerSource } from '@/types/datalayer';

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface DlFilterPopoverContext {
  doApplyFilters: () => void;
  updateDlFilterChips: () => void;
}

// ─── STATE ────────────────────────────────────────────────────────────────

let ctx: DlFilterPopoverContext | null = null;
let isOpenState = false;

const CHEVRON_SVG =
  '<svg class="popover-label-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export function initDlFilterPopover(context: DlFilterPopoverContext): void {
  ctx = context;
  registerPopover('dl-filter', closeDlFilterPopover);

  // Close button
  document.getElementById('btn-dl-filter-popover-close')?.addEventListener('click', () => {
    closeDlFilterPopover();
  });

  // Reset button
  document.getElementById('btn-dl-filter-reset')?.addEventListener('click', () => {
    dlState.setDlFilterSource('');
    dlState.setDlFilterEventName('');
    dlState.setDlFilterHasKey('');
    dlState.setDlEcommerceOnly(false);
    ctx?.doApplyFilters();
    ctx?.updateDlFilterChips();
    renderContent();
  });
}

export function toggleDlFilterPopover(): void {
  if (isOpenState) closeDlFilterPopover();
  else openDlFilterPopover();
}

export function openDlFilterPopover(): void {
  if (!ctx) return;
  closeAllPopovers();
  renderContent();
  const popover = document.getElementById('dl-filter-popover');
  if (popover) {
    popover.classList.add('visible');
    isOpenState = true;
  }
}

export function closeDlFilterPopover(): void {
  const popover = document.getElementById('dl-filter-popover');
  if (popover) popover.classList.remove('visible');
  isOpenState = false;
}

export function isOpen(): boolean {
  return isOpenState;
}

// ─── RENDER ───────────────────────────────────────────────────────────────

function renderContent(): void {
  const popover = document.getElementById('dl-filter-popover');
  if (!popover) return;

  const dlFilterSource = dlState.getDlFilterSource();
  const dlFilterEventName = dlState.getDlFilterEventName();
  const dlFilterHasKey = dlState.getDlFilterHasKey();
  const dlEcommerceOnly = dlState.getDlEcommerceOnly();

  const activeCount =
    (dlState.getDlFilterText() ? 1 : 0) +
    (dlFilterSource ? 1 : 0) +
    (dlFilterEventName ? 1 : 0) +
    (dlFilterHasKey ? 1 : 0) +
    (dlEcommerceOnly ? 1 : 0);

  const body = popover.querySelector('.popover-body');
  if (!body) return;

  body.innerHTML = `
      <div class="popover-filter-item" data-filter-toggle="dl-source">
        <span class="popover-label">${CHEVRON_SVG} Source</span>
        <span class="popover-filter-value" id="cfg-dl-source-value">${dlFilterSource || 'All'}</span>
      </div>
      <div class="popover-filter-expand" id="cfg-dl-source-expand">
        <div class="popover-filter-options" id="cfg-dl-source-options"></div>
      </div>

      <div class="popover-filter-item" data-filter-toggle="dl-event">
        <span class="popover-label">${CHEVRON_SVG} Event Name</span>
        <span class="popover-filter-value" id="cfg-dl-event-value">${dlFilterEventName || 'All'}</span>
      </div>
      <div class="popover-filter-expand" id="cfg-dl-event-expand">
        <input type="text" class="popover-filter-search" id="cfg-dl-event-name-search" placeholder="Search events...">
        <div class="popover-filter-options" id="cfg-dl-event-options"></div>
      </div>

      <div class="popover-filter-item" data-filter-toggle="dl-haskey">
        <span class="popover-label">${CHEVRON_SVG} Has Key</span>
        <span class="popover-filter-value" id="cfg-dl-haskey-value">${dlFilterHasKey || 'All'}</span>
      </div>
      <div class="popover-filter-expand" id="cfg-dl-haskey-expand">
        <div id="cfg-dl-haskey-quickpicks"></div>
        <div style="padding:4px 8px;display:flex;gap:4px;">
          <input type="text" id="cfg-dl-haskey-input" class="popover-filter-search" style="margin:0;width:auto;flex:1;" placeholder="Key name…" value="${esc(dlFilterHasKey)}">
          <button id="cfg-dl-haskey-apply" class="popover-footer-btn">Apply</button>
        </div>
      </div>

      <label class="popover-checkbox-label">
        <input type="checkbox" class="popover-checkbox" id="cfg-dl-ecommerce"${dlEcommerceOnly ? ' checked' : ''}>
        E-commerce events only
      </label>
  `;

  // Update count badge
  const countEl = popover.querySelector('#dl-filter-count') as HTMLElement | null;
  if (countEl) countEl.textContent = activeCount > 0 ? `${activeCount} active` : '';

  wireControls();
}

// ─── WIRE CONTROLS ────────────────────────────────────────────────────────

function wireControls(): void {
  wireDlFilterExpand('dl-source', 'cfg-dl-source-expand', populateDlSourceOptions);
  wireDlFilterExpand('dl-event', 'cfg-dl-event-expand', populateDlEventOptions);
  wireDlFilterExpand('dl-haskey', 'cfg-dl-haskey-expand', populateDlHasKeyOptions);

  // E-commerce toggle
  const ecomEl = document.getElementById('cfg-dl-ecommerce') as HTMLInputElement | null;
  ecomEl?.addEventListener('change', () => {
    dlState.setDlEcommerceOnly(ecomEl.checked);
    ctx?.doApplyFilters();
    ctx?.updateDlFilterChips();
  });
}

// ─── FILTER EXPAND HELPERS ────────────────────────────────────────────────

function closeAllExpands(): void {
  document.querySelectorAll('.popover-filter-expand.open').forEach((el) => {
    el.classList.remove('open');
  });
}

function wireDlFilterExpand(
  toggleId: string,
  expandId: string,
  populateFn: (expandEl: HTMLElement) => void
): void {
  const toggle = document.querySelector(`[data-filter-toggle="${toggleId}"]`);
  const expand = document.getElementById(expandId);
  if (!toggle || !expand) return;

  toggle.addEventListener('click', () => {
    const isOpen = expand.classList.contains('open');
    closeAllExpands();
    if (!isOpen) {
      expand.classList.add('open');
      if (!expand.dataset.populated) {
        populateFn(expand);
        expand.dataset.populated = '1';
      }
    }
  });
}

// ─── OPTION HTML HELPER ───────────────────────────────────────────────────

function optionHtml(
  value: string,
  label: string,
  count: number,
  selected: boolean,
  disabled = false,
  extraClass = ''
): string {
  return `<div class="popover-filter-option${selected ? ' selected' : ''}${disabled ? ' disabled' : ''} ${extraClass}" data-value="${esc(value)}">
    <span class="popover-filter-option-label">${label}</span>
    <span class="popover-filter-option-count">${count}</span>
  </div>`;
}

// ─── POPULATE: SOURCE OPTIONS ─────────────────────────────────────────────

function populateDlSourceOptions(expandEl: HTMLElement): void {
  const optionsEl = expandEl.querySelector('#cfg-dl-source-options');
  if (!optionsEl) return;

  const sources = dlState.getDlSources();
  const filterSource = dlState.getDlFilterSource();

  let html = '';
  sources.forEach((source) => {
    const count = dlState.getDlSourceCount(source);
    const isSelected = filterSource === source;
    html += optionHtml(source, esc(source), count, isSelected);
  });

  if (sources.size === 0) {
    html = '<div class="popover-empty-state">No sources detected yet</div>';
  }

  optionsEl.innerHTML = html;

  optionsEl.querySelectorAll('.popover-filter-option').forEach((item) => {
    item.addEventListener('click', () => {
      const value = (item as HTMLElement).dataset.value;
      if (!value) return;
      const current = dlState.getDlFilterSource();
      dlState.setDlFilterSource(current === value ? '' : (value as DataLayerSource));
      ctx?.doApplyFilters();
      ctx?.updateDlFilterChips();
      closeAllExpands();
      renderContent();
    });
  });
}

// ─── POPULATE: EVENT NAME OPTIONS ─────────────────────────────────────────

function populateDlEventOptions(expandEl: HTMLElement): void {
  const optionsEl = expandEl.querySelector('#cfg-dl-event-options');
  const searchInput = expandEl.querySelector('#cfg-dl-event-name-search') as HTMLInputElement;
  if (!optionsEl) return;

  const events = dlState.getDlEventNames();
  const filterEventName = dlState.getDlFilterEventName();

  if (events.length === 0) {
    optionsEl.innerHTML = '<div class="popover-empty-state">No events detected yet</div>';
    return;
  }

  let html = '';
  events.forEach(([name, count]) => {
    const isSelected = filterEventName === name;
    html += optionHtml(name, esc(name), count, isSelected, false, 'dl-event-item');
  });

  optionsEl.innerHTML = html;

  optionsEl.querySelectorAll('.popover-filter-option').forEach((item) => {
    item.addEventListener('click', () => {
      const value = (item as HTMLElement).dataset.value;
      if (!value) return;
      const current = dlState.getDlFilterEventName();
      dlState.setDlFilterEventName(current === value ? '' : value);
      ctx?.doApplyFilters();
      ctx?.updateDlFilterChips();
      closeAllExpands();
      renderContent();
    });
  });

  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    optionsEl.querySelectorAll('.dl-event-item').forEach((item) => {
      const label =
        (
          item.querySelector('.popover-filter-option-label') as HTMLElement
        )?.textContent?.toLowerCase() ?? '';
      (item as HTMLElement).style.display = label.includes(q) ? '' : 'none';
    });
  });

  setTimeout(() => searchInput?.focus(), 50);
}

// ─── POPULATE: HAS KEY OPTIONS ────────────────────────────────────────────

function populateDlHasKeyOptions(expandEl: HTMLElement): void {
  const input = expandEl.querySelector('#cfg-dl-haskey-input') as HTMLInputElement;
  const applyBtn = expandEl.querySelector('#cfg-dl-haskey-apply') as HTMLButtonElement;

  if (input && applyBtn) {
    const applyKey = (): void => {
      const val = input.value.trim();
      dlState.setDlFilterHasKey(val);
      ctx?.doApplyFilters();
      ctx?.updateDlFilterChips();
      closeAllExpands();
      renderContent();
    };
    applyBtn.addEventListener('click', applyKey);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') applyKey();
    });
    setTimeout(() => input.focus(), 50);
  }
}
