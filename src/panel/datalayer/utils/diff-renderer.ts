// ─── DIFF RENDERER ───────────────────────────────────────────────────────────
// Deep diff algorithm and visual rendering for DataLayer push comparisons.

import type { DiffEntry } from '@/types/datalayer';

// ─── DEEP DIFF ALGORITHM ─────────────────────────────────────────────────────

/**
 * Compute a deep diff between two state snapshots.
 * Returns a list of DiffEntry objects with dot-notation paths.
 */
export function deepDiff(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  maxEntries = 100
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  collectDiff(prev, curr, '', entries, maxEntries);
  return entries;
}

function collectDiff(
  prev: unknown,
  curr: unknown,
  path: string,
  entries: DiffEntry[],
  maxEntries: number
): void {
  if (entries.length >= maxEntries) return;

  if (prev === curr) return;

  // Both are plain objects — recurse
  if (isPlainObject(prev) && isPlainObject(curr)) {
    const prevObj = prev as Record<string, unknown>;
    const currObj = curr as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(currObj)]);
    for (const key of allKeys) {
      if (entries.length >= maxEntries) break;
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in prevObj)) {
        entries.push({ key, path: childPath, type: 'added', newValue: currObj[key] });
      } else if (!(key in currObj)) {
        entries.push({ key, path: childPath, type: 'removed', oldValue: prevObj[key] });
      } else {
        collectDiff(prevObj[key], currObj[key], childPath, entries, maxEntries);
      }
    }
    return;
  }

  // Both are arrays — diff by index
  if (Array.isArray(prev) && Array.isArray(curr)) {
    const len = Math.max(prev.length, curr.length);
    for (let i = 0; i < len; i++) {
      if (entries.length >= maxEntries) break;
      const childPath = path ? `${path}[${i}]` : `[${i}]`;
      const key = String(i);
      if (i >= prev.length) {
        entries.push({ key, path: childPath, type: 'added', newValue: curr[i] });
      } else if (i >= curr.length) {
        entries.push({ key, path: childPath, type: 'removed', oldValue: prev[i] });
      } else {
        collectDiff(prev[i], curr[i], childPath, entries, maxEntries);
      }
    }
    return;
  }

  // Leaf value changed — normalize bracket notation (e.g. "items[0]" → "items.0") before extracting key
  const lastSegment = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .pop();
  const key = lastSegment ?? path;
  entries.push({ key, path, type: 'changed', oldValue: prev, newValue: curr });
}

function isPlainObject(val: unknown): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

// ─── VISUAL RENDERING ────────────────────────────────────────────────────────

/**
 * Render diff entries into an HTML element.
 */
export function renderDiff(container: HTMLElement, entries: DiffEntry[], totalCount: number): void {
  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = '<div class="dl-diff-empty">No changes from previous push</div>';
    return;
  }

  // Diff legend
  const legend = document.createElement('div');
  legend.className = 'dl-diff-legend';
  legend.innerHTML = `
    <span class="dl-diff-legend-item dl-diff-legend-added">
      <span class="dl-diff-legend-swatch"></span> Added
    </span>
    <span class="dl-diff-legend-item dl-diff-legend-removed">
      <span class="dl-diff-legend-swatch"></span> Removed
    </span>
    <span class="dl-diff-legend-item dl-diff-legend-changed">
      <span class="dl-diff-legend-swatch"></span> Changed
    </span>
    <span class="dl-diff-legend-note">Diff from cumulative state before this push</span>
  `;
  container.appendChild(legend);

  const MAX_DISPLAY = 50;
  const displayEntries = entries.slice(0, MAX_DISPLAY);

  for (const entry of displayEntries) {
    const el = document.createElement('div');
    el.className = `dl-diff-entry dl-diff-${entry.type}`;

    const keyEl = document.createElement('span');
    keyEl.className = 'dl-diff-key';
    keyEl.textContent = entry.path;
    el.appendChild(keyEl);

    if (entry.type === 'added') {
      const valEl = document.createElement('span');
      valEl.className = 'dl-diff-value';
      valEl.textContent = formatDiffValue(entry.newValue);
      el.appendChild(valEl);
      const badge = document.createElement('span');
      badge.className = 'dl-diff-badge';
      badge.textContent = '+ NEW';
      el.appendChild(badge);
    } else if (entry.type === 'removed') {
      const valEl = document.createElement('span');
      valEl.className = 'dl-diff-value';
      valEl.textContent = formatDiffValue(entry.oldValue);
      el.appendChild(valEl);
      const badge = document.createElement('span');
      badge.className = 'dl-diff-badge';
      badge.textContent = '− DEL';
      el.appendChild(badge);
    } else {
      const oldEl = document.createElement('span');
      oldEl.className = 'dl-diff-old';
      oldEl.textContent = formatDiffValue(entry.oldValue);
      el.appendChild(oldEl);
      const arrow = document.createElement('span');
      arrow.className = 'dl-diff-arrow';
      arrow.textContent = '→';
      el.appendChild(arrow);
      const newEl = document.createElement('span');
      newEl.className = 'dl-diff-new';
      newEl.textContent = formatDiffValue(entry.newValue);
      el.appendChild(newEl);
    }

    container.appendChild(el);
  }

  if (totalCount > MAX_DISPLAY) {
    const more = document.createElement('div');
    more.className = 'dl-diff-more';
    more.textContent = `… and ${totalCount - MAX_DISPLAY} more changes`;
    container.appendChild(more);
  }
}

function formatDiffValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'object') {
    try {
      const s = JSON.stringify(val);
      return s.length > 80 ? s.slice(0, 77) + '...' : s;
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}
