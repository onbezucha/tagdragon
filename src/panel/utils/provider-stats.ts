// ─── PER-PROVIDER STATISTICS ────────────────────────────────────────────────
// Computes aggregated metrics per tracking provider for the status bar breakdown

import type { ParsedRequest } from '@/types/request';

export interface ProviderStat {
  name: string;
  color: string;
  count: number;
  errorCount: number; // status >= 400
  totalSize: number; // bytes
  avgTime: number; // ms
}

export function computeProviderStats(requests: ParsedRequest[]): ProviderStat[] {
  const statsMap = new Map<string, ProviderStat>();

  for (const req of requests) {
    const name = req.provider || 'Unknown';
    const existing = statsMap.get(name);

    if (existing) {
      existing.count++;
      if (req.status && req.status >= 400) existing.errorCount++;
      existing.totalSize += req.size || 0;
      existing.avgTime += req.duration || 0;
    } else {
      statsMap.set(name, {
        name,
        color: req.color || '#888',
        count: 1,
        errorCount: req.status && req.status >= 400 ? 1 : 0,
        totalSize: req.size || 0,
        avgTime: req.duration || 0,
      });
    }
  }

  // Compute average time
  const results = Array.from(statsMap.values());
  for (const stat of results) {
    stat.avgTime = stat.count > 0 ? Math.round(stat.avgTime / stat.count) : 0;
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  return results;
}

/**
 * Format milliseconds to human-readable time.
 */
export function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
