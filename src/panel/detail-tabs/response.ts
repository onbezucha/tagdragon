// ─── RESPONSE TAB RENDERER ───────────────────────────────────────────────────

import { esc } from '../utils/format';

const LARGE_RESPONSE_THRESHOLD = 100_000;
const TRUNCATED_OUTPUT_LENGTH = 50_000;

/**
 * Render response body content.
 */
export function renderResponse(body: string | null | undefined): string {
  if (!body) {
    return '<div class="empty-tab">No response body.</div>';
  }

  let pretty = body;
  let isTruncated = false;
  const totalLength = body.length;

  if (body.length < LARGE_RESPONSE_THRESHOLD) {
    // Small responses: try to parse and format JSON
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // Not JSON, use as-is
    }
  } else {
    // Large responses: try parse but truncate output to avoid performance issues
    isTruncated = true;
    try {
      const parsed = JSON.parse(body);
      pretty =
        JSON.stringify(parsed, null, 2).slice(0, TRUNCATED_OUTPUT_LENGTH) + '\n... (truncated)';
    } catch {
      // Not JSON or parse failed: truncate raw text
      pretty = body.slice(0, TRUNCATED_OUTPUT_LENGTH) + '\n... (truncated)';
    }
  }

  const truncationWarning = isTruncated
    ? `<div class="response-truncation-warning">⚠ Response truncated at ${TRUNCATED_OUTPUT_LENGTH.toLocaleString()} characters (original: ${totalLength.toLocaleString()})</div>`
    : '';

  return `<pre class="json">${esc(pretty)}</pre>${truncationWarning}`;
}
