// ─── PUSH LIST COMPONENT ─────────────────────────────────────────────────────
// Renders the list of DataLayer pushes. Parallels request-list.ts.

import { isDlNavMarker } from '@/types/datalayer';
import type {
  DataLayerPush,
  DataLayerSource,
  DlNavMarker,
  DlTimelineEntry,
} from '@/types/datalayer';
import { DOM } from '../../utils/dom';
import { formatTimestamp, esc } from '../../utils/format';
import { getConfig } from '../../state';
import { downloadCsv, downloadJson } from '../../utils/export';
import { SOURCE_LABELS, SOURCE_TOOLTIPS, getSourceColor } from '@/shared/datalayer-constants';

// Re-export for consumers that import from push-list
export { getSourceColor } from '@/shared/datalayer-constants';
import {
  getAllDlPushes,
  getDlFilteredIds,
  getDlSelectedId,
  getDlPushById,
  getValidationErrors,
  getDlSortField,
  getDlSortOrder,
  getAllDlEntries,
  getDlNavMarkers,
} from '../state';
import { updateDlStatusBar } from '../../components/status-bar';

export type DlSelectCallback = (push: DataLayerPush, row: HTMLElement) => void;

// ─── SOURCE BADGE ────────────────────────────────────────────────────────────

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
 * Count total nested keys in an object (recursive).
 */
function countNestedKeys(obj: unknown, maxDepth = 5): number {
  if (maxDepth <= 0 || obj === null || obj === undefined) return 0;
  if (typeof obj !== 'object') return 0;

  let count = 0;
  const entries = Array.isArray(obj) ? obj : Object.values(obj as Record<string, unknown>);
  for (const value of entries) {
    if (value && typeof value === 'object') {
      const childKeys = Object.keys(value as object).length;
      count += childKeys + countNestedKeys(value, maxDepth - 1);
    }
  }
  return count;
}

/**
 * Create a push row element.
 */
