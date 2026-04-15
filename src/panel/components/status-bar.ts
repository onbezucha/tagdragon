// ─── STATUS BAR COMPONENT ────────────────────────────────────────────────────

import { DOM, $ } from '../utils/dom';
import { formatBytes } from '../utils/format';
import { getAllRequests, getConfig, getStats, updateConfig } from '../state';
import { getAllDlPushes, getDlVisibleCount, getDlTotalCount } from '../datalayer/state';

let pruneNotificationTimer: ReturnType<typeof setTimeout> | null = null;

// ─── MEMORY INDICATOR ────────────────────────────────────────────────────────

/**
 * Update the memory indicator — colors the status bar text and fills the memory bar.
 */
function updateMemoryIndicator($bar: HTMLElement | null): void {
  if (!$bar) return;
  const config = getConfig();
  const allRequests = getAllRequests();

  if (config.maxRequests > 0) {
    const usage = allRequests.length / config.maxRequests;
    if (usage > 0.95) {
      $bar.style.color = 'var(--red)';
    } else if (usage > 0.8) {
      $bar.style.color = 'var(--orange)';
    } else {
      $bar.style.color = '';
    }
  } else {
    $bar.style.color = '';
  }

  // Update memory bar fill
  const $memFill = $('memory-bar-fill');
  if ($memFill && config.maxRequests > 0) {
    const pct = Math.min(100, (allRequests.length / config.maxRequests) * 100);
    $memFill.style.width = `${pct}%`;
    $memFill.classList.toggle('critical', pct > 95);
    $memFill.classList.toggle('warning', pct > 80 && pct <= 95);
  }

  // Update top memory bar (at top of list area)
  const $memFillTop = $('memory-bar-top-fill');
  if ($memFillTop && config.maxRequests > 0) {
    const pct = Math.min(100, (allRequests.length / config.maxRequests) * 100);
    $memFillTop.style.width = `${pct}%`;
    $memFillTop.classList.toggle('critical', pct > 95);
    $memFillTop.classList.toggle('warning', pct > 60 && pct <= 95);
  }
}

// ─── NETWORK STATUS BAR ──────────────────────────────────────────────────────

/**
 * Update the network status bar display.
 * Writes to #status-stats, #size-badge .value, #time-badge .value separately.
 */
export function updateStatusBar(
  visibleCount: number,
  totalSize: number,
  totalDuration: number
): void {
  const $stats = DOM.statusStats;
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;
  const $bar = $('status-bar');

  if ($stats) {
    const allRequests = getAllRequests();
    const total = allRequests.length;
    if (visibleCount !== total) {
      $stats.textContent = `${visibleCount} of ${total} requests · filtered`;
    } else {
      $stats.textContent = `${total} requests`;
    }
  }

  if ($size) {
    const $sizeVal = $size.querySelector('.value');
    if ($sizeVal) $sizeVal.textContent = formatBytes(totalSize);
  }

  if ($time) {
    const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
    const $timeVal = $time.querySelector('.value');
    if ($timeVal) $timeVal.textContent = avgTime > 0 ? `${avgTime}ms` : '—';
  }

  // Memory warning — color the status-bar text
  updateMemoryIndicator($bar);
}

// ─── DATALAYER STATUS BAR ────────────────────────────────────────────────────

/**
 * Update the status bar for DataLayer view.
 * Hides size/time badges (not applicable) and shows push count + e-commerce count.
 */
export function updateDlStatusBar(): void {
  const $stats = DOM.statusStats;
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;
  const $bar = $('status-bar');

  if ($stats) {
    const visible = getDlVisibleCount();
    const total = getDlTotalCount();
    const pushes = getAllDlPushes();
    const parts: string[] = [];
    if (visible !== total) {
      parts.push(`${visible} of ${total} pushes · filtered`);
    } else {
      parts.push(`${total} pushes`);
    }
    const ecCount = pushes.filter((p) => p._ecommerceType).length;
    if (ecCount > 0) parts.push(`${ecCount} e-commerce`);
    $stats.textContent = parts.join(' · ');
  }

  // Hide size/time for DataLayer view (not applicable)
  if ($size) $size.style.display = 'none';
  if ($time) $time.style.display = 'none';

  // Reset separators visibility
  document.querySelectorAll<HTMLElement>('#status-bar .status-separator').forEach((el) => {
    el.style.display = 'none';
  });

  // Keep the separator before timestamp toggle visible
  const tsSeparator = document.getElementById('timestamp-separator');
  if (tsSeparator) tsSeparator.style.display = '';

  // Clear memory warning for DataLayer view
  if ($bar) $bar.style.color = '';
}

/**
 * Restore size/time badge visibility when switching back to Network view.
 */
