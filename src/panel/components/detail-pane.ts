// ─── DETAIL PANE COMPONENT ───────────────────────────────────────────────────

import type { ParsedRequest, TabName } from '@/types/request';
import { DOM, qsa } from '../utils/dom';
import { copyToClipboard, showCopyFeedback } from '../utils/clipboard';
import { setupTruncationTooltips } from '../utils/truncation';
import { categorizeParams } from '../utils/categorize';
import { renderCategorizedParams } from '../detail-tabs/decoded';
import { renderParamTable } from '../detail-tabs/query';
import { renderPostTab } from '../detail-tabs/post';
import { renderHeadersTab, loadHeavyData } from '../detail-tabs/headers';
import { renderResponse } from '../detail-tabs/response';
import { formatTimestamp, getEventName } from '../utils/format';
import {
  setSelectedId,
  getSelectedId,
  getActiveTab,
  setActiveTab,
  getRequestMap,
  getConfig,
  getAllRequests,
} from '../state';
import {
  findTriggeringPush,
  renderTriggeredBy,
  hideTriggeredByBanner,
  type TriggeringPushResult,
} from '../datalayer/utils/reverse-correlation';
import { getAllDlPushes } from '../datalayer/state';
import { buildGroupIcon } from '../utils/icon-builder';
import { SLOW_REQUEST_THRESHOLD_MS } from '@/shared/constants';

// Currently displayed request — used by copy action buttons
let _currentRequest: ParsedRequest | null = null;

// Scroll behavior flag for selectRequest
let _smoothScroll = true;

/** Set scroll behavior for the next selectRequest call. */
export function setSmoothScroll(smooth: boolean): void {
  _smoothScroll = smooth;
}

// ─── TAB CONTENT CACHE ───────────────────────────────────────────────────────
// LRU-like cache: requestId → tabName → rendered HTML (max 10 entries)
const tabCache = new Map<string, Map<string, string>>();
const TAB_CACHE_MAX = 10;

function getCached(id: string, tab: string): string | undefined {
  return tabCache.get(id)?.get(tab);
}

function setCache(id: string, tab: string, html: string): void {
  if (!tabCache.has(id)) {
    if (tabCache.size >= TAB_CACHE_MAX) {
      const firstKey = tabCache.keys().next().value!;
      tabCache.get(firstKey)?.clear();
      tabCache.delete(firstKey);
    }
    tabCache.set(id, new Map());
  }
  tabCache.get(id)!.set(tab, html);
}

export function clearTabCache(): void {
  tabCache.clear();
}

/**
 * Re-render the currently selected request's detail pane.
 * Used when a display setting changes (e.g. showEmptyParams toggle).
 *
 * Invalidates _categorized on ALL requests so that switching to another
 * request after a toggle change always produces a fresh categorization.
 */
export function refreshCurrentDetail(): void {
  // Invalidate _categorized on ALL requests — the filter setting is global
  for (const req of getRequestMap().values()) {
    req._categorized = undefined;
  }

  // Clear entire tab cache — stale HTML for any request would be wrong
  tabCache.clear();

  const selectedId = getSelectedId();
  if (!selectedId) return;

  const req = getRequestMap().get(selectedId);
  if (!req) return;

  // Re-categorize current request immediately
  const cfg = getConfig();
  req._categorized = categorizeParams(req.decoded, req.provider, cfg.showEmptyParams);

  // Re-render the current tab
  const availableTabs = getAvailableTabs(req);
  const currentTab = getActiveTab();
  if (availableTabs.includes(currentTab)) {
    renderTab(currentTab, req);
    autoExpandSections();
  } else {
    // Current tab may have disappeared (e.g. decoded tab removed when all params filtered out)
    // Fallback to first available tab or defaultTab
    const cfg2 = getConfig();
    const fallback = availableTabs.includes(cfg2.defaultTab) ? cfg2.defaultTab : availableTabs[0];
    if (fallback) {
      setActiveTab(fallback);
      updateTabStates(availableTabs);
      renderTab(fallback, req);
      autoExpandSections();
    }
  }
}

/**
 * Select and display a request in the detail pane.
 * @param data Request data
 * @param row The clicked row element
 */
