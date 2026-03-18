// ─── FORMAT UTILITIES ────────────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';

/**
 * Format bytes to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + sizes[i];
}

/**
 * HTML escape string to prevent XSS.
 */
export function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extract hostname from URL.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

/**
 * Get event name from request data.
 */
export function getEventName(data: ParsedRequest): string {
  if (!data.decoded) return getHostname(data.url);
  return (
    data.decoded.Event ||
    data.decoded['Hit type'] ||
    data.decoded.event ||
    data.decoded['Event'] ||
    data.decoded.event_name ||
    Object.values(data.decoded).find(
      (v) => v && typeof v === 'string' && v.length < 50
    ) ||
    getHostname(data.url)
  );
}
