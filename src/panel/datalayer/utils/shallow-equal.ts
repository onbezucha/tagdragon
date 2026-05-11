// ─── SHALLOW EQUALITY CHECK ──────────────────────────────────────────────────

/**
 * Shallow compare for primitive and simple object equality.
 * Returns true if both values are the same primitive,
 * or if they are both non-null objects with the same own-key values.
 * Includes type check for stricter comparison.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]
  );
}
