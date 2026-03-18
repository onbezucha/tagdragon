// ─── POST TAB RENDERER ───────────────────────────────────────────────────────

import { esc } from '../utils/format';
import type { ParsedRequest } from '@/types/request';

/**
 * Render POST body content.
 */
export function renderPostTab(data: ParsedRequest, element: HTMLElement): void {
  if (!data.postBody) {
    element.innerHTML = '<div class="empty-tab">No POST body.</div>';
    return;
  }

  const text =
    typeof data.postBody === 'object'
      ? JSON.stringify(data.postBody, null, 2)
      : String(data.postBody);

  element.innerHTML = `<pre class="json">${esc(text)}</pre>`;
}
