// ─── CORRELATION ENGINE ───────────────────────────────────────────────────────
// Finds network requests correlated with DataLayer pushes by time window.

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

export interface CorrelatedRequest {
  request: ParsedRequest;
  delayMs: number; // Time between push timestamp and request timestamp (ms)
}

/**
 * Find network requests within a time window of a DataLayer push.
 * @param push The DataLayer push to correlate with
 * @param requests All captured network requests
 * @param windowMs How far forward to look (default 2000ms)
 * @returns Requests sorted by delay (closest first)
 */
export function findCorrelatedRequests(
  push: DataLayerPush,
  requests: ParsedRequest[],
  windowMs = 2000,
): CorrelatedRequest[] {
  const pushTime = new Date(push.timestamp).getTime();
  if (isNaN(pushTime)) return [];

  return requests
    .filter((r) => {
      const reqTime = new Date(r.timestamp).getTime();
      if (isNaN(reqTime)) return false;
      const diff = reqTime - pushTime;
      // Allow -500ms for requests already in flight, up to +windowMs
      return diff >= -500 && diff <= windowMs;
    })
    .map((r) => ({
      request: r,
      delayMs: new Date(r.timestamp).getTime() - pushTime,
    }))
    .sort((a, b) => a.delayMs - b.delayMs);
}

/**
 * Render the correlation list into a container.
 * @param container Target DOM element
 * @param correlated Correlated requests to display
 * @param onGotoRequest Callback when user clicks "Go to Network" button
 */
export function renderCorrelation(
  container: HTMLElement,
  correlated: CorrelatedRequest[],
  onGotoRequest: (requestId: number) => void,
): void {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'dl-correlation-header';
  header.textContent = `Network requests within 2s of this push (${correlated.length} found)`;
  container.appendChild(header);

  if (correlated.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dl-correlation-empty';
    empty.textContent = 'No correlated network requests found';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'dl-correlation-list';

  for (const { request, delayMs } of correlated) {
    const item = document.createElement('div');
    item.className = 'dl-correlation-item';
    item.dataset['requestId'] = String(request.id);

    const delay = document.createElement('span');
    delay.className = 'dl-correlation-delay';
    delay.textContent = delayMs >= 0 ? `+${delayMs}ms` : `${delayMs}ms`;

    const badge = document.createElement('span');
    badge.className = 'dl-correlation-badge';
    badge.textContent = request.provider;
    badge.style.background = request.color + '22';
    badge.style.color = request.color;

    const event = document.createElement('span');
    event.className = 'dl-correlation-event';
    event.textContent = request._eventName ?? '';

    const url = document.createElement('span');
    url.className = 'dl-correlation-url';
    const urlObj = tryParseUrl(request.url);
    url.textContent = urlObj ? urlObj.hostname + urlObj.pathname.slice(0, 30) : request.url.slice(0, 50);
    url.title = request.url;

    const gotoBtn = document.createElement('button');
    gotoBtn.className = 'dl-correlation-goto';
    gotoBtn.title = 'View in Network tab';
    gotoBtn.textContent = '→';
    gotoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onGotoRequest(request.id);
    });

    item.appendChild(delay);
    item.appendChild(badge);
    if (request._eventName) item.appendChild(event);
    item.appendChild(url);
    item.appendChild(gotoBtn);
    list.appendChild(item);
  }

  container.appendChild(list);
}

function tryParseUrl(url: string): URL | null {
  try { return new URL(url); } catch { return null; }
}
