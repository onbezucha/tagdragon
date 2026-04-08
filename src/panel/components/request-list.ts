// ─── REQUEST LIST COMPONENT ──────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';
import type { AppConfig } from '@/shared/constants';
import { DOM } from '../utils/dom';
import { getEventName, formatTimestamp } from '../utils/format';
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

  const _cfg = cfg ?? getConfig();
  const _sessionStart = sessionStart ?? getAllRequests()[0]?.timestamp;
  const time = formatTimestamp(data.timestamp, _cfg.timestampFormat, _sessionStart);
  const eventName = data._eventName || getEventName(data);

  // Primary line (icon + EVENT NAME + time)
  const iconEl = row.querySelector('.req-category-icon') as HTMLElement;
  const iconFragment = getCachedIcon(data.provider);
  if (iconFragment) {
    iconEl.appendChild(iconFragment.cloneNode(true));
  } else {
    iconEl.remove();
  }

  (row.querySelector('.req-event') as HTMLElement).textContent = eventName;
  (row.querySelector('.req-time') as HTMLElement).textContent = time;

  // Secondary line (dot + provider name + method + status)
  // Provider dot
  const dotEl = row.querySelector('.req-provider-dot') as HTMLElement;
  if (dotEl) dotEl.style.background = data.color;

  // Provider name (now in secondary, neutral color)
  const nameEl = row.querySelector('.req-provider-name') as HTMLElement;
  nameEl.textContent = data.provider;

  // Extension badge
  if (data.source === 'extension') {
    const badge = document.createElement('span');
    badge.className = 'badge-ext';
    badge.textContent = 'EXT';
    nameEl.after(badge);
  }

  // Method
  const methodEl = row.querySelector('.req-method') as HTMLElement;
  methodEl.textContent = data.method;
  if (data.method === 'GET') methodEl.classList.add('method-get');
  else if (data.method === 'POST') methodEl.classList.add('method-post');

  // Status
  const statusEl = row.querySelector('.req-status') as HTMLElement;
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
  }

  return row;
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
}

/**
 * Navigate request list by direction.
 * @param direction 1 for down, -1 for up
 * @param selectCallback Callback to select request
 */
export function navigateList(direction: 1 | -1, selectCallback: SelectCallback): void {
  const rows = Array.from(
    document.querySelectorAll('.req-row:not(.filtered-out):not(.provider-hidden)')
  );
  if (rows.length === 0) return;

  const currentIdx = rows.findIndex((r) => r.classList.contains('active'));
  let nextIdx: number;

  if (currentIdx === -1) {
    nextIdx = direction > 0 ? 0 : rows.length - 1;
  } else {
    nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= rows.length) nextIdx = rows.length - 1;
  }

  const nextRow = rows[nextIdx] as HTMLElement;
  const data = getRequestMap().get(nextRow.dataset.id!);
  if (data) selectCallback(data, nextRow);
}

/**
 * Navigate to first or last visible row.
 * @param edge 'first' or 'last'
 * @param selectCallback Callback to select request
 */
export function navigateToEdge(edge: 'first' | 'last', selectCallback: SelectCallback): void {
  const rows = Array.from(
    document.querySelectorAll('.req-row:not(.filtered-out):not(.provider-hidden)')
  );
  if (rows.length === 0) return;
  const row = edge === 'first' ? rows[0] : rows[rows.length - 1];
  const data = getRequestMap().get((row as HTMLElement).dataset.id!);
  if (data) selectCallback(data, row as HTMLElement);
}
