// ─── RESPONSE TAB RENDERER ───────────────────────────────────────────────────

import { esc } from '../utils/format';

/**
 * Render response body content.
 */
export function renderResponse(body: string | null | undefined): string {
  if (!body) {
    return '<div class="empty-tab">No response body.</div>';
  }

  let pretty = body;
  try {
    pretty = JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    // Not JSON, use as-is
  }

  return `<pre class="json">${esc(pretty)}</pre>`;
}
