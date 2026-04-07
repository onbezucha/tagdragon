// ─── HEADERS TAB RENDERER ────────────────────────────────────────────────────

import { renderParamTable } from './query';
import type { ParsedRequest } from '@/types/request';

/**
 * Render merged headers tab (request + response headers).
 */
export function renderHeadersTab(data: ParsedRequest): string {
  let html = '';
  const reqHeaders = data.requestHeaders || {};
  const resHeaders = data.responseHeaders || {};

  if (Object.keys(reqHeaders).length > 0) {
    html += `<div class="headers-section-title">Request Headers (${Object.keys(reqHeaders).length})</div>`;
    html += renderParamTable(reqHeaders);
  }

  if (Object.keys(resHeaders).length > 0) {
    html += `<div class="headers-section-title">Response Headers (${Object.keys(resHeaders).length})</div>`;
    html += renderParamTable(resHeaders);
  }

  return html || '<div class="empty-tab">No headers.</div>';
}

/**
 * Load heavy data (headers, response body) from devtools.js.
 */
export function loadHeavyData(data: ParsedRequest): void {
  // Retrieve heavy data from devtools.js via the exposed function
  const getHeavyData = (window as any)._getHeavyData;
  if (getHeavyData) {
    const heavy = getHeavyData(data.id);
    if (heavy) {
      data.responseBody = heavy.responseBody;
      data.requestHeaders = heavy.requestHeaders;
      data.responseHeaders = heavy.responseHeaders;
    }
  }
}