export function updateNetworkStatusBar(): void {
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;

  if ($size) $size.style.display = '';
  if ($time) $time.style.display = '';

  // Restore separators
  document.querySelectorAll<HTMLElement>('#status-bar .status-separator').forEach((el) => {
    el.style.display = '';
  });
}

// ─── PRUNE NOTIFICATION ──────────────────────────────────────────────────────

/**
 * Show prune notification in status bar.
 * Temporarily shows "(N oldest removed)" with orange flash for 3 seconds.
 */
export function showPruneNotification(count: number): void {
  const $stats = DOM.statusStats;
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;
  const $bar = $('status-bar');

  if ($stats) {
    const stats = getStats();
    const visibleCount = stats.visibleCount;
    const allRequests = getAllRequests();
    const total = allRequests.length;
    if (visibleCount !== total) {
      $stats.textContent = `${visibleCount} of ${total} requests · filtered · (${count} oldest removed)`;
    } else {
      $stats.textContent = `${total} requests · (${count} oldest removed)`;
    }
  }

  if ($size) {
    const $sizeVal = $size.querySelector('.value');
    if ($sizeVal) $sizeVal.textContent = formatBytes(getStats().totalSize);
  }

  if ($time) {
    const stats = getStats();
    const visibleCount = stats.visibleCount;
    const totalDuration = stats.totalDuration;
    const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
    const $timeVal = $time.querySelector('.value');
    if ($timeVal) $timeVal.textContent = avgTime > 0 ? `${avgTime}ms` : '—';
  }

  // Orange flash
  if ($bar) $bar.style.color = 'var(--orange)';

  if (pruneNotificationTimer) clearTimeout(pruneNotificationTimer);
  pruneNotificationTimer = setTimeout(() => {
    pruneNotificationTimer = null;
    if ($bar) $bar.style.color = '';
    const stats = getStats();
    updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);
  }, 3000);
}

/**
 * Clear prune notification timer.
 */
export function clearPruneTimer(): void {
  if (pruneNotificationTimer) {
    clearTimeout(pruneNotificationTimer);
    pruneNotificationTimer = null;
  }
}

// ─── RESET ───────────────────────────────────────────────────────────────────

/**
 * Reset the status bar to initial state.
 * Called when clearing all requests.
 */
export function resetStatusBar(): void {
  const $stats = DOM.statusStats;
  const $size = DOM.sizeBadge;
  const $time = DOM.timeBadge;
  const $bar = $('status-bar');

  if ($stats) $stats.textContent = '0 requests';
  if ($size) {
    const $sizeVal = $size.querySelector('.value');
    if ($sizeVal) $sizeVal.textContent = '0B';
    $size.style.display = '';
  }
  if ($time) {
    const $timeVal = $time.querySelector('.value');
    if ($timeVal) $timeVal.textContent = '—';
    $time.style.display = '';
  }
  document.querySelectorAll<HTMLElement>('#status-bar .status-separator').forEach((el) => {
    el.style.display = '';
  });
  if ($bar) $bar.style.color = '';

  // Reset memory bar
  const $memFill = $('memory-bar-fill');
  if ($memFill) {
    $memFill.style.width = '0%';
    $memFill.classList.remove('warning', 'critical');
  }

  // Reset top memory bar
  const $memFillTop = $('memory-bar-top-fill');
  if ($memFillTop) {
    $memFillTop.style.width = '0%';
    $memFillTop.classList.remove('warning', 'critical');
  }

  clearPruneTimer();
}

// ─── TIMESTAMP FORMAT TOGGLE ──────────────────────────────────────────

const TIMESTAMP_FORMATS = ['absolute', 'relative', 'elapsed'] as const;
const TIMESTAMP_LABELS: Record<string, string> = {
  absolute: 'Abs',
  relative: 'Rel',
  elapsed: 'Elap',
};

/**
 * Initialize the timestamp format toggle button in the status bar.
 * Cycles through absolute → relative → elapsed on click.
 */
export function initTimestampToggle(): void {
  const btn = document.getElementById('btn-timestamp-format');
  const label = document.getElementById('timestamp-format-label');
  if (!btn || !label) return;

  // Set initial label
  label.textContent = TIMESTAMP_LABELS[getConfig().timestampFormat] || 'Abs';

  btn.addEventListener('click', () => {
    const current = getConfig().timestampFormat;
    const idx = TIMESTAMP_FORMATS.indexOf(current);
    const next = TIMESTAMP_FORMATS[(idx + 1) % TIMESTAMP_FORMATS.length];
    updateConfig('timestampFormat', next);
    label.textContent = TIMESTAMP_LABELS[next];
  });
}
