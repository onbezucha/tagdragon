// ─── FORMAT BYTES ─────────────────────────────────────────────────────────────
// Portable byte formatting utility — lives here to avoid cross-context
// dependencies (panel/popup are separate IIFE bundles).

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
