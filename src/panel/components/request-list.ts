// ─── VISIBLE ROW CACHE ──────────────────────────────────────────────────────
// Cached set of visible row elements for O(1) removal and navigation lookup.
// Invalidated/updated whenever row visibility changes (filter, provider hide, prune, render).

let _visibleRows = new Set<HTMLElement>();

/**
 * Add a row to the visible row cache. Call when a row becomes visible.
 */
export function addToVisibleCache(row: HTMLElement): void {
  _visibleRows.add(row);
}

/**
 * Remove a row from the visible row cache. Call when a row becomes hidden or removed.
 */
export function removeFromVisibleCache(row: HTMLElement): void {
  _visibleRows.delete(row);
}

/**
 * Clear the visible row cache entirely. Call on clear/refresh operations.
 */
export function clearVisibleCache(): void {
  _visibleRows.clear();
}

/**
 * Rebuild the visible row cache from current DOM state.
 * Call this whenever row visibility might have changed.
 */
export function updateVisibleRowCache(): void {
  _visibleRows = new Set(
    document.querySelectorAll<HTMLElement>(
      '.req-row:not(.filtered-out):not(.provider-hidden):not(.page-collapsed)'
    )
  );
  resetActiveVisibleIdx();
}

// ─── ACTIVE VISIBLE INDEX ──────────────────────────────────────────────────
// Tracked index for fast keyboard navigation. Reset when cache is rebuilt.

let _activeVisibleIdx = -1;

/**
 * Reset the active visible index. Call when the visible cache is rebuilt.
 */
export function resetActiveVisibleIdx(): void {
  _activeVisibleIdx = -1;
}

import type { ParsedRequest, PageNavigation } from '@/types/request';
import type { AppConfig } from '@/shared/constants';
import { DOM } from '../utils/dom';
import { getEventName, formatTimestamp, esc } from '../utils/format';
import {
  getHiddenProviders,
  getFilteredIds,
  getRequestMap,
  getConfig,
  getAllRequests,
} from '../state';
import { getCachedIcon } from '../utils/icon-builder';

export type SelectCallback = (data: ParsedRequest, row: HTMLElement) => void;

// Row template (parsed once, cloned for each new row)
const rowTemplate = document.createElement('template');
rowTemplate.innerHTML = `
  <div class="req-row">
    <div class="req-primary">
      <span class="req-category-icon"></span>
      <span class="req-event"></span>
      <span class="req-time"></span>
    </div>
    <div class="req-secondary">
      <span class="req-provider-dot"></span>
      <span class="req-provider-name"></span>
      <span class="req-method"></span>
      <span class="req-status"></span>
    </div>
  </div>
`;

/**
 * Create a request row element.
 * @param data Request data
 * @param isVisible Whether the row should be visible
 * @param cfg Optional config (cached for performance)
 * @param sessionStart Optional session start timestamp (cached for performance)
 * @returns The created row element
 */
export function createRequestRow(
  data: ParsedRequest,
  isVisible: boolean,
  cfg?: Readonly<AppConfig>,
  sessionStart?: string
): HTMLElement {
  const row = rowTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement;
  row.dataset.id = String(data.id);

  if (data._pageNavId) {
    row.dataset.pageNavId = data._pageNavId;
  }

  const _cfg = cfg ?? getConfig();
  const _sessionStart = sessionStart ?? getAllRequests()[0]?.timestamp;
  const time = formatTimestamp(data.timestamp, _cfg.timestampFormat, _sessionStart);
  const eventName = data._eventName || getEventName(data);

  const primary = row.firstElementChild as HTMLElement;
  const iconEl = primary.children[0] as HTMLElement;
  const reqEvent = primary.children[1] as HTMLElement;
  const reqTime = primary.children[2] as HTMLElement;

  const secondary = row.children[1] as HTMLElement;
  const dotEl = secondary.children[0] as HTMLElement;
  const nameEl = secondary.children[1] as HTMLElement;
  const methodEl = secondary.children[2] as HTMLElement;
  const statusEl = secondary.children[3] as HTMLElement;

  const iconFragment = getCachedIcon(data.provider);
  if (iconFragment) {
    iconEl.appendChild(iconFragment.cloneNode(true));
  } else {
    iconEl.remove();
  }

  reqEvent.textContent = eventName;
  reqEvent.title = eventName;
  reqTime.textContent = time;

  // Secondary line (dot + provider name + method + status)
  // Provider dot
  if (dotEl) dotEl.style.background = data.color;

  // Provider name (now in secondary, neutral color)
  nameEl.textContent = data.provider;

  // Extension badge
  if (data.source === 'extension') {
    const badge = document.createElement('span');
    badge.className = 'badge-ext';
    badge.textContent = 'EXT';
    nameEl.after(badge);
  }

  // Method
  methodEl.textContent = data.method;
  if (data.method === 'GET') methodEl.classList.add('method-get');
  else if (data.method === 'POST') methodEl.classList.add('method-post');

  // Status
  statusEl.textContent = String(data.status || '—');
  if (data.status) statusEl.classList.add(`status-${String(data.status)[0]}`);

  // Status-based row classes
  if (data.status) {
    const firstDigit = String(data.status)[0];
    row.classList.add('status-code-' + firstDigit);
    if (data.status >= 400) {
      row.classList.add('error-row');
    }
  }

  // Apply filter visibility
  if (!isVisible) {
    const providerHidden = getHiddenProviders().has(data.provider);
    row.classList.add(providerHidden ? 'provider-hidden' : 'filtered-out');
  }

  // Conditional slide-in animation (only for visible rows)
  if (isVisible) {
    row.classList.add('new');
    row.addEventListener('animationend', () => row.classList.remove('new'), { once: true });
    // Add to visible cache for incremental tracking
    addToVisibleCache(row);
  }

  return row;
}

