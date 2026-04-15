// ─── POPOVER MANAGER ─────────────────────────────────────────────────────
// Centralized popover open/close management

const popovers = new Map<string, () => void>();

/**
 * Register a popover with its close function.
 */
export function registerPopover(name: string, closeFn: () => void): void {
  popovers.set(name, closeFn);
}

/**
 * Close all registered popovers.
 */
export function closeAllPopovers(): void {
  popovers.forEach((closeFn) => {
    try {
      closeFn();
    } catch {
      // ignore errors in popover close handlers
    }
  });
}
