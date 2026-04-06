// ─── PUSH LIST COMPONENT ─────────────────────────────────────────────────────
// Renders the list of DataLayer pushes. Parallels request-list.ts.

import type { DataLayerPush, DataLayerSource } from '@/types/datalayer';
import { DOM } from '../utils/dom';
import { formatTimestamp } from '../utils/format';
import { getConfig } from '../state';
import { downloadCsv, downloadJson } from '../utils/export';
import { SOURCE_LABELS } from '@/shared/datalayer-constants';
import {
  getAllDlPushes,
  getDlFilteredIds,
  getDlSelectedId,
  setDlSelectedId,
  getValidationErrors,
} from './state';

export type DlSelectCallback = (push: DataLayerPush, row: HTMLElement) => void;

// ─── SOURCE COLORS ───────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<DataLayerSource, string> = {
  gtm: '#E8710A',
  tealium: '#2C7A7B',
  adobe: '#E53E3E',
  segment: '#3182CE',
  digitalData: '#38A169',
  custom: '#718096',
};

export function getSourceColor(source: DataLayerSource): string {
  return SOURCE_COLORS[source] ?? '#718096';
}

export function getSourceBadge(source: DataLayerSource): string {
  return SOURCE_LABELS[source] ?? source.toUpperCase();
}

// ─── ROW TEMPLATE ────────────────────────────────────────────────────────────

const rowTemplate = document.createElement('template');
rowTemplate.innerHTML = `
  <div class="dl-push-row">
    <div class="dl-push-primary">
      <span class="dl-push-index"></span>
      <span class="dl-push-badge"></span>
      <span class="dl-push-event"></span>
      <span class="dl-push-keycount"></span>
      <span class="dl-push-time"></span>
    </div>
    <div class="dl-push-preview"></div>
  </div>
`;

// ─── ROW CREATION ────────────────────────────────────────────────────────────

/**
 * Create a push row element.
 */
export function createDlPushRow(
  push: DataLayerPush,
  isVisible: boolean,
  onSelect: DlSelectCallback,
): HTMLElement {
  const row = (rowTemplate.content.firstElementChild?.cloneNode(true) ?? document.createElement('div')) as HTMLElement;
  row.dataset['id'] = String(push.id);

  if (!isVisible) {
    row.style.display = 'none';
  }

  const color = getSourceColor(push.source);
  const badge = getSourceBadge(push.source);
  const cfg = getConfig();
  const sessionStart = getAllDlPushes()[0]?.timestamp;
  const time = formatTimestamp(push.timestamp, cfg.timestampFormat, sessionStart);

  const indexEl = row.querySelector('.dl-push-index') as HTMLElement;
  indexEl.textContent = `#${push.pushIndex}`;

  const badgeEl = row.querySelector('.dl-push-badge') as HTMLElement;
  badgeEl.textContent = badge;
  badgeEl.style.background = color + '22';
  badgeEl.style.color = color;
  badgeEl.style.border = `1px solid ${color}55`;

  const eventEl = row.querySelector('.dl-push-event') as HTMLElement;
  eventEl.textContent = push._eventName ?? '';
  if (!push._eventName) eventEl.style.display = 'none';

  const keycount = Object.keys(push.data).length;
  const keycountEl = row.querySelector('.dl-push-keycount') as HTMLElement;
  keycountEl.textContent = `${keycount} key${keycount !== 1 ? 's' : ''}`;

  const timeEl = row.querySelector('.dl-push-time') as HTMLElement;
  timeEl.textContent = time;

  const previewEl = row.querySelector('.dl-push-preview') as HTMLElement;
  previewEl.textContent = buildPreview(push.data);

  // Ecommerce indicator
  if (push._ecommerceType) {
    const ecBadge = document.createElement('span');
    ecBadge.className = 'dl-ec-badge';
    ecBadge.textContent = push._ecommerceType.toUpperCase();
    row.querySelector('.dl-push-primary')?.appendChild(ecBadge);
  }

  // Validation error indicator
  const valErrors = getValidationErrors(push.id);
  if (valErrors.length > 0) {
    const dot = document.createElement('span');
    dot.className = 'dl-validation-dot has-errors';
    dot.title = valErrors.map(e => e.ruleName).join('\n');
    const badge = document.createElement('span');
    badge.className = 'dl-validation-badge';
    badge.textContent = String(valErrors.length);
    dot.appendChild(badge);
    row.querySelector('.dl-push-primary')?.insertBefore(dot, row.querySelector('.dl-push-index'));
  }

  // Click to select
  row.addEventListener('click', () => {
    onSelect(push, row);
  });

  return row;
}

function buildPreview(data: Record<string, unknown>): string {
  const skip = new Set(['event', 'gtm.uniqueEventId', 'gtm.start', 'gtm.scrollThreshold', 'gtm.scrollUnits', 'gtm.scrollDirection']);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (skip.has(k)) continue;
    const valStr = typeof v === 'object' && v !== null
      ? (Array.isArray(v) ? `[…]` : '{…}')
      : String(v).slice(0, 35);
    parts.push(`${k}: ${valStr}`);
    if (parts.length >= 3) break;
  }
  return parts.join('  ·  ');
}

// ─── ROW VISIBILITY ──────────────────────────────────────────────────────────

/**
 * Update visibility of all push rows based on filtered IDs.
 */
