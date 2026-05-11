// ─── INFO POPOVER ─────────────────────────────────────────────────────────────

import { PROVIDERS } from '@/providers/index';
import { PROVIDER_GROUPS } from '@/shared/provider-groups';
import { DATA_LAYER_SOURCES } from '@/shared/datalayer-constants';
import { getAllRequests, getActiveProviders } from '@/panel/state';
import { getDlTotalCount } from '@/panel/datalayer/state';
import { DOM } from '../utils/dom';
import { closeAllPopovers, registerPopover } from '../utils/popover-manager';
import { isMac } from '../utils/platform';
import { esc } from '../utils/format';
import { buildGroupIcon } from '../utils/icon-builder';
import { GROUP_ICONS, GROUP_COLORS } from '../utils/group-icons';
import { createIcons } from 'lucide';
import { PANEL_ICONS } from '../utils/lucide-icons';

// ─── INIT ─────────────────────────────────────────────────────────────────────

export function initInfoPopover(): void {
  const $btn = DOM.btnInfo;
  const $popover = DOM.infoPopover;

  if (!$btn || !$popover) return;

  $btn.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const opening = !$popover.classList.contains('visible');
    closeAllPopovers();
    if (opening) {
      $popover.classList.add('visible');
      renderSessionStats();
      // Focus search on open
      setTimeout(
        () => (document.getElementById('info-search') as HTMLInputElement | null)?.focus(),
        50
      );
    }
  });

  setVersion();
  updateDescription();
  renderProviderGroups();
  renderWhatsNew();
  renderShortcuts();
  renderToolbarIcons();
  renderDataLayerSources();
  initAccordion($popover);
  initSearch();
  registerPopover('info', closeInfoPopover);
}

// ─── CLOSE (called from external handlers) ────────────────────────────────────

export function closeInfoPopover(): void {
  DOM.infoPopover?.classList.remove('visible');
}