/**
 * Create a page navigation divider element.
 * Not a .req-row — ignored by keyboard navigation, filters, and selection.
 */
export function createPageDivider(nav: PageNavigation): HTMLElement {
  const divider = document.createElement('div');
  divider.className = 'page-divider';
  divider.dataset.navId = nav.id;
  divider.dataset.pageUrl = nav.url;

  // Parse URL into hostname + path
  let hostname = '';
  let displayPath = '';
  try {
    const u = new URL(nav.url);
    hostname = u.hostname;
    displayPath = u.pathname + u.search;
  } catch {
    displayPath = nav.url;
  }

  // Parse timestamp
  const time = new Date(nav.timestamp);
  const timeStr = time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  divider.innerHTML = `
    <div class="page-divider-left">
      <svg class="page-divider-chevron" width="12" height="12" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
      <svg class="page-divider-favicon" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
      <span class="page-divider-hostname">${esc(hostname)}</span>
      <span class="page-divider-time">${esc(timeStr)}</span>
      <span class="page-divider-path">${esc(displayPath)}</span>
    </div>
    <div class="page-divider-right">
      <span class="page-divider-count">0</span>
    </div>
  `;

  // Full URL on hover
  divider.title = nav.url;

  return divider;
}

/**
 * Update visibility of all rows based on filter state.
 */
export function updateRowVisibility(): void {
  const $list = DOM.list!;
  const $empty = DOM.empty;
  const rows = $list.children;
  const filteredIds = getFilteredIds();
  const hiddenProviders = getHiddenProviders();
  const requestMap = getRequestMap();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as HTMLElement;
    if (row === $empty || !row.dataset?.id) continue;

    const id = row.dataset.id!;
    const shouldBeVisible = filteredIds.has(id);
    const isCurrentlyHidden =
      row.classList.contains('filtered-out') || row.classList.contains('provider-hidden');

    if (shouldBeVisible && isCurrentlyHidden) {
      row.classList.remove('filtered-out', 'provider-hidden');
    } else if (!shouldBeVisible) {
      // Determine if hidden by provider or by filter
      const data = requestMap.get(id);
      if (data && hiddenProviders.has(data.provider)) {
        if (!row.classList.contains('provider-hidden')) {
          row.classList.remove('filtered-out');
          row.classList.add('provider-hidden');
        }
      } else {
        if (!row.classList.contains('filtered-out')) {
          row.classList.remove('provider-hidden');
          row.classList.add('filtered-out');
        }
      }
    }
  }

  // Rebuild cache after visibility changes
  updateVisibleRowCache();
}

/**
 * Navigate request list by direction.
 * @param direction 1 for down, -1 for up
 * @param selectCallback Callback to select request
 */
export function navigateList(direction: 1 | -1, selectCallback: SelectCallback): void {
  const rows = [..._visibleRows];
  if (rows.length === 0) return;

  // Fast path: use tracked index if valid
  let currentIdx = _activeVisibleIdx;
  // Validate: ensure tracked index still matches active row
  if (
    currentIdx < 0 ||
    currentIdx >= rows.length ||
    !rows[currentIdx]?.classList.contains('active')
  ) {
    currentIdx = rows.findIndex((r) => r.classList.contains('active'));
  }

  let nextIdx: number;

  if (currentIdx === -1) {
    nextIdx = direction > 0 ? 0 : rows.length - 1;
  } else {
    nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= rows.length) nextIdx = rows.length - 1;
  }

  const nextRow = rows[nextIdx];
  const data = getRequestMap().get(nextRow.dataset.id!);
  if (data) {
    selectCallback(data, nextRow);
    _activeVisibleIdx = nextIdx;
  }
}

/**
 * Navigate to first or last visible row.
 * @param edge 'first' or 'last'
 * @param selectCallback Callback to select request
 */
export function navigateToEdge(edge: 'first' | 'last', selectCallback: SelectCallback): void {
  const rows = [..._visibleRows];
  if (rows.length === 0) return;
  const row = edge === 'first' ? rows[0] : rows[rows.length - 1];
  const data = getRequestMap().get(row.dataset.id!);
  if (data) selectCallback(data, row);
}
