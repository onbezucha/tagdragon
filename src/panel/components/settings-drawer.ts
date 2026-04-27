// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS POPOVER — Full implementation with settings content
// ═══════════════════════════════════════════════════════════════════════════

import { DOM } from '../utils/dom';
import { closeAllPopovers, registerPopover } from '../utils/popover-manager';
import * as state from '../state';
import * as dlState from '../datalayer/state';
import { DEFAULT_CONFIG } from '@/shared/constants';
import type { AppConfig } from '@/shared/constants';

// ─── TYPES ────────────────────────────────────────────────────────────────

export type DrawerTab = 'network' | 'datalayer';

export interface DrawerContext {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  syncQuickButtons: () => void;
  syncDlQuickButtons: () => void;
  applyWrapValuesClass: () => void;
  applyCompactRowsClass: () => void;
}

// ─── STATE ────────────────────────────────────────────────────────────────

let ctx: DrawerContext | null = null;
let activeTab: DrawerTab = 'network';
let settingsOpen = false;
// Section collapse state — tracked per-session via DOM classList
const collapsedSections = new Set<string>();

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export function initSettingsDrawer(context: DrawerContext): void {
  ctx = context;

  // Close button
  DOM.btnSettingsClose?.addEventListener('click', closeSettings);

  // Tab clicks
  DOM.settingsPopover?.querySelectorAll('.popover-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = (tab as HTMLElement).dataset.tab as DrawerTab;
      if (tabName) switchTab(tabName);
    });
  });

  // Accordion headers — event delegation on the static settings-popover element
  DOM.settingsPopover?.addEventListener('click', (e: Event) => {
    const header = (e.target as HTMLElement).closest('[data-section-toggle]');
    if (header) {
      const sectionId = (header as HTMLElement).dataset.sectionToggle;
      if (sectionId) toggleSection(sectionId);
    }
  });

  // Register settings with popover manager
  registerPopover('settings', closeSettings);

  // Footer buttons
  wireFooterButtons();

  // Settings search
  wireSettingsSearch();

  // Render initial content
  renderTabContent(activeTab);
}

export function openSettings(tab?: DrawerTab): void {
  if (!ctx) return;
  closeAllPopovers();
  if (tab) activeTab = tab;
  else activeTab = ctx.getActiveView() === 'datalayer' ? 'datalayer' : 'network';
  renderTabContent(activeTab);
  DOM.settingsPopover?.classList.add('visible');
  settingsOpen = true;
  updateTabButtons();
}

export function closeSettings(): void {
  DOM.settingsPopover?.classList.remove('visible');
  settingsOpen = false;
  closeAllExpands();
}

export function toggleSettings(): void {
  if (settingsOpen) closeSettings();
  else openSettings();
}

export function isOpen(): boolean {
  return settingsOpen;
}

export function refreshContent(): void {
  if (!settingsOpen) return;
  if ((activeTab as string) === 'general') activeTab = 'network'; // safety migration
  renderTabContent(activeTab);
}

/**
 * Sync a settings control value from outside (e.g. quick-button toggle).
 */
