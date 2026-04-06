// ─── DETAIL PANE COMPONENT ───────────────────────────────────────────────────

import type { ParsedRequest, TabName } from '@/types/request';
import { DOM, qsa } from '../utils/dom';
import { categorizeParams } from '../utils/categorize';
import { renderCategorizedParams } from '../tabs/decoded';
import { renderParamTable } from '../tabs/query';
import { renderPostTab } from '../tabs/post';
import { renderHeadersTab, loadHeavyData } from '../tabs/headers';
import { renderResponse } from '../tabs/response';
import { formatTimestamp } from '../utils/format';
import {
  setSelectedId,
  getSelectedId,
  getActiveTab,
  setActiveTab,
  getRequestMap,
  getConfig,
  getAllRequests,
} from '../state';
import { findTriggeringPush, renderTriggeredBy } from '../datalayer/reverse-correlation';
import { getAllDlPushes } from '../datalayer/state';

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
      tabCache.delete(tabCache.keys().next().value!);
    }
    tabCache.set(id, new Map());
  }
  tabCache.get(id)!.set(tab, html);
}

export function clearTabCache(): void {
  tabCache.clear();
}

/**
 * Select and display a request in the detail pane.
 * @param data Request data
 * @param row The clicked row element
 */
export function selectRequest(data: ParsedRequest, row: HTMLElement): void {
  qsa('.req-row.active').forEach(r => r.classList.remove('active'));
  row.classList.add('active');
  setSelectedId(String(data.id));

  // Lazy categorization – compute only when user actually views the request
  if (!('categorized' in data)) {
    (data as any).categorized = categorizeParams(data.decoded, data.provider);
  }

  const $detail = DOM.detail;
  const $detailBadge = DOM.detailBadge;
  const $detailUrl = DOM.detailUrl;
  
  $detail!.classList.remove('hidden');
  $detailBadge!.textContent = data.provider;
  $detailBadge!.style.background = data.color + '22';
  $detailBadge!.style.color = data.color;
  $detailBadge!.style.border = `1px solid ${data.color}55`;
  $detailUrl!.textContent = data.url;
  ($detailUrl as HTMLElement).title = data.url;

  const cfg = getConfig();
  const sessionStart = getAllRequests()[0]?.timestamp;

  if (DOM.metaMethod) DOM.metaMethod.textContent = data.method;
  if (DOM.metaStatus) DOM.metaStatus.textContent = String(data.status || '—');
  if (DOM.metaDur) DOM.metaDur.textContent = data.duration ? data.duration + 'ms' : '—';
  if (DOM.metaTs) DOM.metaTs.textContent = formatTimestamp(data.timestamp, cfg.timestampFormat, sessionStart, true);

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

  // Triggered by DataLayer
  const dlPushes = getAllDlPushes();
  if (dlPushes.length > 0) {
    const $detailContent = DOM.detailContent;
    if ($detailContent) {
      const triggering = findTriggeringPush(data, dlPushes);
      if (triggering) {
        renderTriggeredBy($detailContent, triggering, (pushId: number) => {
          // Dispatch custom event for index.ts to handle cross-tab navigation
          document.dispatchEvent(new CustomEvent('goto-datalayer-push', { detail: pushId }));
        });
      }
    }
  }

  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/**
 * Get available tabs for a request.
 * @param data Request data
 * @returns Array of available tab names
 */
export function getAvailableTabs(data: ParsedRequest): TabName[] {
  const tabs: TabName[] = [];
  if (Object.keys((data as any).categorized || {}).length > 0) tabs.push('decoded');
  if (Object.keys(data.allParams || {}).length > 0) tabs.push('query');
  if (data.postBody) tabs.push('post');
  // Use flags for lazy-loaded data
  if (data._hasRequestHeaders || data._hasResponseHeaders || 
      Object.keys(data.requestHeaders || {}).length > 0 || 
      Object.keys(data.responseHeaders || {}).length > 0) tabs.push('headers');
  if (data._hasResponseBody || data.responseBody) tabs.push('response');
  return tabs;
}

/**
 * Update tab button states.
 * @param availableTabs Available tab names
 */
export function updateTabStates(availableTabs: TabName[]): void {
  const currentTab = getActiveTab();
  qsa('.dtab').forEach(tab => {
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
export function renderTab(tab: TabName, data: ParsedRequest): void {
  const $detailContent = DOM.detailContent;
  if (!$detailContent) return;
  const id = String(data.id);

  switch(tab) {
    case 'decoded': {
      const cached = getCached(id, 'decoded');
      if (cached !== undefined) { $detailContent.innerHTML = cached; break; }
      const html = renderCategorizedParams((data as any).categorized, data);
      $detailContent.innerHTML = html;
      setCache(id, 'decoded', html);
      break;
    }
    case 'query': {
      const cached = getCached(id, 'query');
      if (cached !== undefined) { $detailContent.innerHTML = cached; break; }
      const html = renderParamTable(data.allParams);
      $detailContent.innerHTML = html;
      setCache(id, 'query', html);
      break;
    }
    case 'post': {
      const cached = getCached(id, 'post');
      if (cached !== undefined) { $detailContent.innerHTML = cached; break; }
      renderPostTab(data, $detailContent);
      setCache(id, 'post', $detailContent.innerHTML);
      break;
    }
    case 'headers': {
      const cached = getCached(id, 'headers');
      if (cached !== undefined) { $detailContent.innerHTML = cached; break; }
      // Lazy load headers if not yet loaded
      if (!data.requestHeaders && !data.responseHeaders && (data._hasRequestHeaders || data._hasResponseHeaders)) {
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
    
    qsa('.dtab').forEach(t => t.classList.remove('active'));
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
  qsa('.req-row.active').forEach(r => r.classList.remove('active'));
  setSelectedId(null);
}
