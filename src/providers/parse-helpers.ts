/**
 * Shared parsing helpers for provider implementations.
 * Standardized utilities for JSON body parsing, formatting, and display.
 */

import type { HARPostBody } from '@/types/har';

/**
 * Standardized JSON POST body parser.
 * Handles string, object, and HAR format post bodies.
 */
export function parsePostBodyJson(postRaw: unknown): Record<string, unknown> {
  if (!postRaw) return {};
  if (typeof postRaw === 'string') {
    try {
      return JSON.parse(postRaw);
    } catch {
      return {};
    }
  }
  if (typeof postRaw === 'object' && !('text' in postRaw) && !('raw' in postRaw)) {
    return postRaw as Record<string, unknown>;
  }
  try {
    const har = postRaw as HARPostBody;
    const text = har?.text ?? (har?.raw?.[0]?.bytes ? atob(har.raw[0].bytes) : '');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Convert snake_case/camelCase to Title Case for display.
 * "order_id" → "Order Id", "productName" → "Product Name"
 */
export function titleCase(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-./]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format JSON value for display.
 * Primitives → string, Objects/Arrays → pretty-printed JSON.
 */
export function formatJsonValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Mask API key for display: first 8 chars + "..."
 */
export function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 12) return key;
  return key.slice(0, 8) + '...';
}
