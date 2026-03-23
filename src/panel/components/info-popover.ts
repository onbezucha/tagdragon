// ─── INFO POPOVER ─────────────────────────────────────────────────────────────

import { PROVIDERS } from '@/providers/index';
import { PROVIDER_GROUPS } from '@/shared/provider-groups';
import { DOM } from '../utils/dom';

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
      setTimeout(() => (document.getElementById('info-search') as HTMLInputElement | null)?.focus(), 50);
    }
  });

  setVersion();
  renderProviderGroups();
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

  $container.innerHTML = PROVIDER_GROUPS.map(group => {
    const pills = group.providers.map(name => {
      const color = colorMap.get(name) ?? '#888';
      return `<span class="info-provider-pill" data-name="${name}">` +
        `<span class="info-pill-dot" style="background:${color}"></span>${name}</span>`;
    }).join('');

    return `
      <div class="info-provider-group" data-group="${group.id}">
        <div class="info-provider-group-label">
          ${group.label}
          <span class="info-provider-group-count">${group.providers.length}</span>
        </div>
        <div class="info-provider-pills">${pills}</div>
      </div>
    `;
  }).join('');
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

    $groups.forEach($group => {
      const pills = $group.querySelectorAll<HTMLElement>('.info-provider-pill');
      let groupVisible = 0;

      pills.forEach(pill => {
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
  $popover.querySelectorAll('.info-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}
