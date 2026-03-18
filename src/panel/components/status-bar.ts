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

let pruneNotificationTimer: NodeJS.Timeout | null = null;

/**
 * Update the status bar display.
 * @param visibleCount Number of visible requests
 * @param totalSize Total size in bytes
 * @param totalDuration Total duration in milliseconds
 */
export function updateStatusBar(visibleCount: number, totalSize: number, totalDuration: number): void {
  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  const allRequests = getAllRequests();
  const config = getConfig();
  
  DOM.statusStats!.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'}`;
  
  // Memory warning indicator
  if (config.maxRequests > 0) {
    const usage = allRequests.length / config.maxRequests;
    if (usage > 0.95) {
      DOM.statusStats!.style.color = 'var(--red)';
    } else if (usage > 0.8) {
      DOM.statusStats!.style.color = 'var(--orange)';
    } else {
      DOM.statusStats!.style.color = '';
    }
  }
}

/**
 * Show prune notification in status bar.
 * @param count Number of pruned requests
 */
export function showPruneNotification(count: number): void {
  const visibleCount = getStatsVisibleCount();
  const totalSize = getStatsTotalSize();
  const totalDuration = getStatsTotalDuration();
  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  const allRequests = getAllRequests();
  
  DOM.statusStats!.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'} · (${count} oldest removed)`;
  DOM.statusStats!.style.color = 'var(--orange)';
  
  clearTimeout(pruneNotificationTimer as NodeJS.Timeout);
  pruneNotificationTimer = setTimeout(() => {
    DOM.statusStats!.style.color = '';
    updateStatusBar(visibleCount, totalSize, totalDuration);
  }, 3000);
}

/**
 * Clear prune notification timer.
 */
export function clearPruneTimer(): void {
  clearTimeout(pruneNotificationTimer as NodeJS.Timeout);
}
