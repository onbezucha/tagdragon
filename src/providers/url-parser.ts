/**
 * URL parameter parser utility
 * Shared URL/POST body parsing utilities used by all providers.
 */

import type { HARPostBody } from '@/types/har';

type ParamValue = string;
type ParamRecord = Record<string, ParamValue>;

/**
 * Fast query string parser — avoids allocating URL/URLSearchParams objects.
 * Only extracts query parameters from the URL string using manual string operations.
 */
function fastParseQueryString(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const qStart = url.indexOf('?');
  if (qStart === -1) return params;
  const hashStart = url.indexOf('#', qStart);
  const qStr = hashStart === -1 ? url.substring(qStart + 1) : url.substring(qStart + 1, hashStart);
  let start = 0;
  while (start < qStr.length) {
    const eq = qStr.indexOf('=', start);
    const amp = qStr.indexOf('&', start);
    const end = amp === -1 ? qStr.length : amp;
    if (eq !== -1 && eq < end) {
      try {
        // Replace + with space for URL-encoded form data compatibility
        const decodedValue = qStr.substring(eq + 1, end).replace(/\+/g, ' ');
        params[decodeURIComponent(qStr.substring(start, eq))] = decodeURIComponent(decodedValue);
      } catch {
        // Invalid URI component — store raw
        params[qStr.substring(start, eq)] = qStr.substring(eq + 1, end);
      }
    }
    start = end + 1;
  }
  return params;
}

/**
 * Convert any postBody format to plain string for further parsing.
 * Handles string, object, and HAR format post bodies.
 */
function postBodyToString(postBody: unknown): string {
  if (!postBody) return '';
  if (typeof postBody === 'string') return postBody;

  // Came as an object from parsePostBody — convert back to URLencoded string
  // so getParams can read parameters correctly
  if (typeof postBody === 'object' && !('text' in postBody) && !('raw' in postBody)) {
    return Object.entries(postBody as Record<string, unknown>)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
      .join('&');
  }

  // HAR format: {text: "...", mimeType: "..."}
  const har = postBody as HARPostBody;
  if (har.text) return har.text;

  // HAR raw bytes
  if (har.raw && har.raw[0]?.bytes) {
    try {
      return atob(har.raw[0].bytes);
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Parse URL query string + POST body into one merged object.
 * Adobe Analytics sends parameters either in URL (GET) or as urlencoded POST body.
 * Both variants must be merged — POST body takes precedence over URL.
 */
export function getParams(url: string, postBody?: unknown): ParamRecord {
  const params: ParamRecord = {};

  // 1. First URL query string — fast parse, no URL object allocation
  const queryParams = fastParseQueryString(url);
  for (const k in queryParams) {
    params[k] = queryParams[k];
  }

  // 2. POST body — overwrites any duplicates from URL
  const bodyStr = postBodyToString(postBody);
  if (bodyStr) {
    // Try URLencoded first (most common for tracking pixels and AA implementations)
    // v1=value&v2=other&pageName=Home&events=purchase
    // Manual parse to avoid URLSearchParams allocation
    let hasParams = false;
    let bodyStart = 0;
    while (bodyStart < bodyStr.length) {
      const eq = bodyStr.indexOf('=', bodyStart);
      const amp = bodyStr.indexOf('&', bodyStart);
      const end = amp === -1 ? bodyStr.length : amp;
      if (eq !== -1 && eq < end) {
        try {
          // Replace + with space for URL-encoded form data compatibility
          const decodedValue = bodyStr.substring(eq + 1, end).replace(/\+/g, ' ');
          params[decodeURIComponent(bodyStr.substring(bodyStart, eq))] =
            decodeURIComponent(decodedValue);
        } catch {
          params[bodyStr.substring(bodyStart, eq)] = bodyStr.substring(eq + 1, end);
        }
        hasParams = true;
      }
      bodyStart = end + 1;
    }
    if (hasParams) return params;

    // Fallback to JSON (Web SDK, some modern implementations)
    try {
      const json = JSON.parse(bodyStr);
      if (json && typeof json === 'object') {
        for (const [k, v] of Object.entries(json)) {
          if (v == null) continue;
          params[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
        return params;
      }
    } catch {
      // Not JSON, give up
    }
  }

  return params;
}

/**
 * Extract a capturing group from a URL path using a regex.
 */
export function extractPath(url: string, regex: RegExp): string | undefined {
  const m = url.match(regex);
  return m ? m[1] : undefined;
}