export function syncSettingsControl(id: string, value: string | boolean): void {
  if (!settingsOpen) return;
  const el = document.getElementById(id);
  if (!el) return;
  if (el instanceof HTMLInputElement) el.checked = value as boolean;
  else if (el instanceof HTMLSelectElement) el.value = value as string;
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────

function switchTab(tab: DrawerTab): void {
  activeTab = tab;
  renderTabContent(tab);
  updateTabButtons();
}

function updateTabButtons(): void {
  DOM.settingsPopover?.querySelectorAll('.popover-tab').forEach((btn) => {
    const isActive = (btn as HTMLElement).dataset.tab === activeTab;
    btn.classList.toggle('active', isActive);
  });
}

// ─── ACCORDION ────────────────────────────────────────────────────────────

function toggleSection(sectionId: string): void {
  const header = document.querySelector(`[data-section-toggle="${sectionId}"]`);
  const body = document.querySelector(`[data-section="${sectionId}"] > .popover-section-body`);
  if (!header || !body) return;

  if (collapsedSections.has(sectionId)) {
    collapsedSections.delete(sectionId);
    header.classList.remove('collapsed');
    (body as HTMLElement).style.display = '';
  } else {
    collapsedSections.add(sectionId);
    header.classList.add('collapsed');
    (body as HTMLElement).style.display = 'none';
  }
}

function updateAccordionState(): void {
  collapsedSections.forEach((sectionId) => {
    const header = document.querySelector(`[data-section-toggle="${sectionId}"]`);
    const body = document.querySelector(`[data-section="${sectionId}"] > .popover-section-body`);
    if (header) header.classList.add('collapsed');
    if (body) (body as HTMLElement).style.display = 'none';
  });
}

/**
 * Expand a section (open accordion, used when toolbar buttons open settings).
 */
export function expandSection(sectionId: string): void {
  collapsedSections.delete(sectionId);
  const header = document.querySelector(`[data-section-toggle="${sectionId}"]`);
  const body = document.querySelector(`[data-section="${sectionId}"] > .popover-section-body`);
  if (header) header.classList.remove('collapsed');
  if (body) (body as HTMLElement).style.display = '';
}

// ─── FILTER EXPAND ────────────────────────────────────────────────────────

function closeAllExpands(): void {
  document.querySelectorAll('.popover-filter-expand.open').forEach((el) => {
    el.classList.remove('open');
  });
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────

function sectionWrap(
  id: string,
  title: string,
  accent: string,
  content: string,
  collapsed = false,
  countBadge = ''
): string {
  return `
    <div class="popover-section${collapsed ? ' collapsed-section' : ''}" data-section="${id}" data-accent="${accent}">
      <div class="popover-section-header${collapsed ? ' collapsed' : ''}" data-section-toggle="${id}">
        <span>${title} ${countBadge}</span>
        <svg class="popover-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
      <div class="popover-section-body">${content}</div>
    </div>
  `;
}

// ─── NON-DEFAULT INDICATOR ────────────────────────────────────────────────

function nd(key: keyof AppConfig): string {
  return state.getConfig()[key] !== DEFAULT_CONFIG[key] ? ' popover-non-default' : '';
}

// ─── CHEVRON SVG ──────────────────────────────────────────────────────────

const CHEVRON_SVG =
  '<svg class="popover-label-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';

// ─── RENDER: DISPLAY SECTION ──────────────────────────────────────────────

function renderDisplaySection(): string {
  const cfg = state.getConfig();
  return sectionWrap(
    'display',
    'Display',
    'display',
    `
      <div class="popover-row${nd('sortOrder')}">
        <span class="popover-label">Sort order</span>
        <select id="cfg-sort-order" class="popover-select">
          <option value="asc"${cfg.sortOrder === 'asc' ? ' selected' : ''}>Oldest first</option>
          <option value="desc"${cfg.sortOrder === 'desc' ? ' selected' : ''}>Newest first</option>
        </select>
      </div>
      <label class="popover-checkbox-label${nd('wrapValues')}">
        <input type="checkbox" class="popover-checkbox" id="cfg-wrap-values"${cfg.wrapValues ? ' checked' : ''}>
        Wrap long values
      </label>
      <label class="popover-checkbox-label${nd('autoExpand')}">
        <input type="checkbox" class="popover-checkbox" id="cfg-auto-expand"${cfg.autoExpand ? ' checked' : ''}>
        Auto-expand sections
      </label>
      <label class="popover-checkbox-label${nd('compactRows')}">
        <input type="checkbox" class="popover-checkbox" id="cfg-compact-rows"${cfg.compactRows ? ' checked' : ''}>
        Compact rows
      </label>
      <div class="popover-row${nd('defaultTab')}">
        <span class="popover-label">Default detail tab</span>
        <select id="cfg-default-tab" class="popover-select">
          <option value="decoded"${cfg.defaultTab === 'decoded' ? ' selected' : ''}>Decoded</option>
          <option value="query"${cfg.defaultTab === 'query' ? ' selected' : ''}>Query</option>
          <option value="post"${cfg.defaultTab === 'post' ? ' selected' : ''}>POST</option>
          <option value="headers"${cfg.defaultTab === 'headers' ? ' selected' : ''}>Headers</option>
          <option value="response"${cfg.defaultTab === 'response' ? ' selected' : ''}>Response</option>
        </select>
      </div>
    `
  );
}

// ─── RENDER: NETWORK LIMITS SECTION ──────────────────────────────────

function renderNetworkLimitsSection(): string {
  const cfg = state.getConfig();
  return sectionWrap(
    'network-limits',
    'Limits',
    'performance',
    `
      <div class="popover-row${nd('maxRequests')}">
        <span class="popover-label">Max requests</span>
        <select id="cfg-max-requests" class="popover-select">
          <option value="100"${cfg.maxRequests === 100 ? ' selected' : ''}>100</option>
          <option value="250"${cfg.maxRequests === 250 ? ' selected' : ''}>250</option>
          <option value="500"${cfg.maxRequests === 500 ? ' selected' : ''}>500</option>
          <option value="1000"${cfg.maxRequests === 1000 ? ' selected' : ''}>1,000</option>
          <option value="2500"${cfg.maxRequests === 2500 ? ' selected' : ''}>2,500</option>
          <option value="5000"${cfg.maxRequests === 5000 ? ' selected' : ''}>5,000</option>
        </select>
      </div>
      <label class="popover-checkbox-label${nd('autoPrune')}">
        <input type="checkbox" class="popover-checkbox" id="cfg-auto-prune"${cfg.autoPrune ? ' checked' : ''}>
        Auto-prune when limit reached
      </label>
    `
  );
}

// ─── RENDER: DL LIMITS SECTION ────────────────────────────────────────
function renderDlLimitsSection(): string {
  const cfg = state.getConfig();
  return sectionWrap(
    'dl-limits',
    'Limits',
    'performance',
    `
      <div class="popover-row${nd('maxDlPushes')}">
        <span class="popover-label">Max DL pushes</span>
        <select id="cfg-max-dl-pushes" class="popover-select">
          <option value="200"${cfg.maxDlPushes === 200 ? ' selected' : ''}>200</option>
          <option value="500"${cfg.maxDlPushes === 500 ? ' selected' : ''}>500</option>
          <option value="1000"${cfg.maxDlPushes === 1000 ? ' selected' : ''}>1,000</option>
          <option value="2000"${cfg.maxDlPushes === 2000 ? ' selected' : ''}>2,000</option>
          <option value="5000"${cfg.maxDlPushes === 5000 ? ' selected' : ''}>5,000</option>
        </select>
      </div>
    `
  );
}

// ─── RENDER: DL DISPLAY SECTION ────────────────────────────────────────────

function renderDlDisplaySection(): string {
  const cfg = state.getConfig();
  return sectionWrap(
    'dl-display',
    'DataLayer Display',
    'dl-display',
    `
      <div class="popover-row${nd('dlSortField')}">
        <span class="popover-label">Sort field</span>
        <select id="cfg-dl-sort-field" class="popover-select">
          <option value="time"${cfg.dlSortField === 'time' ? ' selected' : ''}>Time</option>
          <option value="keycount"${cfg.dlSortField === 'keycount' ? ' selected' : ''}>Key count</option>
          <option value="source"${cfg.dlSortField === 'source' ? ' selected' : ''}>Source</option>
        </select>
      </div>
      <div class="popover-row${nd('dlSortOrder')}">
        <span class="popover-label">Sort order</span>
        <select id="cfg-dl-sort-order" class="popover-select">
          <option value="asc"${cfg.dlSortOrder === 'asc' ? ' selected' : ''}>Oldest first</option>
          <option value="desc"${cfg.dlSortOrder === 'desc' ? ' selected' : ''}>Newest first</option>
        </select>
      </div>
      <label class="popover-checkbox-label${nd('dlGroupBySource')}">
        <input type="checkbox" class="popover-checkbox" id="cfg-dl-group-by-source"${cfg.dlGroupBySource ? ' checked' : ''}>
        Group by source
      </label>
    `
  );
}

// ─── RENDER: DL TOOLS SECTION ─────────────────────────────────────────────

function renderDlToolsSection(): string {
  const cfg = state.getConfig();
  const rules = dlState.getValidationRules();
  const activeRules = rules.filter((r) => r.enabled).length;

  return sectionWrap(
    'dl-tools',
    'DataLayer Tools',
    'dl-tools',
    `
      <div class="popover-row${nd('correlationWindowMs')}">
        <span class="popover-label">Correlation window</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <input type="number" id="cfg-correlation-window" class="popover-number-input" value="${Number(cfg.correlationWindowMs) || 5000}" min="500" max="10000" step="500">
          <span style="font-size:10px;color:var(--text-2);">ms</span>
        </div>
      </div>

      <div class="popover-filter-item" data-filter-toggle="validation">
        <span class="popover-label">${CHEVRON_SVG} Validation rules</span>
        <span class="popover-filter-value" id="cfg-validation-count">${activeRules > 0 ? `${activeRules} active` : '0 active'}</span>
      </div>
      <div class="popover-filter-expand" id="cfg-validation-expand">
        <div style="padding-top:4px;">
          <div class="popover-validation-summary">
            <span>Validation errors:</span>
            <span class="popover-val-error-count" id="cfg-val-error-count">0</span>
            <span>pushes affected</span>
          </div>
          <div class="popover-val-section">
            <div class="popover-val-section-title">Preset Rules</div>
            <div id="cfg-val-rules-list"></div>
          </div>
          <div class="popover-val-section">
            <div class="popover-val-section-title">Custom Rules</div>
            <div id="cfg-val-custom-rules"></div>
            <button id="cfg-val-add-rule" class="popover-val-add-btn">+ Add custom rule</button>
          </div>
        </div>
      </div>
    `
  );
}

// ─── RENDER: TAB CONTENT ──────────────────────────────────────────────────

function renderTabContent(tab: DrawerTab): void {
  const $body = DOM.popoverBody;
  if (!$body) return;

  let html = '';
  switch (tab) {
    case 'network':
      html = renderDisplaySection() + renderNetworkLimitsSection();
      break;
    case 'datalayer':
      html = renderDlDisplaySection() + renderDlToolsSection() + renderDlLimitsSection();
      break;
  }

  $body.innerHTML = html;
  wireUpSectionControls(tab);
  updateAccordionState();
}

// ─── WIRE UP SECTION CONTROLS ────────────────────────────────────────────

function wireUpSectionControls(tab: DrawerTab): void {
  if (tab === 'network') {
    // Display
    wireSelect('cfg-sort-order', 'sortOrder', () => ctx?.syncQuickButtons());
    wireCheckbox('cfg-wrap-values', 'wrapValues', () => {
      ctx?.syncQuickButtons();
      ctx?.applyWrapValuesClass();
    });
    wireCheckbox('cfg-auto-expand', 'autoExpand', () => ctx?.syncQuickButtons());
    wireCheckbox('cfg-compact-rows', 'compactRows', () => ctx?.applyCompactRowsClass());
    wireSelect('cfg-default-tab', 'defaultTab');
    // Limits
    wireSelect('cfg-max-requests', 'maxRequests');
    wireCheckbox('cfg-auto-prune', 'autoPrune');
  }

  if (tab === 'datalayer') {
    // DL Display
    wireSelect('cfg-dl-sort-field', 'dlSortField', () => {
      const val = (document.getElementById('cfg-dl-sort-field') as HTMLSelectElement)?.value;
      if (val) dlState.setDlSortField(val as 'time' | 'keycount' | 'source');
    });
    wireSelect('cfg-dl-sort-order', 'dlSortOrder', () => {
      const val = (document.getElementById('cfg-dl-sort-order') as HTMLSelectElement)?.value;
      if (val) dlState.setDlSortOrder(val as 'asc' | 'desc');
      ctx?.syncDlQuickButtons();
    });
    wireCheckbox('cfg-dl-group-by-source', 'dlGroupBySource', () => {
      dlState.setDlGroupBySource(state.getConfig().dlGroupBySource);
    });
    // DL Tools
    wireCorrelationWindow();
    wireValidationExpand();
    // Limits
    wireSelect('cfg-max-dl-pushes', 'maxDlPushes');
  }
}

// ─── WIRE HELPERS ─────────────────────────────────────────────────────────

function wireSelect(id: string, key: keyof AppConfig, afterFn?: () => void): void {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  if (!el) return;
  el.value = String(state.getConfig()[key]);
  el.addEventListener('change', () => {
    state.updateConfig(key, el.value as AppConfig[typeof key]);
    afterFn?.();
  });
}

function wireCheckbox(id: string, key: keyof AppConfig, afterFn?: () => void): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.checked = state.getConfig()[key] as boolean;
  el.addEventListener('change', () => {
    state.updateConfig(key, el.checked);
    afterFn?.();
  });
}

function wireCorrelationWindow(): void {
  const el = document.getElementById('cfg-correlation-window') as HTMLInputElement | null;
  if (!el) return;
  el.value = String(state.getConfig().correlationWindowMs);
  el.addEventListener('change', () => {
    const val = parseInt(el.value, 10) || 2000;
    state.updateConfig('correlationWindowMs', val);
    dlState.setCorrelationWindow(val);
  });
}

// ─── FOOTER BUTTONS ────────────────────────────────────────────────────────

function wireFooterButtons(): void {
  // Reset filters
  document.getElementById('btn-popover-reset-filters')?.addEventListener('click', () => {
    state.resetFilters();
    dlState.setDlFilterText('');
    dlState.setDlFilterSource('');
    dlState.setDlFilterEventName('');
    dlState.setDlFilterHasKey('');
    dlState.setDlEcommerceOnly(false);
    if (DOM.filterInput) DOM.filterInput.value = '';
    const clearFilter = DOM.clearFilter;
    if (clearFilter) clearFilter.style.display = 'none';
    if (DOM.dlFilterInput) DOM.dlFilterInput.value = '';
    ctx?.doApplyFilters();
    ctx?.doUpdateActiveFilters();
    refreshContent();
  });

  // Reset to defaults
  document.getElementById('btn-popover-reset-all')?.addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    state.resetConfig();
    dlState.initDlSortState();
    closeSettings();
    ctx?.syncQuickButtons();
    ctx?.syncDlQuickButtons();
    ctx?.applyWrapValuesClass();
    ctx?.applyCompactRowsClass();
  });

  // Export config
  document.getElementById('btn-popover-export-config')?.addEventListener('click', () => {
    const config = state.getConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagdragon-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import config
  document.getElementById('btn-popover-import-config')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          const newConfig = { ...DEFAULT_CONFIG, ...imported };
          for (const [key, value] of Object.entries(newConfig)) {
            const cfgKey = key as keyof AppConfig;
            state.updateConfig(cfgKey, value as AppConfig[typeof cfgKey]);
          }
          dlState.initDlSortState();
          refreshContent();
          ctx?.syncQuickButtons();
          ctx?.syncDlQuickButtons();
          ctx?.applyWrapValuesClass();
          ctx?.applyCompactRowsClass();
        } catch {
          console.warn('TagDragon: Invalid config file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── SETTINGS SEARCH ───────────────────────────────────────────────────────

function wireSettingsSearch(): void {
  const $search = DOM.settingsSearch;
  if (!$search) return;

  $search.addEventListener('input', () => {
    const q = $search.value.toLowerCase().trim();
    const $sections = DOM.popoverBody?.querySelectorAll('.popover-section') ?? [];

    $sections.forEach(($sec) => {
      const sectionEl = $sec as HTMLElement;
      const text = sectionEl.textContent?.toLowerCase() ?? '';
      const matches = q.length === 0 || text.includes(q);
      sectionEl.classList.toggle('popover-hidden', !matches);
    });
  });
}

// ─── WIRE VALIDATION EXPAND ───────────────────────────────────────────────

function wireValidationExpand(): void {
  const toggle = document.querySelector('[data-filter-toggle="validation"]');
  const expand = document.getElementById('cfg-validation-expand');
  if (!toggle || !expand) return;

  toggle.addEventListener('click', () => {
    const isOpen = expand.classList.contains('open');
    closeAllExpands();
    if (!isOpen) {
      expand.classList.add('open');
      if (!expand.dataset.populated) {
        populateValidationRules(expand);
        expand.dataset.populated = '1';
      }
    }
  });
}

function populateValidationRules(_expandEl: HTMLElement): void {
  renderPopoverValidationRules();
  renderPopoverCustomRules();
  updatePopoverValidationSummary();
  wirePopoverValidationHandlers();
}

// ─── POPOVER VALIDATION ───────────────────────────────────────────────────

function renderPopoverValidationRules(): void {
  const $list = document.getElementById('cfg-val-rules-list');
  if (!$list) return;

  const rules = dlState.getValidationRules().filter((r) => !r.id.startsWith('custom-'));
  $list.innerHTML = '';

  for (const rule of rules) {
    const row = document.createElement('div');
    row.className = 'popover-filter-option';
    row.style.padding = '4px 12px';

    const toggle = document.createElement('button');
    toggle.className = `popover-footer-btn${rule.enabled ? ' active' : ''}`;
    toggle.style.minWidth = '60px';
    toggle.textContent = rule.enabled ? 'ON' : 'OFF';
    toggle.addEventListener('click', () => {
      rule.enabled = !rule.enabled;
      toggle.textContent = rule.enabled ? 'ON' : 'OFF';
      toggle.classList.toggle('active', rule.enabled);
      saveValidationRulesToStorage(dlState.getValidationRules());
      dispatchRevalidate();
      updatePopoverValidationSummary();
    });

    const name = document.createElement('span');
    name.style.cssText = 'font-size:11px;color:var(--text-1);flex:1;';
    name.textContent = rule.name;

    row.appendChild(toggle);
    row.appendChild(name);
    $list.appendChild(row);
  }

  if (rules.length === 0) {
    $list.innerHTML = '<div class="popover-empty-state">No preset rules</div>';
  }
}

function renderPopoverCustomRules(): void {
  const $list = document.getElementById('cfg-val-custom-rules');
  if (!$list) return;

  const rules = dlState.getValidationRules().filter((r) => r.id.startsWith('custom-'));
  $list.innerHTML = '';

  for (const rule of rules) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:4px 12px;';

    const toggle = document.createElement('button');
    toggle.className = `popover-footer-btn${rule.enabled ? ' active' : ''}`;
    toggle.style.minWidth = '60px';
    toggle.textContent = rule.enabled ? 'ON' : 'OFF';
    toggle.addEventListener('click', () => {
      rule.enabled = !rule.enabled;
      toggle.textContent = rule.enabled ? 'ON' : 'OFF';
      toggle.classList.toggle('active', rule.enabled);
      saveValidationRulesToStorage(dlState.getValidationRules());
      dispatchRevalidate();
      updatePopoverValidationSummary();
    });

    const name = document.createElement('span');
    name.style.cssText =
      'font-size:11px;color:var(--text-1);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    name.textContent = rule.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText =
      'background:none;border:none;color:var(--red, #ef5350);cursor:pointer;font-size:14px;padding:0 4px;opacity:0.5;';
    deleteBtn.addEventListener('click', () => {
      const updated = dlState.getValidationRules().filter((r) => r.id !== rule.id);
      dlState.setValidationRules(updated);
      saveValidationRulesToStorage(updated);
      dispatchRevalidate();
      renderPopoverCustomRules();
      updatePopoverValidationSummary();
    });
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.opacity = '1';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.opacity = '0.5';
    });

    row.appendChild(toggle);
    row.appendChild(name);
    row.appendChild(deleteBtn);
    $list.appendChild(row);
  }
}