export function selectRequest(data: ParsedRequest, row: HTMLElement): void {
  _currentRequest = data;
  qsa('.req-row.active').forEach((r) => r.classList.remove('active'));
  row.classList.add('active');

  // Update page divider section highlighting
  const $list = DOM.list;
  if ($list) {
    // Clear all section states (always, regardless of config)
    $list
      .querySelectorAll('.page-divider.section-active')
      .forEach((d) => d.classList.remove('section-active'));
    $list
      .querySelectorAll('.page-divider.section-dimmed')
      .forEach((d) => d.classList.remove('section-dimmed'));
    $list
      .querySelectorAll('.req-row.section-active')
      .forEach((r) => r.classList.remove('section-active'));
    $list
      .querySelectorAll('.req-row.section-dimmed')
      .forEach((r) => r.classList.remove('section-dimmed'));

    const navId = row.dataset?.pageNavId;
    if (navId) {
      const sectionCfg = getConfig();

      // Set dimming intensity via CSS custom property
      $list.style.setProperty('--section-dim-opacity', String(sectionCfg.sectionDimOpacity));

      // Accent bar — only if enabled
      if (sectionCfg.sectionAccentBar) {
        const divider = $list.querySelector(`.page-divider[data-nav-id="${navId}"]`);
        if (divider) divider.classList.add('section-active');

        $list.querySelectorAll(`.req-row[data-page-nav-id="${navId}"]`).forEach((r) => {
          r.classList.add('section-active');
        });
      }

      // Dimming — only if enabled
      if (sectionCfg.sectionDimOthers) {
        $list.querySelectorAll(`.page-divider:not([data-nav-id="${navId}"])`).forEach((d) => {
          d.classList.add('section-dimmed');
        });

        $list.querySelectorAll(`.req-row:not([data-page-nav-id="${navId}"])`).forEach((r) => {
          r.classList.add('section-dimmed');
        });
      }
    }
  }

  setSelectedId(String(data.id));

  // Lazy categorization – compute only when user actually views the request
  if (!data._categorized) {
    const cfg = getConfig();
    data._categorized = categorizeParams(data.decoded, data.provider, cfg.showEmptyParams);
  }

  const $detail = DOM.detail;
  if (!$detail) return;
  const cfg = getConfig();
  const sessionStart = getAllRequests()[0]?.timestamp;

  $detail.classList.remove('hidden');

  // ─── SUMMARY CARD RENDERING ────────────────────────────────────────────

  // Provider icon
  const iconEl = DOM.summaryProviderIcon;
  if (iconEl) {
    iconEl.innerHTML = '';
    const iconSvg = buildGroupIcon(data.provider);
    if (iconSvg) {
      iconEl.innerHTML = iconSvg;
      iconEl.style.display = '';
    } else {
      iconEl.style.display = 'none';
    }
  }

  // Provider name
  if (DOM.summaryProviderName) {
    DOM.summaryProviderName.textContent = data.provider;
    DOM.summaryProviderName.style.color = data.color;
  }

  // Event name
  if (DOM.summaryEventName) {
    const eventName = data._eventName || getEventName(data);
    DOM.summaryEventName.textContent = eventName;
  }

  // Method badge
  const methodEl = DOM.summaryMethod;
  if (methodEl) {
    methodEl.textContent = data.method;
    methodEl.className = 'summary-method';
    if (data.method === 'GET') methodEl.classList.add('method-get');
    else if (data.method === 'POST') methodEl.classList.add('method-post');
  }

  // Status badge
  const statusEl = DOM.summaryStatus;
  if (statusEl) {
    statusEl.textContent = String(data.status || '—');
    statusEl.className = 'summary-status';
    if (data.status) {
      statusEl.classList.add(`status-${String(data.status)[0]}`);
    }
  }

  // Duration
  const durEl = DOM.summaryDuration;
  if (durEl) {
    durEl.textContent = data.duration ? data.duration + 'ms' : '—';
    durEl.className = 'summary-duration';
    if (data.duration && data.duration > SLOW_REQUEST_THRESHOLD_MS) durEl.classList.add('slow');
  }

  // Time
  if (DOM.summaryTime) {
    DOM.summaryTime.textContent = formatTimestamp(
      data.timestamp,
      cfg.timestampFormat,
      sessionStart,
      true
    );
  }

  // URL
  if (DOM.summaryUrl) {
    DOM.summaryUrl.textContent = data.url;
    DOM.summaryUrl.title = data.url;
  }

  // ─── END SUMMARY CARD RENDERING ────────────────────────────────────────

  // Tab memory: keep current tab if it has data, otherwise fallback to defaultTab
  const availableTabs = getAvailableTabs(data);
  const currentTab = getActiveTab();
  if (!availableTabs.includes(currentTab)) {
    const defaultTab = cfg.defaultTab;
    setActiveTab(availableTabs.includes(defaultTab) ? defaultTab : 'decoded');
  }

  updateTabStates(availableTabs);
  renderTab(getActiveTab(), data);
  autoExpandSections();

  // Triggered by DataLayer banner
  const $triggerBanner = DOM.triggeredByBanner;
  if ($triggerBanner) {
    // Compute and cache triggering push per request
    if (!data._triggeringPush) {
      const dlPushes = getAllDlPushes();
      if (dlPushes.length > 0) {
        data._triggeringPush = findTriggeringPush(data, dlPushes) ?? null;
      }
    }
    if (data._triggeringPush) {
      renderTriggeredBy(
        $triggerBanner,
        data._triggeringPush as TriggeringPushResult,
        (pushId: number) => {
          document.dispatchEvent(new CustomEvent('goto-datalayer-push', { detail: pushId }));
        }
      );
    } else {
      hideTriggeredByBanner($triggerBanner);
    }
  }

  row.scrollIntoView({ block: 'nearest', behavior: _smoothScroll ? 'smooth' : 'auto' });
}

