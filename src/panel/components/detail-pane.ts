// ─── DETAIL PANE COMPONENT ───────────────────────────────────────────────────

import type { ParsedRequest, TabName } from '@/types/request';
import { DOM, qsa } from '../utils/dom';
import { categorizeParams } from '../utils/categorize';
import { renderCategorizedParams } from '../tabs/decoded';
import { renderParamTable } from '../tabs/query';
import { renderPostTab } from '../tabs/post';
import { renderHeadersTab, loadHeavyData } from '../tabs/headers';
import { renderResponse } from '../tabs/response';
import {
  setSelectedId,
  getSelectedId,
  getActiveTab,
  setActiveTab,
  getRequestMap,
  getConfig,
} from '../state';

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

  DOM.metaMethod!.textContent = data.method;
  DOM.metaStatus!.textContent = String(data.status || '—');
  DOM.metaDur!.textContent = data.duration ? data.duration + 'ms' : '—';
  DOM.metaTs!.textContent = new Date(data.timestamp).toLocaleString('en-US', { hour12: false });

  // Tab memory: keep current tab if it has data, otherwise fallback to decoded
  const availableTabs = getAvailableTabs(data);
  const currentTab = getActiveTab();
  if (!availableTabs.includes(currentTab)) {
    setActiveTab('decoded');
  }
  
  updateTabStates(availableTabs);
  renderTab(getActiveTab(), data);
  autoExpandSections();

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
  
  switch(tab) {
    case 'decoded':
      $detailContent.innerHTML = renderCategorizedParams((data as any).categorized, data);
      break;
    case 'query':
      $detailContent.innerHTML = renderParamTable(data.allParams);
      break;
    case 'post':
      renderPostTab(data, $detailContent);
      break;
    case 'headers':
      // Lazy load headers if not yet loaded
      if (!data.requestHeaders && !data.responseHeaders && (data._hasRequestHeaders || data._hasResponseHeaders)) {
        loadHeavyData(data);
      }
      $detailContent.innerHTML = renderHeadersTab(data);
      break;
    case 'response':
      // Lazy load response body if not yet loaded
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
  DOM.detail!.classList.add('hidden');
  qsa('.req-row.active').forEach(r => r.classList.remove('active'));
  setSelectedId(null);
}