export function createDlPushRow(
  push: DataLayerPush,
  isVisible: boolean,
  onSelect: DlSelectCallback,
  sessionStart?: string
): HTMLElement {
  const row = (rowTemplate.content.firstElementChild?.cloneNode(true) ??
    document.createElement('div')) as HTMLElement;
  row.dataset['id'] = String(push.id);

  // Link push to its navigation section
  if (push._dlNavMarkerId) {
    row.dataset.dlNavId = String(push._dlNavMarkerId);
  }

  if (!isVisible) {
    row.style.display = 'none';
  }

  const color = getSourceColor(push.source);
  const badge = getSourceBadge(push.source);
  const cfg = getConfig();
  const _sessionStart = sessionStart ?? getAllDlPushes()[0]?.timestamp;
  const time = formatTimestamp(push.timestamp, cfg.timestampFormat, _sessionStart);

  const indexEl = row.querySelector<HTMLElement>('.dl-push-index');
  if (indexEl) indexEl.textContent = `#${push.pushIndex}`;

  const badgeEl = row.querySelector<HTMLElement>('.dl-push-badge');
  if (badgeEl) {
    badgeEl.textContent = badge;
    badgeEl.style.background = color + '22';
    badgeEl.style.color = color;
    badgeEl.style.border = `1px solid ${color}55`;
    badgeEl.dataset.tooltip = SOURCE_TOOLTIPS[push.source] ?? '';
  }

  const eventEl = row.querySelector<HTMLElement>('.dl-push-event');
  if (eventEl) {
    eventEl.textContent = push._eventName ?? '';
    if (!push._eventName) eventEl.style.display = 'none';
  }

  const keycount = Object.keys(push.data).length;
  const nestedCount = countNestedKeys(push.data);
  const keycountEl = row.querySelector<HTMLElement>('.dl-push-keycount');
  if (keycountEl) {
    const nested = nestedCount > 0 ? ` (${nestedCount} nested)` : '';
    keycountEl.textContent = `${keycount} key${keycount !== 1 ? 's' : ''}${nested}`;
  }

  const timeEl = row.querySelector<HTMLElement>('.dl-push-time');
  if (timeEl) timeEl.textContent = time;

  const previewEl = row.querySelector<HTMLElement>('.dl-push-preview');
  if (previewEl) previewEl.textContent = buildPreview(push.data);

  // Ecommerce indicator
  if (push._ecommerceType) {
    const ecBadge = document.createElement('span');
    ecBadge.className = 'dl-ec-badge';
    ecBadge.textContent = push._ecommerceType.toUpperCase();
    row.querySelector('.dl-push-primary')?.appendChild(ecBadge);
  }

  // Replay badge — dim styling and indicator for replayed pushes
  if (push.isReplay) {
    row.classList.add('dl-push-replay');
    const replayBadge = document.createElement('span');
    replayBadge.className = 'dl-replay-badge';
    replayBadge.textContent = '↺';
    replayBadge.title = 'Replayed from existing dataLayer';
    row
      .querySelector('.dl-push-primary')
      ?.insertBefore(replayBadge, row.querySelector('.dl-push-index'));
  }

  // Validation error indicator
  const valErrors = getValidationErrors(push.id);
  if (valErrors.length > 0) {
    const dot = document.createElement('span');
    dot.className = 'dl-validation-dot has-errors';
    const lines = valErrors.map((e) => `• ${e.ruleName}: ${e.checkMessage}`);
    dot.title = `${valErrors.length} validation error(s):\n${lines.join('\n')}`;
    const badge = document.createElement('span');
    badge.className = 'dl-validation-badge';
    badge.textContent = String(valErrors.length);
    dot.appendChild(badge);
    row.querySelector('.dl-push-primary')?.insertBefore(dot, row.querySelector('.dl-push-index'));
  }

  // Correlation count badge
  const correlatedCount = push._correlatedCount;
  if (correlatedCount && correlatedCount > 0) {
    const corrBadge = document.createElement('span');
    corrBadge.className = 'dl-correlation-count';
    corrBadge.textContent = `${correlatedCount} →`;
    corrBadge.title = `${correlatedCount} correlated network request${correlatedCount !== 1 ? 's' : ''}`;
    corrBadge.style.cursor = 'pointer';
    row.querySelector('.dl-push-primary')?.appendChild(corrBadge);
  }

  // Diff count badge
  const diffCount = push._diffCount;
  if (diffCount !== undefined && diffCount > 0) {
    const diffBadge = document.createElement('span');
    diffBadge.className = 'dl-diff-count';
    diffBadge.textContent = `±${diffCount}`;
    diffBadge.title = `${diffCount} path${diffCount !== 1 ? 's' : ''} changed from previous state`;
    row.querySelector('.dl-push-primary')?.appendChild(diffBadge);
  }

  // Click to select
  row.addEventListener('click', () => {
    onSelect(push, row);
  });

  return row;
}

// ─── NAVIGATION MARKER RENDER ─────────────────────────────────────────────

/**
 * Render a navigation marker row in the push list.
 * Visual separator between pushes from different pages.
 * Returns the DOM element (does NOT append to list — caller handles placement).
 */
export function renderDlNavMarker(marker: DlNavMarker): HTMLElement {
  const divider = document.createElement('div');
  divider.className = 'dl-page-divider';
  divider.dataset.navId = String(marker.id);
  divider.dataset.navMarker = 'true';

  // Parse URL into hostname + path
  let hostname = '';
  let displayPath = '';
  try {
    const u = new URL(marker.url);
    hostname = u.hostname;
    displayPath = u.pathname + u.search;
  } catch {
    displayPath = marker.url;
  }

  // Parse timestamp
  const time = new Date(marker.timestamp);
  const timeStr = time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  divider.innerHTML = `
    <div class="dl-page-divider-left">
      <svg class="dl-page-divider-chevron" width="12" height="12" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
      <svg class="dl-page-divider-favicon" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
      <span class="dl-page-divider-hostname">${esc(hostname)}</span>
      <span class="dl-page-divider-time">${esc(timeStr)}</span>
      <span class="dl-page-divider-path">${esc(displayPath)}</span>
    </div>
    <div class="dl-page-divider-right">
      <span class="dl-page-divider-count">0</span>
    </div>
  `;

  divider.title = marker.url;
  return divider;
}