/**
 * Get available tabs for a request.
 * @param data Request data
 * @returns Array of available tab names
 */
function getAvailableTabs(data: ParsedRequest): TabName[] {
  const tabs: TabName[] = [];
  if (Object.keys(data._categorized || {}).length > 0) tabs.push('decoded');
  if (Object.keys(data.allParams || {}).length > 0) tabs.push('query');
  if (data.postBody) tabs.push('post');
  // Use flags for lazy-loaded data
  if (
    data._hasRequestHeaders ||
    data._hasResponseHeaders ||
    Object.keys(data.requestHeaders || {}).length > 0 ||
    Object.keys(data.responseHeaders || {}).length > 0
  )
    tabs.push('headers');
  if (data._hasResponseBody || data.responseBody) tabs.push('response');
  return tabs;
}

/**
 * Update tab button states.
 * @param availableTabs Available tab names
 */
function updateTabStates(availableTabs: TabName[]): void {
  const currentTab = getActiveTab();
  qsa('.dtab').forEach((tab) => {
    const tabName = (tab as HTMLElement).dataset.tab as TabName;
    const isAvailable = availableTabs.includes(tabName);
    tab.classList.toggle('disabled', !isAvailable);
    tab.classList.toggle('active', tabName === currentTab);
  });
}

/**
 * Render a specific tab.
 * @param tab Tab name
 * @param data Request data
 */
function renderTab(tab: TabName, data: ParsedRequest): void {
  const $detailContent = DOM.detailContent;
  if (!$detailContent) return;
  const id = String(data.id);

  switch (tab) {
    case 'decoded': {
      const cached = getCached(id, 'decoded');
      if (cached !== undefined) {
        $detailContent.innerHTML = cached;
        break;
      }
      const html = renderCategorizedParams(data._categorized ?? {}, data);
      $detailContent.innerHTML = html;
      setCache(id, 'decoded', html);
      break;
    }
    case 'query': {
      const cached = getCached(id, 'query');
      if (cached !== undefined) {
        $detailContent.innerHTML = cached;
        break;
      }
      const html = renderParamTable(data.allParams);
      $detailContent.innerHTML = html;
      setCache(id, 'query', html);
      break;
    }
    case 'post': {
      const cached = getCached(id, 'post');
      if (cached !== undefined) {
        $detailContent.innerHTML = cached;
        break;
      }
      renderPostTab(data, $detailContent);
      setCache(id, 'post', $detailContent.innerHTML);
      break;
    }
    case 'headers': {
      const cached = getCached(id, 'headers');
      if (cached !== undefined) {
        $detailContent.innerHTML = cached;
        break;
      }
      // Lazy load headers if not yet loaded
      if (
        !data.requestHeaders &&
        !data.responseHeaders &&
        (data._hasRequestHeaders || data._hasResponseHeaders)
      ) {
        loadHeavyData(data);
      }
      const html = renderHeadersTab(data);
      $detailContent.innerHTML = html;
      setCache(id, 'headers', html);
      break;
    }
    case 'response':
      // Response tab: lazy-loaded, not cached
      if (!data.responseBody && data._hasResponseBody) {
        loadHeavyData(data);
      }
      $detailContent.innerHTML = renderResponse(data.responseBody);
      break;
  }

  // Set up truncation tooltips after content is in the DOM
  setupTruncationTooltips($detailContent);
}

