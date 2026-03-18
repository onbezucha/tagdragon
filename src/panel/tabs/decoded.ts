// ─── DECODED TAB RENDERER ────────────────────────────────────────────────────

import { COPY_SVG } from '@/shared/constants';
import { esc } from '../utils/format';
import { validateValue, parseAdobeEvents, parseAdobeProducts } from '../utils/categorize';
import type { CategoryMeta, CategorizedParams } from '../utils/categorize';

/**
 * Render categorized parameters for the decoded tab.
 */
export function renderCategorizedParams(
  categorized: CategorizedParams | null,
  data: { color?: string }
): string {
  if (!categorized || Object.keys(categorized).length === 0) {
    return '<div class="empty-tab">No parameters.</div>';
  }

  // Sort by order
  const sortedEntries = Object.entries(categorized).sort(
    ([, a], [, b]) => ((a._meta?.order) ?? 999) - ((b._meta?.order) ?? 999)
  );

  let html = '';

  for (const [catKey, params] of sortedEntries) {
    const category = params._meta;
    if (!category) continue;

    const paramsWithoutMeta = { ...params };
    delete paramsWithoutMeta._meta;

    const paramCount = Object.keys(paramsWithoutMeta).length;
    if (paramCount === 0) continue;

    const collapsedClass = category.defaultExpanded === false ? 'collapsed' : '';
    const providerColor = data.color || '#6b7090';

    html += `
      <div class="category-section"
           data-category="${catKey}"
           style="--provider-color: ${providerColor};">
        <div class="category-header ${collapsedClass}">
          <div class="category-left">
            <span class="category-icon">${category.icon}</span>
            <span class="category-label">${category.label}</span>
            <span class="category-count">(${paramCount})</span>
          </div>
          <span class="category-toggle">▼</span>
        </div>
        <div class="category-content ${collapsedClass}">
          <div class="category-params">
            ${renderCategoryParams(params)}
          </div>
        </div>
      </div>
    `;
  }

  return html || '<div class="empty-tab">No parameters.</div>';
}

/**
 * Render parameters within a category.
 */
function renderCategoryParams(
  params: Record<string, string | undefined> & { _meta?: CategoryMeta }
): string {
  const categoryMeta = params._meta;
  const paramsWithoutMeta = { ...params };
  delete paramsWithoutMeta._meta;

  // Special renderer: Adobe Events
  if (categoryMeta?.specialRenderer === 'adobeEvents') {
    return Object.entries(paramsWithoutMeta)
      .map(([key, value]) => {
        const parsed = parseAdobeEvents(value as string);
        if (!parsed) {
          return renderNormalParam(key, value, categoryMeta);
        }

        const bulletList = parsed
          .map((evt) => {
            let label = `<strong>${esc(evt.id)}</strong>`;
            if (evt.value) {
              label += ` <span style="color: var(--accent);">${esc(evt.value)}</span>`;
            }
            label += ` <span style="color: var(--text-2); font-size: 10px;">(${esc(evt.type)})</span>`;
            return `<div class="event-bullet">• ${label}</div>`;
          })
          .join('');

        return `
          <div class="param-row adobe-events">
            <div class="param-key">${esc(key)}</div>
            <div class="param-value adobe-events-list">
              ${bulletList}
            </div>
            <button class="param-copy-btn" data-copy="${esc(value as string)}" aria-label="Copy value">${COPY_SVG}</button>
          </div>
        `;
      })
      .join('');
  }

  // Special renderer: Adobe Products
  if (categoryMeta?.specialRenderer === 'adobeProducts') {
    return Object.entries(paramsWithoutMeta)
      .map(([key, value]) => {
        const parsed = parseAdobeProducts(value as string);
        if (!parsed || parsed.length === 0) {
          return renderNormalParam(key, value, categoryMeta);
        }

        const tableRows = parsed
          .map(
            (prod, idx) => `
          <tr>
            <td class="prod-idx">${idx + 1}</td>
            <td class="prod-sku">${esc(prod.sku || '—')}</td>
            <td class="prod-qty">${esc(prod.quantity || '—')}</td>
            <td class="prod-price">${esc(prod.price || '—')}</td>
            <td class="prod-events">${esc(prod.events || '—')}</td>
          </tr>
        `
          )
          .join('');

        return `
          <div class="param-row adobe-products">
            <div class="param-key">${esc(key)}</div>
            <div class="param-value adobe-products-table">
              <table class="products-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Events/eVars</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
            <button class="param-copy-btn" data-copy="${esc(value as string)}" aria-label="Copy value">${COPY_SVG}</button>
          </div>
        `;
      })
      .join('');
  }

  // Normal params
  return Object.entries(paramsWithoutMeta)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => renderNormalParam(key, value, categoryMeta))
    .join('');
}

/**
 * Render a normal parameter row.
 */
function renderNormalParam(
  key: string,
  value: unknown,
  categoryMeta?: CategoryMeta
): string {
  const validation = validateValue(key, value, categoryMeta);
  const valueStr = String(value ?? '');

  let valueDisplay: string;
  if (validation.warning) {
    valueDisplay = `<span class="warning-icon">${validation.icon}</span>${esc(validation.warning)}`;
  } else {
    valueDisplay = esc(valueStr);
  }

  return `
    <div class="param-row">
      <div class="param-key">${esc(key)}</div>
      <div class="param-value decoded ${validation.warning ? 'missing' : ''}">
        ${valueDisplay}
      </div>
      <button class="param-copy-btn" data-copy="${esc(valueStr)}" aria-label="Copy value">${COPY_SVG}</button>
    </div>
  `;
}