function buildPreview(data: Record<string, unknown>): string {
  const skip = new Set([
    'event',
    'gtm.uniqueEventId',
    'gtm.start',
    'gtm.scrollThreshold',
    'gtm.scrollUnits',
    'gtm.scrollDirection',
  ]);
  const parts: string[] = [];

  // E-commerce special: show first product info
  const ec = data['ecommerce'];
  if (ec && typeof ec === 'object' && ec !== null) {
    const ecObj = ec as Record<string, unknown>;
    // Try GA4 items first
    const items = Array.isArray(ecObj['items']) ? ecObj['items'] : [];
    // Try UA products
    const purchase = ecObj['purchase'] as Record<string, unknown> | undefined;
    const products = purchase && Array.isArray(purchase['products']) ? purchase['products'] : [];
    const allItems = items.length > 0 ? items : products;

    if (allItems.length > 0) {
      const firstItem = allItems[0] as Record<string, unknown>;
      const name =
        firstItem['item_name'] ?? firstItem['name'] ?? firstItem['item_id'] ?? firstItem['id'];
      if (name) {
        const suffix = allItems.length > 1 ? ` +${allItems.length - 1} more` : '';
        parts.push(`🛒 ${String(name)}${suffix}`);
      }
    }
    // Add value/currency if present
    if (ecObj['value']) {
      const currency = typeof ecObj['currency'] === 'string' ? ` ${ecObj['currency']}` : '';
      parts.push(`${ecObj['value']}${currency}`);
    }
  }

  // Regular preview (skip already shown keys)
  for (const [k, v] of Object.entries(data)) {
    if (skip.has(k)) continue;
    if (k === 'ecommerce' && parts.length > 0 && parts[0].startsWith('🛒')) continue;
    const isObj = typeof v === 'object' && v !== null;
    const valStr = isObj ? (Array.isArray(v) ? `[…]` : '{…}') : String(v).slice(0, 35);
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
  rows.forEach((row) => {
    const id = Number((row as HTMLElement).dataset['id']);
    const visible = filteredIds.has(id);
    (row as HTMLElement).style.display = visible ? '' : 'none';
  });
  updateDlStatusBar();
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
 * @param direction +1 for next, -1 for previous
 * @param onSelect Callback when a push is selected
 * @param skipNoise When true, skip pushes with gtm.* event names
 */
export function navigateDlList(
  direction: number,
  onSelect: DlSelectCallback,
  skipNoise = false
): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  const rows = Array.from(
    $list.querySelectorAll('.dl-push-row:not([style*="display: none"])')
  ) as HTMLElement[];
  if (rows.length === 0) return;

  const selectedId = getDlSelectedId();
  const currentIndex = rows.findIndex((r) => Number(r.dataset['id']) === selectedId);

  let nextIndex = currentIndex + direction;
  nextIndex = Math.max(0, Math.min(nextIndex, rows.length - 1));

  // Skip GTM system events when skipNoise is true
  if (skipNoise) {
    while (nextIndex >= 0 && nextIndex < rows.length) {
      const pushId = Number(rows[nextIndex].dataset['id']);
      const push = getDlPushById(pushId);
      if (push && !push._eventName?.startsWith('gtm.')) break;
      nextIndex += direction;
    }
    // Clamp after skipping
    if (nextIndex < 0 || nextIndex >= rows.length) return;
  }

  const nextRow = rows[nextIndex];
  if (!nextRow) return;

  const pushId = Number(nextRow.dataset['id']);
  const push = getDlPushById(pushId);
  if (push) {
    onSelect(push, nextRow);
    nextRow.scrollIntoView({ block: 'nearest' });
  }
}

/**
 * Navigate to first or last push in the list (used for Home/End keys).
 */
export function navigateDlToEdge(edge: 'first' | 'last', onSelect: DlSelectCallback): void {
  const $list = DOM.dlPushList;
  if (!$list) return;

  const rows = Array.from(
    $list.querySelectorAll('.dl-push-row:not([style*="display: none"])')
  ) as HTMLElement[];
  if (rows.length === 0) return;

  const targetRow = edge === 'first' ? rows[0] : rows[rows.length - 1];
  if (!targetRow) return;

  const pushId = Number(targetRow.dataset['id']);
  const push = getDlPushById(pushId);
  if (push) {
    onSelect(push, targetRow);
    targetRow.scrollIntoView({ block: 'nearest' });
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
    const meta = [
      String(p.id),
      String(p.timestamp),
      p.source,
      String(p.pushIndex),
      p._eventName ?? '',
    ];
    const data = dataKeys.map((k) => {
      const v = p.data[k];
      return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    });
    return [...meta, ...data];
  });

  downloadCsv(headers, rows, `datalayer-${Date.now()}.csv`);
}