/**
 * Initialize tab click handlers.
 */
export function initTabHandlers(): void {
  const $detailTabs = DOM.detailTabs;
  if (!$detailTabs) return;

  $detailTabs.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.dtab') as HTMLElement;
    if (!btn || btn.classList.contains('disabled')) return;

    qsa('.dtab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    const tabName = btn.dataset.tab as TabName;
    setActiveTab(tabName);

    const selectedId = getSelectedId();
    const req = selectedId ? getRequestMap().get(selectedId) : null;
    if (req) renderTab(tabName, req);
  });
}

/**
 * Expand all collapsed category sections if autoExpand is enabled.
 */
function autoExpandSections(): void {
  if (!getConfig().autoExpand) return;
  const $detailContent = DOM.detailContent;
  if (!$detailContent) return;
  $detailContent.querySelectorAll('.category-header.collapsed').forEach((header) => {
    header.classList.remove('collapsed');
    const content = header.nextElementSibling;
    if (content?.classList.contains('category-content')) {
      content.classList.remove('collapsed');
    }
  });
}

/**
 * Close the detail pane.
 */
export function closeDetailPane(): void {
  DOM.detail?.classList.add('hidden');
  qsa('.req-row.active').forEach((r) => r.classList.remove('active'));
  qsa('.page-divider.section-active').forEach((d) => d.classList.remove('section-active'));
  qsa('.page-divider.section-dimmed').forEach((d) => d.classList.remove('section-dimmed'));
  qsa('.req-row.section-active').forEach((r) => r.classList.remove('section-active'));
  qsa('.req-row.section-dimmed').forEach((r) => r.classList.remove('section-dimmed'));
  setSelectedId(null);
  if (DOM.triggeredByBanner) hideTriggeredByBanner(DOM.triggeredByBanner);
}

/**
 * Initialize copy action button handlers for the detail pane.
 * Handles Copy URL, Copy as cURL, and Copy decoded params.
 */
export function initDetailCopyHandlers(): void {
  document.getElementById('btn-copy-url')?.addEventListener('click', async () => {
    if (!_currentRequest) return;
    const btn = document.getElementById('btn-copy-url');
    if (!btn) return;
    const success = await copyToClipboard(_currentRequest.url);
    if (success) showCopyFeedback(btn, true);
  });

  document.getElementById('btn-copy-curl')?.addEventListener('click', async () => {
    if (!_currentRequest) return;
    const btn = document.getElementById('btn-copy-curl');
    if (!btn) return;
    const success = await copyToClipboard(buildCurl(_currentRequest));
    if (success) showCopyFeedback(btn, true);
  });

  document.getElementById('btn-copy-params')?.addEventListener('click', async () => {
    if (!_currentRequest) return;
    const btn = document.getElementById('btn-copy-params');
    if (!btn) return;
    const params = { ...(_currentRequest.decoded || {}) };
    const success = await copyToClipboard(JSON.stringify(params, null, 2));
    if (success) showCopyFeedback(btn, true);
  });
}

function buildCurl(data: ParsedRequest): string {
  const escapedUrl = data.url.replace(/'/g, "'\\''");
  let curl = `curl '${escapedUrl}'`;
  if (data.method !== 'GET') {
    curl += ` \\\n  -X ${data.method}`;
  }
  if (data.postBody && typeof data.postBody === 'string') {
    curl += ` \\\n  --data-raw '${data.postBody.replace(/'/g, "'\\''")}'`;
  } else if (data.postBody && typeof data.postBody === 'object') {
    curl += ` \\\n  --data-raw '${JSON.stringify(data.postBody).replace(/'/g, "'\\''")}'`;
  }
  return curl;
}
