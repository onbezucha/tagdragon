// ─── FORMAT UTILITIES ────────────────────────────────────────────────────────

import type { ParsedRequest } from '@/types/request';

// ─── HTML ESCAPE MAP ─────────────────────────────────────────────────────────
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  $: '&#36;',
};

/**
 * Format bytes to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + sizes[i];
}

/**
 * HTML escape string to prevent XSS.
 */
export function esc(str: unknown): string {
  return String(str ?? '').replace(/[&<>"'`$]/g, (m) => ESCAPE_MAP[m] ?? m);
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
 * Format a timestamp according to user-configured display format.
 * @param ts ISO timestamp string
 * @param format Display format: 'absolute' | 'relative' | 'elapsed'
 * @param sessionStartTs Optional ISO timestamp of the first request in session (for 'elapsed')
 * @param full If true, absolute format returns full date+time; otherwise time only
 */
export function formatTimestamp(
  ts: string,
  format: 'absolute' | 'relative' | 'elapsed',
  sessionStartTs?: string,
  full?: boolean
): string {
  const date = new Date(ts);

  if (format === 'relative') {
    const diff = Math.max(0, Date.now() - date.getTime());
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) {
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return `${m}m ${s}s`;
    }
    // Fall through to absolute for older timestamps
  }

  if (format === 'elapsed') {
    const start = sessionStartTs ? new Date(sessionStartTs).getTime() : date.getTime();
    const diff = Math.max(0, date.getTime() - start);
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const ms = diff % 1000;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  // absolute
  if (full) return date.toLocaleString('en-US', { hour12: false });
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get event name from request data.
 */
export function getEventName(data: ParsedRequest): string {
  if (!data.decoded) return getHostname(data.url);
  if (data.provider === 'Google Ads') {
    return (
      data.decoded['Conversion Label'] || data.decoded['Conversion Type'] || getHostname(data.url)
    );
  }
  return (
    data.decoded['Event type'] ||
    data.decoded.Event ||
    data.decoded['Hit type'] ||
    data.decoded.event ||
    data.decoded.event_name ||
    getHostname(data.url)
  );
}
