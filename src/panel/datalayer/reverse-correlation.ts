// ─── REVERSE CORRELATION ENGINE ────────────────────────────────────────────
// Finds the DataLayer push that likely triggered a network request.

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

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
  lookbackMs = 2000,
): TriggeringPushResult | null {
  const reqTime = request._ts ?? new Date(request.timestamp).getTime();
  if (isNaN(reqTime) || pushes.length === 0) return null;

  // Binary search for the first push within the lookback window
  const minTime = reqTime - lookbackMs;

  let lo = 0;
  let hi = pushes.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midTime = pushes[mid]._ts ?? 0;
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
    if (delay < -200 || delay > lookbackMs) continue;

    if (!best || Math.abs(delay) < Math.abs(best.delayMs)) {
      const confidence = delay < 200 ? 'high' : delay < 1000 ? 'medium' : 'low';
      best = { push, delayMs: delay, confidence };
    }
  }

  return best;
}

/**
 * Render a compact "Triggered by DataLayer" reference in network detail.
 */
export function renderTriggeredBy(
  container: HTMLElement,
  result: TriggeringPushResult,
  onGotoPush: (pushId: number) => void,
): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'dl-triggered-by';

  const label = document.createElement('span');
  label.className = 'dl-triggered-by-label';
  label.textContent = 'Triggered by DataLayer';
  wrapper.appendChild(label);

  const row = document.createElement('div');
  row.className = 'dl-triggered-by-row';

  const delay = document.createElement('span');
  delay.className = 'dl-correlation-delay';
  delay.textContent = `${result.delayMs >= 0 ? '+' : ''}${result.delayMs}ms`;
  if (result.confidence === 'high') delay.style.color = 'var(--green)';
  else if (result.confidence === 'medium') delay.style.color = 'var(--yellow)';
  else delay.style.color = 'var(--orange)';
  row.appendChild(delay);

  const badge = document.createElement('span');
  badge.className = 'dl-correlation-badge';
  badge.textContent = result.push.sourceLabel;
  const colors: Record<string, string> = {
    gtm: '#E8710A', tealium: '#2C7A7B', adobe: '#E53E3E',
    segment: '#3182CE', digitalData: '#38A169', custom: '#718096',
  };
  const color = colors[result.push.source] ?? '#718096';
  badge.style.background = color + '22';
  badge.style.color = color;
  row.appendChild(badge);

  if (result.push._eventName) {
    const event = document.createElement('span');
    event.className = 'dl-correlation-event';
    event.textContent = result.push._eventName;
    row.appendChild(event);
  }

  const index = document.createElement('span');
  index.style.cssText = 'font-size:10px;color:var(--text-2);margin-left:4px;';
  index.textContent = `#${result.push.pushIndex}`;
  row.appendChild(index);

  const gotoBtn = document.createElement('button');
  gotoBtn.className = 'dl-correlation-goto';
  gotoBtn.title = 'View in DataLayer tab';
  gotoBtn.textContent = '→';
  gotoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onGotoPush(result.push.id);
  });
  row.appendChild(gotoBtn);

  wrapper.appendChild(row);
  container.appendChild(wrapper);
}
