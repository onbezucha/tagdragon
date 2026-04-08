/**
 * URL parameter parser utility
 * Shared URL/POST body parsing utilities used by all providers.
 */

import type { HARPostData as HARPostBody } from '@/types/har';

type ParamValue = string;
type ParamRecord = Record<string, ParamValue>;

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

  // 1. First URL query string
  try {
    new URL(url).searchParams.forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    // URL parsing failed, continue
  }

  // 2. POST body — overwrites any duplicates from URL
  const bodyStr = postBodyToString(postBody);
  if (bodyStr) {
    // Try JSON (Web SDK, some modern implementations)
    try {
      const json = JSON.parse(bodyStr);
      if (json && typeof json === 'object') {
        Object.assign(params, json);
        return params;
      }
    } catch {
      // Not JSON, continue
    }

    // URLencoded (AppMeasurement, classic AA implementations)
    // v1=value&v2=other&pageName=Home&events=purchase
    try {
      new URLSearchParams(bodyStr).forEach((v, k) => {
        params[k] = v;
      });
    } catch {
      // URLSearchParams parsing failed
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
