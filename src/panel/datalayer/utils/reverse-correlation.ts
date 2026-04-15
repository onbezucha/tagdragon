// ─── REVERSE CORRELATION ENGINE ────────────────────────────────────────────
// Finds the DataLayer push that likely triggered a network request.

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';
import { getSourceColor } from '@/shared/datalayer-constants';

export interface TriggeringPushResult {
  push: DataLayerPush;
  delayMs: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Find the DataLayer push that most likely triggered a network request.
 * Looks backward from the request time (pushes that happened before the request).
 * @param request The network request to find the trigger for
 * @param pushes All captured DataLayer pushes
 * @param lookbackMs How far back to look (default 2000ms)
 * @returns The closest push or null if none found
 */
export function findTriggeringPush(
  request: ParsedRequest,
  pushes: DataLayerPush[],
  lookbackMs = 2000
): TriggeringPushResult | null {
  const reqTime = request._ts ?? new Date(request.timestamp).getTime();
  if (isNaN(reqTime) || pushes.length === 0) return null;

  // Binary search for the first push within the lookback window
  const minTime = reqTime - lookbackMs;

  let lo = 0;
  let hi = pushes.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midTime = pushes[mid]._ts;
    if (midTime == null || isNaN(midTime)) {
      lo = mid + 1;
      continue;
    }
    if (midTime < minTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Scan from the found position to the end (at most lookbackMs worth of pushes)
  let best: TriggeringPushResult | null = null;

  for (let i = lo; i < pushes.length; i++) {
    const push = pushes[i];
    const pushTime = push._ts ?? new Date(push.timestamp).getTime();
    if (isNaN(pushTime)) continue;

    const delay = reqTime - pushTime;
    if (delay < -200) continue;
    if (delay > lookbackMs) break;

    if (!best || Math.abs(delay) < Math.abs(best.delayMs)) {
      const confidence = delay < 200 ? 'high' : delay < 1000 ? 'medium' : 'low';
      best = { push, delayMs: delay, confidence };
    }
  }

  return best;
}

/**
 * Render a compact "Triggered by DataLayer" banner in network detail.
 * Populates pre-existing child elements in the container.
 */
export function renderTriggeredBy(
  container: HTMLElement,
  result: TriggeringPushResult,
  onGotoPush: (pushId: number) => void
): void {
  const color = getSourceColor(result.push.source);

  // Confidence colors
  const confidenceColors: Record<string, string> = {
    high: 'var(--green)',
    medium: 'var(--yellow)',
    low: 'var(--orange)',
  };
  const confColor = confidenceColors[result.confidence] ?? 'var(--text-2)';

  // Confidence labels for tooltip
  const confidenceLabels: Record<string, string> = {
    high: 'high',
    medium: 'medium',
    low: 'low',
  };

  // Show banner
  container.classList.add('visible');
  container.style.borderLeftColor = color;

  // Tint icon
  const icon = container.querySelector('.trigger-icon') as HTMLElement;
  if (icon) icon.style.color = color;

  // Confidence dot
  const dot = container.querySelector('.trigger-confidence-dot') as HTMLElement;
  if (dot) {
    dot.style.background = confColor;
    const delayAbs = Math.abs(result.delayMs);
    dot.title = `Confidence: ${confidenceLabels[result.confidence]} — push occurred ${delayAbs}ms before this request`;
  }

  // Source badge
  const badge = container.querySelector('.trigger-source-badge') as HTMLElement;
  if (badge) {
    badge.textContent = result.push.sourceLabel;
    badge.style.background = color + '22';
    badge.style.color = color;
  }

  // Event name
  const eventName = container.querySelector('.trigger-event-name') as HTMLElement;
  if (eventName) {
    eventName.textContent = result.push._eventName ?? '';
    eventName.title = result.push._eventName ?? '';
  }

  // Delay
  const delay = container.querySelector('.trigger-delay') as HTMLElement;
  if (delay) {
    delay.textContent = `${result.delayMs >= 0 ? '+' : ''}${result.delayMs}ms`;
    delay.style.color = confColor;
  }

  // Entire banner is clickable; assign via onclick so re-renders replace rather than stack handlers.
  container.onclick = (e: MouseEvent) => {
    // Prevent double-fire when the goto button inside the banner is clicked
    const btn = (e.target as HTMLElement).closest('.trigger-goto-btn');
    if (btn) e.stopPropagation();
    onGotoPush(result.push.id);
  };
}

/**
 * Hide the triggered-by banner (no correlation found).
 */
export function hideTriggeredByBanner(container: HTMLElement): void {
  container.classList.remove('visible');
  container.style.borderLeftColor = '';
  container.onclick = null;
}
