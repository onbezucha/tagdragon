let _counter = 0;

/**
 * Generate a unique ID combining timestamp and counter.
 * Avoids floating-point precision loss from Date.now() + Math.random().
 */
export function generateId(): number {
  return Date.now() * 1000 + (_counter++ % 1000);
}
