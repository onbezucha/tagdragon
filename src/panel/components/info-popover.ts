// ─── INFO POPOVER ─────────────────────────────────────────────────────────────

import { PROVIDERS } from '@/providers/index';
import { PROVIDER_GROUPS } from '@/shared/provider-groups';
import { DATA_LAYER_SOURCES } from '@/shared/datalayer-constants';
import { DOM } from '../utils/dom';
import { isMac, modLabel } from '../utils/platform';
import { esc } from '../utils/format';
import { buildGroupIcon } from '../utils/icon-builder';
import { GROUP_ICONS } from '../utils/group-icons';
import {
  createIcons,
  Cable,
  Database,
  Eraser,
  Cookie,
  Sun,
  Moon,
  Trash2,
  Settings,
  CircleHelp,
  Search,
  ArrowUpDown,
  WrapText,
  Maximize2,
  AlignJustify,
  Filter,
  Download,
  Pause,
  Play,
  ChevronDown,
  X,
  SlidersHorizontal,
  ShoppingCart,
  CheckCircle,
} from 'lucide';

// ─── INIT ─────────────────────────────────────────────────────────────────────

export function initInfoPopover(): void {
  const $btn = DOM.btnInfo;
  const $popover = DOM.infoPopover;

  if (!$btn || !$popover) return;

  $btn.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const opening = !$popover.classList.contains('visible');
    $popover.classList.toggle('visible');
    if (opening) {
      DOM.settingsPopover?.classList.remove('visible');
      DOM.providerPopover?.classList.remove('visible');
      DOM.consentPopover?.classList.remove('visible');
      DOM.envPopover?.classList.remove('visible');
      // Focus search on open
      setTimeout(
        () => (document.getElementById('info-search') as HTMLInputElement | null)?.focus(),
        50
      );
    }
  });

  setVersion();
  renderProviderGroups();
  renderShortcuts();
  renderToolbarIcons();
  renderDataLayerSources();
  initAccordion($popover);
  initSearch();
}

// ─── CLOSE (called from external handlers) ────────────────────────────────────

export function closeInfoPopover(): void {
  DOM.infoPopover?.classList.remove('visible');
}

// ─── VERSION ──────────────────────────────────────────────────────────────────

function setVersion(): void {
  const $el = document.getElementById('info-version');
  if (!$el) return;
  try {
    const manifest = chrome.runtime.getManifest();
    $el.textContent = `v${manifest.version}`;
  } catch {
    // fallback already set in HTML
  }
}

// ─── PROVIDER GROUPS ──────────────────────────────────────────────────────────

function renderProviderGroups(): void {
  const $container = DOM.infoProviderGroups;
  if (!$container) return;

  const colorMap = new Map<string, string>();
  for (const p of PROVIDERS) {
    colorMap.set(p.name, p.color);
  }

  $container.innerHTML = PROVIDER_GROUPS.map((group) => {
    const pills = group.providers
      .map((name) => {
        const color = colorMap.get(name) ?? '#888';
        const icon = buildGroupIcon(name);
        const visual = icon
          ? `<span class="info-pill-icon">${icon}</span>`
          : `<span class="info-pill-dot" style="background:${color}"></span>`;
        return (
          `<span class="info-provider-pill" data-name="${esc(name)}">` +
          `${visual}${esc(name)}</span>`
        );
      })
      .join('');

    const groupIcon = GROUP_ICONS[group.id] ?? '';

    return `
      <div class="info-provider-group" data-group="${group.id}">
        <div class="info-provider-group-label">
          ${groupIcon ? `<span class="info-group-icon">${groupIcon}</span>` : ''}
          ${esc(group.label)}
          <span class="info-provider-group-count">${group.providers.length}</span>
        </div>
        <div class="info-provider-pills">${pills}</div>
      </div>
    `;
  }).join('');
}

// ─── SHORTCUTS ────────────────────────────────────────────────────────────────

function renderShortcuts(): void {
  const $container = document.getElementById('info-shortcuts-list');
  if (!$container) return;

  const shortcuts: Array<{
    label: string;
    keys: string;
  }> = [
    {
      label: 'Clear all (network)',
      keys: 'Ctrl+L',
    },
    {
      label: 'Focus search',
      keys: 'Ctrl+F',
    },
    {
      label: 'Navigate list',
      keys: '↑ ↓',
    },
    {
      label: 'Jump to first / last',
      keys: isMac ? '⌘↑ / ⌘↓' : 'Home / End',
    },
    {
      label: 'Close detail / clear search',
      keys: 'Esc',
    },
  ];

  $container.innerHTML = shortcuts
    .map((s) => `<div class="info-shortcut"><span>${s.label}</span><kbd>${s.keys}</kbd></div>`)
    .join('');
}

// ─── TOOLBAR ICONS ──────────────────────────────────────────────────────────