function updatePopoverValidationSummary(): void {
  const $count = document.getElementById('cfg-val-error-count');
  if ($count) {
    const pushes = dlState.getAllDlPushes();
    let affectedCount = 0;
    for (const p of pushes) {
      if (dlState.getValidationErrors(p.id).length > 0) affectedCount++;
    }
    $count.textContent = String(affectedCount);
  }

  // Update count badge
  const $badge = document.getElementById('cfg-validation-count');
  if ($badge) {
    const activeRules = dlState.getValidationRules().filter((r) => r.enabled).length;
    $badge.textContent = activeRules > 0 ? `${activeRules} active` : '0 active';
  }
}

function wirePopoverValidationHandlers(): void {
  document.getElementById('cfg-val-add-rule')?.addEventListener('click', () => {
    const $container = document.getElementById('cfg-val-custom-rules');
    if (!$container) return;
    if ($container.querySelector('.dl-val-add-form')) return;

    const form = document.createElement('div');
    form.className = 'dl-val-add-form';
    form.style.cssText = 'padding:8px 0;';
    form.innerHTML = `
      <div style="margin-bottom:6px;">
        <input type="text" id="dl-val-new-name" placeholder="Rule name" class="popover-filter-search" style="margin:0;width:100%;">
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <select id="dl-val-new-type" class="popover-select" style="max-width:none;flex:1;">
          <option value="required_key">Required key</option>
          <option value="forbidden_key">Forbidden key</option>
        </select>
      </div>
      <div style="margin-bottom:6px;">
        <input type="text" id="dl-val-new-key" placeholder="Key path (e.g. ecommerce.transaction_id)" class="popover-filter-search" style="margin:0;width:100%;">
      </div>
      <div style="display:flex;gap:4px;">
        <input type="text" id="dl-val-new-event" placeholder="Event name (optional)" class="popover-filter-search" style="margin:0;flex:1;">
        <button id="dl-val-save-new" class="popover-footer-btn" style="background:var(--accent);color:#fff;border-color:var(--accent);">Add</button>
        <button id="dl-val-cancel-new" class="popover-footer-btn">Cancel</button>
      </div>
    `;

    $container.appendChild(form);
    (document.getElementById('dl-val-new-name') as HTMLInputElement)?.focus();

    document.getElementById('dl-val-cancel-new')?.addEventListener('click', () => form.remove());
    document.getElementById('dl-val-save-new')?.addEventListener('click', () => {
      const name = (document.getElementById('dl-val-new-name') as HTMLInputElement)?.value.trim();
      const type = (document.getElementById('dl-val-new-type') as HTMLSelectElement)?.value;
      const key = (document.getElementById('dl-val-new-key') as HTMLInputElement)?.value.trim();
      const event = (document.getElementById('dl-val-new-event') as HTMLInputElement)?.value.trim();

      if (!name || !key) return;

      const newRule = {
        id: `custom-${Date.now()}`,
        name,
        enabled: true,
        scope: event ? { eventName: event } : {},
        checks: [
          {
            type: type as 'required_key' | 'forbidden_key',
            key,
            message: `${type === 'required_key' ? 'Missing' : 'Forbidden'} ${key}`,
          },
        ],
      };

      const rules = [...dlState.getValidationRules(), newRule];
      dlState.setValidationRules(rules);
      saveValidationRulesToStorage(rules);
      dispatchRevalidate();
      form.remove();
      renderPopoverCustomRules();
      updatePopoverValidationSummary();
    });
  });
}

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────

function saveValidationRulesToStorage(rules: unknown[]): void {
  try {
    void chrome.storage.local.set({ rt_validation_rules: rules });
  } catch {
    // non-fatal
  }
}

function dispatchRevalidate(): void {
  document.dispatchEvent(new CustomEvent('tagdragon:revalidate'));
}