// ─── FILTER ──────────────────────────────────────────────────────────────────

interface DlTextFilterParsed {
  positiveTerms: { text: string; scope: 'all' | 'event' | 'key' | 'value' }[];
  negativeTerms: string[];
}

function parseDlTextFilter(text: string): DlTextFilterParsed {
  const filter: DlTextFilterParsed = {
    positiveTerms: [],
    negativeTerms: [],
  };

  const parts = text.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('-')) {
      filter.negativeTerms.push(part.slice(1).toLowerCase());
    } else if (part.startsWith('event:')) {
      filter.positiveTerms.push({ text: part.slice(6).toLowerCase(), scope: 'event' });
    } else if (part.startsWith('key:')) {
      filter.positiveTerms.push({ text: part.slice(4).toLowerCase(), scope: 'key' });
    } else if (part.startsWith('val:')) {
      filter.positiveTerms.push({ text: part.slice(4).toLowerCase(), scope: 'value' });
    } else {
      filter.positiveTerms.push({ text: part.toLowerCase(), scope: 'all' });
    }
  }

  return filter;
}

function getDlSearchIndex(push: DataLayerPush): string {
  if (!push._searchIndex) {
    const parts: string[] = [push.source, push._eventName ?? '', push.pushIndex.toString()];
    for (const [k, v] of Object.entries(push.data)) {
      parts.push(k, String(v));
    }
    (push as { _searchIndex?: string })._searchIndex = parts.join(' ').toLowerCase();
  }
  return push._searchIndex ?? '';
}

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
  hideGtmSystem: boolean
): boolean {
  if (hideGtmSystem && push._eventName?.startsWith('gtm.')) return false;
  if (source && push.source !== source) return false;
  if (eventName && push._eventName !== eventName) return false;
  if (ecommerceOnly && !push._ecommerceType) return false;
  if (hasKey && !(hasKey in push.data)) return false;

  if (text) {
    const parsed = parseDlTextFilter(text);

    // Negative terms
    for (const neg of parsed.negativeTerms) {
      const idx = getDlSearchIndex(push);
      if (idx.includes(neg)) return false;
    }

    // Positive terms
    for (const term of parsed.positiveTerms) {
      let matches = false;

      switch (term.scope) {
        case 'event':
          matches = (push._eventName ?? '').toLowerCase().includes(term.text);
          break;
        case 'key':
          matches = Object.keys(push.data).some((k) => k.toLowerCase().includes(term.text));
          break;
        case 'value':
          matches = Object.values(push.data).some((v) =>
            String(v).toLowerCase().includes(term.text)
          );
          break;
        case 'all':
        default:
          matches = getDlSearchIndex(push).includes(term.text);
          break;
      }

      if (!matches) return false;
    }
  }

  return true;
}

// ─── SORT CACHE ───────────────────────────────────────────────────────────────

let _sortCache: { key: string; result: number[] } | null = null;

/**
 * Invalidate the sort cache (call after prune or clear).
 */
export function invalidateDlSortCache(): void {
  _sortCache = null;
}

/**
 * Get sorted push IDs for rendering.
 * Default is array order (time asc). Sort modifies display order.
 * Results are cached based on sort field and order.
 */
