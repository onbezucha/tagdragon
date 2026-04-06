let _counter = 0;

/**
 * Context-specific offset to prevent ID collisions between
 * background, devtools, panel, and content script contexts.
 */
const CONTEXT_OFFSET: Record<string, number> = {
  background: 0,
  devtools: 500,
  panel: 1000,
  content_main: 1500,
};

let _resolvedOffset = 0;

function detectContext(): string {
  // In background service worker, chrome.tabs is available but chrome.devtools is not
  if (typeof chrome !== 'undefined' && chrome.devtools) return 'devtools';
  // Content scripts run in isolated world; MAIN world scripts don't have chrome.runtime
  if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    // Could be background or panel — background has no document
    if (typeof document === 'undefined') return 'background';
    return 'panel';
  }
  // MAIN world content script (no chrome.runtime)
  return 'content_main';
}

/**
 * Generate a unique ID combining timestamp, context offset, and counter.
 * Avoids floating-point precision loss from Date.now() + Math.random()
 * and prevents collisions between extension contexts.
 */
export function generateId(): number {
  if (!_resolvedOffset) {
    const ctx = detectContext();
    _resolvedOffset = CONTEXT_OFFSET[ctx] ?? 0;
  }
  return Date.now() * 1000 + (_resolvedOffset + (_counter++ % 500));
}
