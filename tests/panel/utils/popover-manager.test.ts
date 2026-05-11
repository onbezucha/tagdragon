import { describe, it, expect, vi } from 'vitest';

describe('popover-manager', () => {
  // ─────────────────────────────────────────────────────────────────
  // loadModule — dynamic import to get fresh module state per test.
  // ES modules are cached, so we import() to reset the popovers Map.
  // ─────────────────────────────────────────────────────────────────

  async function loadModule() {
    return await import('../../../src/panel/utils/popover-manager');
  }

  // ═══════════════════════════════════════════════════════════════
  // registerPopover
  // ═══════════════════════════════════════════════════════════════

  describe('registerPopover', () => {
    it('registers a popover with its close function', async () => {
      const { registerPopover, closeAllPopovers } = await loadModule();
      const closeFn = vi.fn();
      registerPopover('tooltip', closeFn);
      closeAllPopovers();
      expect(closeFn).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // closeAllPopovers
  // ═══════════════════════════════════════════════════════════════

  describe('closeAllPopovers', () => {
    it('calls multiple registered close functions', async () => {
      const { registerPopover, closeAllPopovers } = await loadModule();
      const closeFn1 = vi.fn();
      const closeFn2 = vi.fn();
      const closeFn3 = vi.fn();
      registerPopover('popover-1', closeFn1);
      registerPopover('popover-2', closeFn2);
      registerPopover('popover-3', closeFn3);
      closeAllPopovers();
      expect(closeFn1).toHaveBeenCalledTimes(1);
      expect(closeFn2).toHaveBeenCalledTimes(1);
      expect(closeFn3).toHaveBeenCalledTimes(1);
    });

    it('overwrites existing popover with same name', async () => {
      const { registerPopover, closeAllPopovers } = await loadModule();
      const oldFn = vi.fn();
      const newFn = vi.fn();
      registerPopover('modal', oldFn);
      registerPopover('modal', newFn); // overwrite
      closeAllPopovers();
      expect(oldFn).not.toHaveBeenCalled();
      expect(newFn).toHaveBeenCalledTimes(1);
    });

    it('silently catches errors in close handlers', async () => {
      const { registerPopover, closeAllPopovers } = await loadModule();
      const errorFn = vi.fn(() => {
        throw new Error('close handler failed');
      });
      const successFn = vi.fn();
      registerPopover('error-popover', errorFn);
      registerPopover('ok-popover', successFn);
      // Should not throw even though errorFn throws
      expect(() => closeAllPopovers()).not.toThrow();
      expect(errorFn).toHaveBeenCalledTimes(1);
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('handles empty registry (no popovers)', async () => {
      const { closeAllPopovers } = await loadModule();
      // Should not throw when called with no registered popovers
      expect(() => closeAllPopovers()).not.toThrow();
    });
  });
});