export function updateDlRowVisibility(): void {
  const $list = DOM.dlPushList;
  if (!$list) return;
  const filteredIds = getDlFilteredIds();
  const rows = $list.querySelectorAll('.dl-push-row');
  let visibleCount = 0;
  rows.forEach((row) => {
    const id = Number((row as HTMLElement).dataset['id']);
    const visible = filteredIds.has(id);
    (row as HTMLElement).style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });
  updateDlStatusText(visibleCount, getAllDlPushes().length);
}

// ─── STATUS TEXT ─────────────────────────────────────────────────────────────

export function updateDlStatusText(visible: number, total: number): void {
  const $stats = DOM.statusStats;
  if ($stats) {
    $stats.textContent = `${visible} / ${total} pushes`;
  }

  // Hide size/time badges when in DataLayer context
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;
  if ($size) $size.style.display = 'none';
  if ($time) $time.style.display = 'none';
  document.querySelectorAll('#status-bar .status-separator').forEach(el => {
    el.style.display = 'none';
  });
}

// ─── SELECTION ───────────────────────────────────────────────────────────────

/**
 * Mark a row as active and deselect the previous.
 */
export function setActiveDlRow(row: HTMLElement): void {
  const $list = DOM.dlPushList;
  if ($list) {
    $list.querySelectorAll('.dl-push-row.active').forEach((r) => r.classList.remove('active'));
  }
  row.classList.add('active');
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

/**
 * Navigate to the next/previous push in the list.
 */
export function navigateDlList(
  direction: 1 | -1,
  onSelect: DlSelectCallback,
): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  const rows = Array.from($list.querySelectorAll('.dl-push-row:not([style*="display: none"])')) as HTMLElement[];
  if (rows.length === 0) return;

  const selectedId = getDlSelectedId();
  const currentIndex = rows.findIndex((r) => Number(r.dataset['id']) === selectedId);

  let nextIndex = currentIndex + direction;
  nextIndex = Math.max(0, Math.min(nextIndex, rows.length - 1));

  const nextRow = rows[nextIndex];
  if (!nextRow) return;

  const pushId = Number(nextRow.dataset['id']);
  const pushes = getAllDlPushes();
  const push = pushes.find((p) => p.id === pushId);
  if (push) {
    onSelect(push, nextRow);
    nextRow.scrollIntoView({ block: 'nearest' });
  }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Export DataLayer pushes as JSON.
 */
export function exportDlJson(pushes: DataLayerPush[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    pageUrl: 'inspected-page',
    sources: [...new Set(pushes.map((p) => p.source))],
    pushes: pushes.map((p) => ({
      id: p.id,
      source: p.source,
      sourceLabel: p.sourceLabel,
      pushIndex: p.pushIndex,
      timestamp: p.timestamp,
      data: p.data,
    })),
  };
  downloadJson(payload, `datalayer-${Date.now()}.json`);
}

/**
 * Export DataLayer pushes as CSV.
 */
export function exportDlCsv(pushes: DataLayerPush[]): void {
  if (pushes.length === 0) return;

  const allKeys = new Set<string>();
  pushes.forEach((p) => Object.keys(p.data).forEach((k) => allKeys.add(k)));
  const dataKeys = [...allKeys].sort();

  const metaCols = ['id', 'timestamp', 'source', 'pushIndex', 'event'];
  const headers = [...metaCols, ...dataKeys];

  const rows = pushes.map((p) => {
    const meta = [String(p.id), String(p.timestamp), p.source, String(p.pushIndex), p._eventName ?? ''];
    const data = dataKeys.map((k) => {
      const v = p.data[k];
      return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    });
    return [...meta, ...data];
  });

  downloadCsv(headers, rows, `datalayer-${Date.now()}.csv`);
}

// ─── FILTER ──────────────────────────────────────────────────────────────────

/**
 * Check if a push matches the current filter state.
 */
export function dlMatchesFilter(
  push: DataLayerPush,
  text: string,
  source: string,
  eventName: string,
  hasKey: string,
  ecommerceOnly: boolean,
): boolean {
  if (source && push.source !== source) return false;
  if (eventName && push._eventName !== eventName) return false;
  if (ecommerceOnly && !push._ecommerceType) return false;
  if (hasKey && !(hasKey in push.data)) return false;

  if (text) {
    const lower = text.toLowerCase();
    // Build search index lazily
    if (!push._searchIndex) {
      const parts: string[] = [push.source, push._eventName ?? '', push.pushIndex.toString()];
      for (const [k, v] of Object.entries(push.data)) {
        parts.push(k, String(v));
      }
      (push as { _searchIndex?: string })._searchIndex = parts.join(' ').toLowerCase();
    }
    if (!push._searchIndex?.includes(lower)) return false;
  }

  return true;
}

/**
 * Update validation indicators on existing push rows.
 */
export function updateDlRowValidation(): void {
  const $list = DOM.dlPushList;
  if (!$list) return;
  const rows = $list.querySelectorAll('.dl-push-row');
  rows.forEach((row) => {
    const id = Number((row as HTMLElement).dataset['id']);
    const errors = getValidationErrors(id);
    const existing = row.querySelector('.dl-validation-dot');
    if (errors.length > 0 && !existing) {
      const dot = document.createElement('span');
      dot.className = 'dl-validation-dot has-errors';
      dot.title = errors.map(e => e.ruleName).join('\n');
      const badge = document.createElement('span');
      badge.className = 'dl-validation-badge';
      badge.textContent = String(errors.length);
      dot.appendChild(badge);
      row.querySelector('.dl-push-primary')?.insertBefore(dot, row.querySelector('.dl-push-index'));
    }
  });
}


