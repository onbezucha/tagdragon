// ─── QUERY TAB RENDERER ──────────────────────────────────────────────────────

import { COPY_SVG } from '@/shared/constants';
import { esc } from '../utils/format';

/**
 * Render query parameters as a table.
 */
export function renderParamTable(obj: Record<string, unknown> | null | undefined): string {
  if (!obj || !Object.keys(obj).length) {
    return '<div class="empty-tab">No parameters.</div>';
  }

  const rows = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const valueStr = String(v);
      return `
        <tr>
          <td class="pk">${esc(k)}</td>
          <td class="pv">${esc(valueStr)}</td>
          <td class="pc"><button class="param-copy-btn" data-copy="${esc(valueStr)}" aria-label="Copy value">${COPY_SVG}</button></td>
        </tr>
      `;
    })
    .join('');

  return rows
    ? `<table class="param-table">${rows}</table>`
    : '<div class="empty-tab">No parameters.</div>';
}