function renderToolbarIcons(): void {
  const $container = document.getElementById('info-toolbar-icons');
  if (!$container) return;

  const mod = modLabel();

  const groups: Array<{
    label: string;
    items: Array<{ icon: string; name: string; desc: string }>;
  }> = [
    {
      label: 'Global bar',
      items: [
        { icon: 'cable', name: 'Network', desc: 'Switch to network requests tab' },
        { icon: 'database', name: 'DataLayer', desc: 'Switch to DataLayer pushes tab' },
        { icon: 'eraser', name: 'Clear Cookies', desc: 'Delete all cookies on the inspected page' },
        { icon: 'cookie', name: 'Consent', desc: 'Open cookie consent state inspector' },
        { icon: 'sun', name: 'Theme', desc: 'Toggle between light and dark mode' },
        { icon: 'trash-2', name: 'Clear All', desc: `Clear all captured requests (${mod}+L)` },
        { icon: 'settings', name: 'Settings', desc: 'Open filters and settings popover' },
        { icon: 'circle-help', name: 'Info', desc: 'Open this About panel' },
      ],
    },
    {
      label: 'Network bar',
      items: [
        {
          icon: 'search',
          name: 'Search',
          desc: `Filter by URL, parameter, or provider (${mod}+F)`,
        },
        { icon: 'arrow-up-down', name: 'Sort', desc: 'Toggle between newest/oldest first' },
        { icon: 'wrap-text', name: 'Wrap', desc: 'Toggle long parameter value wrapping' },
        { icon: 'maximize-2', name: 'Auto-expand', desc: 'Auto-expand detail sections on select' },
        { icon: 'align-justify', name: 'Compact', desc: 'Toggle compact row display' },
        { icon: 'filter', name: 'Providers', desc: 'Filter by provider — click pill to hide/show' },
        { icon: 'download', name: 'Export', desc: 'Export captured requests as JSON or CSV' },
        { icon: 'pause', name: 'Pause', desc: 'Pause/resume request capture' },
      ],
    },
    {
      label: 'DataLayer bar',
      items: [
        { icon: 'search', name: 'Search', desc: `Filter by event, key, or value (${mod}+F)` },
        { icon: 'download', name: 'Export', desc: 'Export DataLayer pushes as JSON' },
        { icon: 'pause', name: 'Pause', desc: 'Pause/resume DataLayer capture' },
      ],
    },
  ];

  $container.innerHTML = groups
    .map(
      (group) => `
      <div class="info-icons-group">
        <div class="info-icons-group-label">${group.label}</div>
        <div class="info-icons-grid">
          ${group.items
            .map(
              (item) => `
            <div class="info-icons-item">
              <i data-lucide="${item.icon}" class="info-icons-lucide"></i>
              <div class="info-icons-text">
                <span class="info-icons-name">${item.name}</span>
                <span class="info-icons-desc">${item.desc}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');

  // Re-render Lucide icons for the new elements
  createIcons({
    icons: {
      Cable,
      Database,
      Eraser,
      Cookie,
      Sun,
      Moon,
      Trash2,
      Settings,
      CircleHelp,
      Search,
      ArrowUpDown,
      WrapText,
      Maximize2,
      AlignJustify,
      Filter,
      Download,
      Pause,
      Play,
      ChevronDown,
      X,
      SlidersHorizontal,
      ShoppingCart,
      CheckCircle,
    },
  });
}

// ─── DATALAYER SOURCES ───────────────────────────────────────────────────────

function renderDataLayerSources(): void {
  const $container = document.getElementById('info-dl-sources');
  if (!$container) return;

  $container.innerHTML = DATA_LAYER_SOURCES.map(
    (src) => `
    <div class="info-dl-source">
      <div class="info-dl-source-header">
        <span class="info-dl-source-label">${src.label}</span>
        <code class="info-dl-source-var">${src.globalVar}</code>
      </div>
      <div class="info-dl-source-desc">${src.description}</div>
    </div>
  `
  ).join('');
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

function initSearch(): void {
  const $input = document.getElementById('info-search') as HTMLInputElement | null;
  const $clear = document.getElementById('btn-info-search-clear') as HTMLButtonElement | null;
  const $noResults = document.getElementById('info-no-results');

  if (!$input) return;

  $input.addEventListener('input', () => {
    applySearch($input.value);
    if ($clear) $clear.classList.toggle('hidden', $input.value.length === 0);
  });

  $clear?.addEventListener('click', () => {
    $input.value = '';
    $clear.classList.add('hidden');
    applySearch('');
    $input.focus();
  });

  function applySearch(query: string): void {
    const q = query.toLowerCase().trim();
    const $groups = document.querySelectorAll<HTMLElement>('.info-provider-group');
    let totalVisible = 0;

    $groups.forEach(($group) => {
      const pills = $group.querySelectorAll<HTMLElement>('.info-provider-pill');
      let groupVisible = 0;

      pills.forEach((pill) => {
        const name = (pill.dataset.name ?? '').toLowerCase();
        const match = q.length === 0 || name.includes(q);
        pill.classList.toggle('hidden', !match);
        if (match) groupVisible++;
      });

      $group.classList.toggle('hidden', groupVisible === 0);
      totalVisible += groupVisible;
    });

    if ($noResults) $noResults.classList.toggle('hidden', totalVisible > 0 || q.length === 0);
  }
}

// ─── ACCORDION ────────────────────────────────────────────────────────────────

function initAccordion($popover: HTMLElement): void {
  $popover.querySelectorAll('.info-section-header').forEach((header) => {
    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}
