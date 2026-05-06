// ─── PER-PROVIDER BREAKDOWN ────────────────────────────────────────────────
// Compact horizontal bar in status bar showing per-provider request counts
// with expandable popover for detailed metrics

import { computeProviderStats, formatBytes, formatMs } from '../utils/provider-stats';
import type { ProviderStat } from '../utils/provider-stats';
import { getAllRequests } from '../state';

let popoverVisible = false;

/**
 * Render the compact provider breakdown bar.
 * Called after each status bar update.
 */
export function renderProviderBreakdown(): void {
  const container = document.getElementById('provider-breakdown');
  if (!container) return;

  const allRequests = getAllRequests();
  if (allRequests.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  const stats = computeProviderStats(allRequests);

  // Compact mode: horizontal bar with provider dots and counts
  let html = '';
  for (const stat of stats.slice(0, 6)) {
    // Show top 6 providers
    const errorBadge =
      stat.errorCount > 0 ? `<span class="pb-error">${stat.errorCount}</span>` : '';
    html += `<span class="pb-item" data-provider="${stat.name}">
      <span class="pb-dot" style="background:${stat.color}"></span>
      <span class="pb-name">${stat.name}</span>
      <span class="pb-count">${stat.count}</span>
      ${errorBadge}
    </span>`;
  }

  if (stats.length > 6) {
    html += `<span class="pb-more">+${stats.length - 6}</span>`;
  }

  html += `<span class="pb-total">${allRequests.length} total</span>`;
  container.innerHTML = html;

  // Click to open expanded popover
  container.onclick = (e) => {
    const item = (e.target as HTMLElement).closest('.pb-item');
    if (item) {
      // Could filter request list to this provider — future enhancement
      void item;
    }
    togglePopover(stats);
  };
}

/**
 * Toggle the expanded provider metrics popover.
 */
function togglePopover(stats?: ProviderStat[]): void {
  let popover = document.getElementById('provider-breakdown-popover');

  if (popoverVisible && popover) {
    popover.remove();
    popoverVisible = false;
    return;
  }

  if (!stats) {
    stats = computeProviderStats(getAllRequests());
  }

  popover = document.createElement('div');
  popover.id = 'provider-breakdown-popover';
  popover.className = 'pb-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Provider breakdown');

  let tableHtml = `
    <div class="pb-popover-header">
      <span>Provider Breakdown</span>
      <button class="pb-popover-close" aria-label="Close">✕</button>
    </div>
    <table class="pb-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Requests</th>
          <th>Errors</th>
          <th>Avg Time</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const stat of stats) {
    tableHtml += `
      <tr>
        <td>
          <span class="pb-dot" style="background:${stat.color}"></span>
          ${stat.name}
        </td>
        <td>${stat.count}</td>
        <td>${stat.errorCount > 0 ? `<span class="pb-table-error">${stat.errorCount}</span>` : '0'}</td>
        <td>${formatMs(stat.avgTime)}</td>
        <td>${formatBytes(stat.totalSize)}</td>
      </tr>
    `;
  }

  tableHtml += `</tbody></table>`;
  popover.innerHTML = tableHtml;

  // Close button
  popover.querySelector('.pb-popover-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    popover!.remove();
    popoverVisible = false;
  });

  // Position near the breakdown bar
  const container = document.getElementById('provider-breakdown');
  if (container) {
    container.appendChild(popover);
  }

  popoverVisible = true;
}
