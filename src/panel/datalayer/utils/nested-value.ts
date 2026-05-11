// ─── NESTED VALUE ACCESS ─────────────────────────────────────────────────────

/**
 * Get a nested value from an object using dot-notation path.
 * Supports bracket notation for arrays: "items[0].name"
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}
