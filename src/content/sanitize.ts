// ─── SANITIZE ─────────────────────────────────────────────────────────────────
// Strip non-cloneable values before passing to postMessage's structured clone.
// Extracted from data-layer-main.ts for testability.

/**
 * Strip non-cloneable values before passing to postMessage's structured clone.
 * Exported for testability.
 */
export function sanitize(val: unknown, depth = 0, seen?: WeakSet<object>): unknown {
  if (depth > 15) return '[max depth]';
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return '[function]';
  if (typeof val === 'symbol') return String(val);
  if (typeof val === 'bigint') return String(val);
  if (typeof val !== 'object') return val;

  const refs = seen ?? new WeakSet<object>();
  if (refs.has(val as object)) return '[circular]';
  refs.add(val as object);

  if (Array.isArray(val)) {
    return val.map((v) => sanitize(v, depth + 1, refs));
  }

  // Skip DOM nodes
  if (typeof Element !== 'undefined' && val instanceof Element) return '[Element]';
  if (typeof Node !== 'undefined' && val instanceof Node) return '[Node]';

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(val as object)) {
    try {
      result[key] = sanitize((val as Record<string, unknown>)[key], depth + 1, refs);
    } catch {
      result[key] = '[error]';
    }
  }
  return result;
}