export function isOpen(): boolean {
  return DOM.infoPopover?.classList.contains('visible') ?? false;
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

// ─── DESCRIPTION ──────────────────────────────────────────────────────────

function updateDescription(): void {
  const $count = document.getElementById('info-provider-count');
  if ($count) $count.textContent = String(PROVIDERS.length);

  const $categories = document.getElementById('info-category-count');
  if ($categories) $categories.textContent = String(PROVIDER_GROUPS.length);
}

// ─── SESSION STATS ────────────────────────────────────────────────────────

function renderSessionStats(): void {
  const $reqs = document.getElementById('info-stat-requests');
  const $provs = document.getElementById('info-stat-providers');
  const $dl = document.getElementById('info-stat-dl');
  const $top = document.getElementById('info-stats-top');

  if (!$reqs || !$provs || !$dl || !$top) return;

  // 1. Read counts from state modules (all O(1) except requests.length)
  const requests = getAllRequests();
  const requestCount = requests.length;
  const providerCount = getActiveProviders().size;
  const dlPushCount = getDlTotalCount();

  // 2. Update stat cards
  $reqs.textContent = String(requestCount);
  $provs.textContent = String(providerCount);
  $dl.textContent = String(dlPushCount);

  // 3. Compute top 3 providers by request frequency
  if (requestCount === 0) {
    $top.innerHTML = '<span class="info-stats-empty">No requests captured yet</span>';
    return;
  }

  const counts = new Map<string, number>();
  for (const req of requests) {
    counts.set(req.provider, (counts.get(req.provider) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Build color map from PROVIDERS (already imported in info-popover.ts)
  const colorMap = new Map(PROVIDERS.map((p) => [p.name, p.color]));

  $top.innerHTML = sorted
    .map(([name, count]) => {
      const color = colorMap.get(name) ?? '#888';
      return (
        `<span class="info-top-pill" style="border-color:${color}">` +
        `${esc(name)}` +
        `<span class="info-top-pill-count">${count}</span>` +
        `</span>`
      );
    })
    .join('');
}

// ─── WHAT'S NEW ────────────────────────────────────────────────────────────

const WHATS_NEW: ReadonlyArray<{ version: string; changes: readonly string[] }> = [
  {
    version: '1.7.0',
    changes: ['Documentation overhaul — 59 providers, 75 test files, GitHub Actions CI/CD'],
  },
  {
    version: '1.6.0',
    changes: [
      'ESLint + Prettier with pre-commit hooks',
      'Bundle analysis tool (npm run analyze)',
      'DataLayer sort and group-by-source fixes',
    ],
  },
  {
    version: '1.5.6',
    changes: [
      'DataLayer validation engine with custom rules',
      'DataLayer watch paths for focused monitoring',
      'DataLayer filter popover — filter by event, key, source',
      'Provider icon caching system',
    ],
  },
  {
    version: '1.5.5',
    changes: [
      'Medallia DXA provider added',
      'Microsoft Clarity Tag provider added',
      'Domain index for faster URL matching',
    ],
  },
  {
    version: '1.5.0',
    changes: [
      'DataLayer Inspector — GTM, Tealium, Adobe, Segment, W3C',
      'Consent Panel — inspect and override cookie state',
      'Adobe Environment Switcher (DEV/ACC/PROD)',
      'Extension Popup with live stats',
    ],
  },
];

function renderWhatsNew(): void {
  const $container = document.getElementById('info-whats-new');
  if (!$container) return;

  $container.innerHTML = WHATS_NEW.map(
    (entry) => `
    <div class="info-whats-new-version">
      <span class="info-whats-new-tag">v${esc(entry.version)}</span>
      <ul class="info-whats-new-changes">
        ${entry.changes.map((c) => `<li>${esc(c)}</li>`).join('')}
      </ul>
    </div>
  `
  ).join('');
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

    const groupColor = GROUP_COLORS[group.id] ?? 'var(--border)';

    return `
      <div class="info-provider-group" data-group="${group.id}" style="border-left:3px solid ${groupColor};padding-left:8px;">
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

  const groups = [
    {
      label: 'Navigation',
      items: [
        { label: 'Navigate list', keys: '↑ ↓' },
        { label: 'Jump first / last', keys: isMac ? '⌘↑ / ⌘↓' : 'Home / End' },
      ],
    },
    {
      label: 'Actions',
      items: [
        { label: 'Clear all', keys: 'Backspace' },
        { label: 'Pause / Resume', keys: 'Space' },
        { label: 'Export data', keys: 'E' },
      ],
    },
    {
      label: 'Search & Display',
      items: [
        { label: 'Focus search', keys: '/' },
        { label: 'Switch detail tab', keys: '1–5' },
        { label: 'Toggle theme', keys: 'T' },
      ],
    },
    {
      label: 'Panels',
      items: [
        { label: 'Close / clear', keys: 'Esc' },
        { label: 'Toggle settings', keys: 'Ctrl+,' },
      ],
    },
  ];

  $container.innerHTML = groups
    .map(
      (group) => `
      <div class="info-shortcuts-group">
        <div class="info-shortcuts-group-label">${group.label}</div>
        ${group.items
          .map(
            (item) => `
          <div class="info-shortcut">
            <span>${item.label}</span>
            <kbd>${item.keys}</kbd>
          </div>
        `
          )
          .join('')}
      </div>
    `
    )
    .join('');
}

// ─── TOOLBAR ICONS ──────────────────────────────────────────────────────────

function renderToolbarIcons(): void {
  const $container = document.getElementById('info-toolbar-icons');
  if (!$container) return;

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
        { icon: 'trash-2', name: 'Clear All', desc: 'Clear all captured requests (Backspace)' },
        { icon: 'settings', name: 'Settings', desc: 'Open settings drawer (Ctrl+,)' },
        { icon: 'circle-help', name: 'Info', desc: 'Open this About panel' },
      ],
    },
    {
      label: 'Network bar',
      items: [
        {
          icon: 'search',
          name: 'Search',
          desc: 'Filter by URL, parameter, or provider (/)',
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
        { icon: 'search', name: 'Search', desc: 'Filter by event, key, or value (/)' },
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
  createIcons({ icons: PANEL_ICONS });
}

// ─── DATALAYER SOURCES ───────────────────────────────────────────────────────

function renderDataLayerSources(): void {
  const $container = document.getElementById('info-dl-sources');
  if (!$container) return;

  $container.innerHTML = DATA_LAYER_SOURCES.map(
    (src) => `
    <div class="info-dl-source" data-source="${src.id}">
      <div class="info-dl-source-header">
        <span class="info-dl-source-label">${esc(src.label)}</span>
        <code class="info-dl-source-var">${esc(src.globalVar)}</code>
      </div>
      <div class="info-dl-source-desc">${esc(src.whatIs)}</div>
      <div class="info-dl-source-howto"><strong>▸ How to read:</strong> ${esc(src.howToRead)}</div>
      <div class="info-dl-source-events">
        <span class="info-dl-source-events-label">▸ Common:</span>
        ${src.typicalEvents.map((e) => `<span class="info-dl-source-event-tag">${esc(e)}</span>`).join('')}
      </div>
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
