// ─── STATUS BAR COMPONENT ────────────────────────────────────────────────────

import { DOM } from '../utils/dom';
import { formatBytes } from '../utils/format';
import {
  getAllRequests,
  getConfig,
  getStatsVisibleCount,
  getStatsTotalSize,
  getStatsTotalDuration,
} from '../state';
import { getAllDlPushes, getDlVisibleCount, getDlTotalCount } from '../datalayer/state';

let pruneNotificationTimer: NodeJS.Timeout | null = null;

/**
 * Update the network status bar display.
 * @param visibleCount Number of visible requests
 * @param totalSize Total size in bytes
 * @param totalDuration Total duration in milliseconds
 */
export function updateStatusBar(visibleCount: number, totalSize: number, totalDuration: number): void {
  const $statusText = DOM.statusText;
  if (!$statusText) return;

  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  const allRequests = getAllRequests();
  const config = getConfig();

  $statusText.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'}`;

  // Memory warning indicator
  if (config.maxRequests > 0) {
    const usage = allRequests.length / config.maxRequests;
    if (usage > 0.95) {
      $statusText.style.color = 'var(--red)';
    } else if (usage > 0.8) {
      $statusText.style.color = 'var(--orange)';
    } else {
      $statusText.style.color = '';
    }
  }
}

/**
 * Update the DataLayer status bar display.
 */
export function updateDlStatusBar(): void {
  const $statusText = DOM.statusText;
  if (!$statusText) return;

  const visible = getDlVisibleCount();
  const total = getDlTotalCount();
  const pushes = getAllDlPushes();

  const parts: string[] = [`${visible} / ${total} pushes`];

  // E-commerce count
  const ecCount = pushes.filter(p => p._ecommerceType).length;
  if (ecCount > 0) {
    parts.push(`${ecCount} e-commerce`);
  }

  $statusText.textContent = parts.join(' · ');
  $statusText.style.color = '';
}

/**
 * Show prune notification in status bar.
 * @param count Number of pruned requests
 */
export function showPruneNotification(count: number): void {
  const $statusText = DOM.statusText;
  if (!$statusText) return;

  const visibleCount = getStatsVisibleCount();
  const totalSize = getStatsTotalSize();
  const totalDuration = getStatsTotalDuration();
  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  const allRequests = getAllRequests();

  $statusText.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'} · (${count} oldest removed)`;
  $statusText.style.color = 'var(--orange)';

  clearTimeout(pruneNotificationTimer as NodeJS.Timeout);
  pruneNotificationTimer = setTimeout(() => {
    $statusText.style.color = '';
    updateStatusBar(visibleCount, totalSize, totalDuration);
  }, 3000);
}

/**
 * Clear prune notification timer.
 */
export function clearPruneTimer(): void {
  clearTimeout(pruneNotificationTimer as NodeJS.Timeout);
}