export function getSortedDlPushIds(): number[] {
  const field = getDlSortField();
  const order = getDlSortOrder();
  const cacheKey = `${field}-${order}`;

  if (_sortCache && _sortCache.key === cacheKey) {
    return _sortCache.result;
  }

  const all = getAllDlEntries();
  let sorted: number[];

  if (field === 'time') {
    if (order === 'asc') {
      sorted = all.map((p) => p.id);
    } else {
      // Descending: split into sections by nav markers, reverse each section's pushes
      // (keeping the marker at the top), then reverse sections order (newest page first)
      const sections: DlTimelineEntry[][] = [];
      let currentSection: DlTimelineEntry[] = [];

      for (const entry of all) {
        if (isDlNavMarker(entry)) {
          // Flush current section (may be empty on first marker at index 0)
          if (currentSection.length > 0) {
            sections.push(currentSection);
          }
          // Start a new section with the nav marker
          currentSection = [entry];
        } else {
          currentSection.push(entry);
        }
      }
      // Flush last section
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }

      // Process each section: marker sections keep marker first then reverse pushes;
      // initial section (no marker) just reverses pushes.
      const processed = sections.map((section) => {
        if (section.length > 0 && isDlNavMarker(section[0])) {
          const [marker, ...pushes] = section;
          return [marker, ...pushes.reverse()];
        }
        // Initial section (no leading marker) — reverse pushes
        return [...section].reverse();
      });

      // Reverse sections order so newest page appears first
      sorted = processed
        .reverse()
        .flat()
        .map((e) => e.id);
    }
  } else if (field === 'keycount') {
    sorted = [...all]
      .sort((a, b) => {
        const diff = Object.keys(b.data).length - Object.keys(a.data).length;
        return order === 'desc' ? diff : -diff;
      })
      .map((p) => p.id);
  } else if (field === 'source') {
    sorted = [...all]
      .sort((a, b) => {
        const diff = a.source.localeCompare(b.source);
        return order === 'asc' ? diff : -diff;
      })
      .map((p) => p.id);
  } else {
    sorted = all.map((p) => p.id);
  }

  _sortCache = { key: cacheKey, result: sorted };
  return sorted;
}

/**
 * Render push list grouped by source.
 */
export function renderGroupedPushList(
  $list: HTMLElement,
  filteredIds: Set<number>,
  onSelect: DlSelectCallback
): void {
  // Render markers before groups (DD-5: v1 simplification)
  const markers = getDlNavMarkers();
  for (const marker of markers) {
    $list.appendChild(renderDlNavMarker(marker));
  }

  // Existing grouping logic — only pushes
  const all = getAllDlPushes();
  const groups = new Map<DataLayerSource, DataLayerPush[]>();

  for (const p of all) {
    if (!groups.has(p.source)) groups.set(p.source, []);
    groups.get(p.source)!.push(p);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [source, pushes] of sortedGroups) {
    const color = getSourceColor(source);
    const label = getSourceBadge(source);

    const header = document.createElement('div');
    header.className = 'dl-group-header';
    header.style.borderLeftColor = color;
    header.innerHTML = `
      <span style="color:${color};font-weight:600;font-size:11px;">${esc(label)}</span>
      <span style="font-size:10px;color:var(--text-2);font-family:var(--font-mono);">${pushes.length} pushes</span>
      <span class="dl-group-chevron">▼</span>
    `;
    const groupBody = document.createElement('div');
    groupBody.className = 'dl-group-body';
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      groupBody.classList.toggle('collapsed');
    });
    $list.appendChild(header);

    for (const push of pushes) {
      const isVisible = filteredIds.has(push.id);
      const sessionStart = all[0]?.timestamp;
      const row = createDlPushRow(push, isVisible, onSelect, sessionStart);
      groupBody.appendChild(row);
    }

    $list.appendChild(groupBody);
  }
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
      const lines = errors.map((e) => `• ${e.ruleName}: ${e.checkMessage}`);
      dot.title = `${errors.length} validation error(s):\n${lines.join('\n')}`;
      const badge = document.createElement('span');
      badge.className = 'dl-validation-badge';
      badge.textContent = String(errors.length);
      dot.appendChild(badge);
      row.querySelector('.dl-push-primary')?.insertBefore(dot, row.querySelector('.dl-push-index'));
    }
  });
}
