// ─── SHALLOW EQUALITY CHECK ──────────────────────────────────────────────────

/**
 * Shallow comparison of two values.
 * Returns true if both values are the same primitive,
 * or if they are both non-null objects with the same own-key values.
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
  }
  return true;
}

// ─── CHANGE DETECTION ────────────────────────────────────────────────────────

/**
 * Compute which top-level keys changed between two objects.
 * Returns a map of key → change type.
 */
export function computeChangedPaths(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>
): Map<string, 'added' | 'changed' | 'removed'> {
  const result = new Map<string, 'added' | 'changed' | 'removed'>();
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of allKeys) {
    if (!(key in prev)) {
      result.set(key, 'added');
    } else if (!(key in curr)) {
      result.set(key, 'removed');
    } else {
      const prevVal = prev[key];
      const currVal = curr[key];

      // Fast path: reference equality
      if (prevVal === currVal) continue;

      // Fast path: null/undefined comparison
      if (prevVal == null && currVal == null) continue;

      // Primitives: direct comparison (covers string, number, boolean)
      if (typeof prevVal !== 'object' && typeof currVal !== 'object') {
        if (prevVal !== currVal) result.set(key, 'changed');
        continue;
      }

      // One is object, other is not — definitely changed
      if ((prevVal === null) !== (currVal === null) || typeof prevVal !== typeof currVal) {
        result.set(key, 'changed');
        continue;
      }

      // Both are objects/arrays — shallow comparison
      if (!shallowEqual(prevVal, currVal)) {
        result.set(key, 'changed');
      }
    }
  }
  return result;
}
