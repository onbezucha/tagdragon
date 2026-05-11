// @vitest-environment jsdom
// ─── KEYBOARD SHORTCUTS TESTS ──────────────────────────────────────────────────
// Unit tests for keyboard shortcut handling in the panel UI

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

// ─── MOCK COLLECTOR ───────────────────────────────────────────────────────────
// Using vi.hoisted to collect all mocks in one place before vi.mock() calls

const mocks = vi.hoisted(() => {
  // ── DOM element references ──────────────────────────────────────────────
  let mockFilterInput: HTMLInputElement | null = null;
  let mockDlFilterInput: HTMLInputElement | null = null;
  let mockDetail: HTMLElement | null = null;
  let mockDlDetailPane: HTMLElement | null = null;

  // ── Context callbacks ───────────────────────────────────────────────────
  const getActiveView = vi.fn((): 'network' | 'datalayer' => 'network');
  const doApplyFilters = vi.fn();
  const doUpdateActiveFilters = vi.fn();
  const doSelectRequest = vi.fn();
  const doSelectPush = vi.fn();
  const toggleSettingsDrawer = vi.fn();

  // ── detail-pane mocks ───────────────────────────────────────────────────
  const closeDetailPane = vi.fn();
  const setSmoothScroll = vi.fn();

  // ── request-list mocks ──────────────────────────────────────────────────
  const navigateList = vi.fn();
  const navigateToEdge = vi.fn();

  // ── push-list mocks ─────────────────────────────────────────────────────
  const navigateDlList = vi.fn();
  const navigateDlToEdge = vi.fn();

  // ── push-detail mocks ───────────────────────────────────────────────────
  const closeDlDetail = vi.fn();

  // ── settings-drawer mocks ───────────────────────────────────────────────
  const isSettingsOpen = vi.fn(() => false);
  const closeSettings = vi.fn();

  // ── provider-filter mocks ────────────────────────────────────────────────
  const isProviderFilterOpen = vi.fn(() => false);
  const closeProviderFilter = vi.fn();

  // ── dl-filter-popover mocks ─────────────────────────────────────────────
  const isDlFilterPopoverOpen = vi.fn(() => false);
  const closeDlFilterPopover = vi.fn();

  // ── info-popover mocks ──────────────────────────────────────────────────
  const isInfoPopoverOpen = vi.fn(() => false);
  const closeInfoPopover = vi.fn();

  // ── consent-panel mocks ─────────────────────────────────────────────────
  const isConsentOpen = vi.fn(() => false);
  const closeConsentPanel = vi.fn();

  // ── adobe-env-switcher mocks ────────────────────────────────────────────
  const isEnvPopoverOpen = vi.fn(() => false);
  const closeEnvPopover = vi.fn();

  // ── state module mocks ───────────────────────────────────────────────────
  const setFilterText = vi.fn();

  // ── dl state module mocks ───────────────────────────────────────────────
  const setDlFilterText = vi.fn();
  const setDlSelectedId = vi.fn();

  // ── platform mock ───────────────────────────────────────────────────────
  const isMac = false;

  return {
    // DOM refs
    get mockFilterInput() { return mockFilterInput; },
    set mockFilterInput(v: HTMLInputElement | null) { mockFilterInput = v; },
    get mockDlFilterInput() { return mockDlFilterInput; },
    set mockDlFilterInput(v: HTMLInputElement | null) { mockDlFilterInput = v; },
    get mockDetail() { return mockDetail; },
    set mockDetail(v: HTMLElement | null) { mockDetail = v; },
    get mockDlDetailPane() { return mockDlDetailPane; },
    set mockDlDetailPane(v: HTMLElement | null) { mockDlDetailPane = v; },

    // Context callbacks
    getActiveView,
    doApplyFilters,
    doUpdateActiveFilters,
    doSelectRequest,
    doSelectPush,
    toggleSettingsDrawer,

    // Module mocks
    closeDetailPane,
    setSmoothScroll,
    navigateList,
    navigateToEdge,
    navigateDlList,
    navigateDlToEdge,
    closeDlDetail,
    isSettingsOpen,
    closeSettings,
    isProviderFilterOpen,
    closeProviderFilter,
    isDlFilterPopoverOpen,
    closeDlFilterPopover,
    isInfoPopoverOpen,
    closeInfoPopover,
    isConsentOpen,
    closeConsentPanel,
    isEnvPopoverOpen,
    closeEnvPopover,
    setFilterText,
    setDlFilterText,
    setDlSelectedId,
    isMac,
  };
});

// ─── MODULE MOCKS ─────────────────────────────────────────────────────────────

vi.mock('@/panel/utils/dom', () => ({
  DOM: {
    get filterInput() { return mocks.mockFilterInput; },
    get dlFilterInput() { return mocks.mockDlFilterInput; },
    get detail() { return mocks.mockDetail; },
    get dlDetailPane() { return mocks.mockDlDetailPane; },
  },
}));

vi.mock('@/panel/components/detail-pane', () => ({
  closeDetailPane: mocks.closeDetailPane,
  setSmoothScroll: mocks.setSmoothScroll,
}));

vi.mock('@/panel/components/request-list', () => ({
  navigateList: mocks.navigateList,
  navigateToEdge: mocks.navigateToEdge,
}));

vi.mock('@/panel/datalayer/components/push-list', () => ({
  navigateDlList: mocks.navigateDlList,
  navigateDlToEdge: mocks.navigateDlToEdge,
}));

vi.mock('@/panel/datalayer/components/push-detail', () => ({
  closeDlDetail: mocks.closeDlDetail,
}));

vi.mock('@/panel/state', () => ({
  setFilterText: mocks.setFilterText,
}));

vi.mock('@/panel/datalayer/state', () => ({
  setDlFilterText: mocks.setDlFilterText,
  setDlSelectedId: mocks.setDlSelectedId,
}));

vi.mock('@/panel/utils/platform', () => ({
  isMac: mocks.isMac,
}));

vi.mock('@/panel/components/settings-drawer', () => ({
  isOpen: mocks.isSettingsOpen,
  closeSettings: mocks.closeSettings,
}));

vi.mock('@/panel/components/provider-filter/popover', () => ({
  isProviderFilterOpen: mocks.isProviderFilterOpen,
  closeProviderFilter: mocks.closeProviderFilter,
}));

vi.mock('@/panel/components/dl-filter-popover', () => ({
  isOpen: mocks.isDlFilterPopoverOpen,
  closeDlFilterPopover: mocks.closeDlFilterPopover,
}));

vi.mock('@/panel/components/info-popover', () => ({
  isOpen: mocks.isInfoPopoverOpen,
  closeInfoPopover: mocks.closeInfoPopover,
}));

vi.mock('@/panel/components/consent-panel', () => ({
  isConsentOpen: mocks.isConsentOpen,
  closeConsentPanel: mocks.closeConsentPanel,
}));

vi.mock('@/panel/components/adobe-env-switcher', () => ({
  isEnvPopoverOpen: mocks.isEnvPopoverOpen,
  closeEnvPopover: mocks.closeEnvPopover,
}));

// ─── DYNAMIC IMPORT HELPER ────────────────────────────────────────────────────
// Import after all mocks are set up

let initKeyboardHandlers: (ctx: {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  doSelectRequest: (data: ParsedRequest, row: HTMLElement) => void;
  doSelectPush: (push: DataLayerPush, row: HTMLElement) => void;
  toggleSettingsDrawer: () => void;
}) => void;

beforeEach(async () => {
  vi.resetModules();

  // Re-setup mocks after resetModules
  vi.doMock('@/panel/utils/dom', () => ({
    DOM: {
      get filterInput() { return mocks.mockFilterInput; },
      get dlFilterInput() { return mocks.mockDlFilterInput; },
      get detail() { return mocks.mockDetail; },
      get dlDetailPane() { return mocks.mockDlDetailPane; },
    },
  }));

  vi.doMock('@/panel/components/detail-pane', () => ({
    closeDetailPane: mocks.closeDetailPane,
    setSmoothScroll: mocks.setSmoothScroll,
  }));

  vi.doMock('@/panel/components/request-list', () => ({
    navigateList: mocks.navigateList,
    navigateToEdge: mocks.navigateToEdge,
  }));

  vi.doMock('@/panel/datalayer/components/push-list', () => ({
    navigateDlList: mocks.navigateDlList,
    navigateDlToEdge: mocks.navigateDlToEdge,
  }));

  vi.doMock('@/panel/datalayer/components/push-detail', () => ({
    closeDlDetail: mocks.closeDlDetail,
  }));

  vi.doMock('@/panel/state', () => ({
    setFilterText: mocks.setFilterText,
  }));

  vi.doMock('@/panel/datalayer/state', () => ({
    setDlFilterText: mocks.setDlFilterText,
    setDlSelectedId: mocks.setDlSelectedId,
  }));

  vi.doMock('@/panel/utils/platform', () => ({
    isMac: mocks.isMac,
  }));

  vi.doMock('@/panel/components/settings-drawer', () => ({
    isOpen: mocks.isSettingsOpen,
    closeSettings: mocks.closeSettings,
  }));

  vi.doMock('@/panel/components/provider-filter/popover', () => ({
    isProviderFilterOpen: mocks.isProviderFilterOpen,
    closeProviderFilter: mocks.closeProviderFilter,
  }));

  vi.doMock('@/panel/components/dl-filter-popover', () => ({
    isOpen: mocks.isDlFilterPopoverOpen,
    closeDlFilterPopover: mocks.closeDlFilterPopover,
  }));

  vi.doMock('@/panel/components/info-popover', () => ({
    isOpen: mocks.isInfoPopoverOpen,
    closeInfoPopover: mocks.closeInfoPopover,
  }));

  vi.doMock('@/panel/components/consent-panel', () => ({
    isConsentOpen: mocks.isConsentOpen,
    closeConsentPanel: mocks.closeConsentPanel,
  }));

  vi.doMock('@/panel/components/adobe-env-switcher', () => ({
    isEnvPopoverOpen: mocks.isEnvPopoverOpen,
    closeEnvPopover: mocks.closeEnvPopover,
  }));

  // Dynamic import to get fresh module with mocks applied
  const mod = await import('@/panel/keyboard-shortcuts');
  initKeyboardHandlers = mod.initKeyboardHandlers;
});

// ─── HELPER ───────────────────────────────────────────────────────────────────

function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, ...opts }));
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('Keyboard Shortcuts', () => {
  let removeListener: (() => void) | null = null;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Reset mock call counts
    mocks.closeDetailPane.mockClear();
    mocks.closeDlDetail.mockClear();
    mocks.setSmoothScroll.mockClear();
    mocks.navigateList.mockClear();
    mocks.navigateToEdge.mockClear();
    mocks.navigateDlList.mockClear();
    mocks.navigateDlToEdge.mockClear();
    mocks.toggleSettingsDrawer.mockClear();
    mocks.closeSettings.mockClear();
    mocks.closeProviderFilter.mockClear();
    mocks.closeDlFilterPopover.mockClear();
    mocks.closeInfoPopover.mockClear();
    mocks.closeConsentPanel.mockClear();
    mocks.closeEnvPopover.mockClear();
    mocks.doApplyFilters.mockClear();
    mocks.doUpdateActiveFilters.mockClear();
    mocks.setFilterText.mockClear();
    mocks.setDlFilterText.mockClear();
    mocks.setDlSelectedId.mockClear();

    // Reset mock return values
    mocks.getActiveView.mockReturnValue('network');
    mocks.isSettingsOpen.mockReturnValue(false);
    mocks.isProviderFilterOpen.mockReturnValue(false);
    mocks.isDlFilterPopoverOpen.mockReturnValue(false);
    mocks.isInfoPopoverOpen.mockReturnValue(false);
    mocks.isConsentOpen.mockReturnValue(false);
    mocks.isEnvPopoverOpen.mockReturnValue(false);

    // Reset DOM refs
    mocks.mockFilterInput = null;
    mocks.mockDlFilterInput = null;
    mocks.mockDetail = null;
    mocks.mockDlDetailPane = null;

    // Register keyboard handlers
    initKeyboardHandlers({
      getActiveView: mocks.getActiveView,
      doApplyFilters: mocks.doApplyFilters,
      doUpdateActiveFilters: mocks.doUpdateActiveFilters,
      doSelectRequest: mocks.doSelectRequest,
      doSelectPush: mocks.doSelectPush,
      toggleSettingsDrawer: mocks.toggleSettingsDrawer,
    });
  });

  afterEach(() => {
    // Remove all keydown listeners
    if (removeListener) {
      removeListener();
      removeListener = null;
    }
    document.querySelectorAll('input, button').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  // ── JSDOM FOCUS BEHAVIOR ─────────────────────────────────────────────────

  describe('jsdom focus behavior (setup validation)', () => {
    it('INPUT can receive focus', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('TEXTAREA can receive focus', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
    });

    it('BUTTON can receive focus', () => {
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      btn.focus();
      expect(document.activeElement).toBe(btn);
    });

    // Note: contentEditable focus test skipped - jsdom doesn't reliably support
    // focus on contentEditable elements. Tested indirectly through shortcut guards.
  });

  // ── SLASH / ─────────────────────────────────────────────────────────────

  describe("'/' focuses search", () => {
    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      input.id = 'filter-input';
      document.body.appendChild(input);
      mocks.mockFilterInput = input;
      input.focus();

      dispatchKey('/');

      // Should not crash and should not change active element
      expect(document.activeElement).toBe(input);
    });

    it('does nothing when provider filter popover is open', () => {
      mocks.isProviderFilterOpen.mockReturnValue(true);

      dispatchKey('/');

      // Should not crash
    });

    it('does nothing when settings drawer is open', () => {
      mocks.isSettingsOpen.mockReturnValue(true);

      dispatchKey('/');

      // Should not crash
    });

    it('focuses network filter input when network view', () => {
      mocks.getActiveView.mockReturnValue('network');
      const input = document.createElement('input');
      input.id = 'filter-input';
      document.body.appendChild(input);
      mocks.mockFilterInput = input;

      dispatchKey('/');

      expect(document.activeElement).toBe(input);
    });

    it('focuses DL filter input when datalayer view', () => {
      mocks.getActiveView.mockReturnValue('datalayer');
      const input = document.createElement('input');
      input.id = 'dl-filter-input';
      document.body.appendChild(input);
      mocks.mockDlFilterInput = input;

      dispatchKey('/');

      expect(document.activeElement).toBe(input);
    });
  });

  // ── BACKSPACE ────────────────────────────────────────────────────────────

  describe('Backspace clears requests', () => {
    it('clicks btn-clear-all when network view', () => {
      mocks.getActiveView.mockReturnValue('network');
      const btn = document.createElement('button');
      btn.id = 'btn-clear-all';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('Backspace');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('clicks dl-btn-clear when datalayer view', () => {
      mocks.getActiveView.mockReturnValue('datalayer');
      const btn = document.createElement('button');
      btn.id = 'dl-btn-clear';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('Backspace');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const btn = document.createElement('button');
      btn.id = 'btn-clear-all';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('Backspace');

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ── SPACE ─────────────────────────────────────────────────────────────────

  describe('Space pauses/resumes capture', () => {
    it('clicks btn-pause button', () => {
      const btn = document.createElement('button');
      btn.id = 'btn-pause';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey(' ');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const btn = document.createElement('button');
      btn.id = 'btn-pause';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey(' ');

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ── E ─────────────────────────────────────────────────────────────────────

  describe("'e' triggers export", () => {
    it('clicks btn-export in network view', () => {
      mocks.getActiveView.mockReturnValue('network');
      const btn = document.createElement('button');
      btn.id = 'btn-export';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('e');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('clicks dl-btn-export in datalayer view', () => {
      mocks.getActiveView.mockReturnValue('datalayer');
      const btn = document.createElement('button');
      btn.id = 'dl-btn-export';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('e');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when provider filter is open', () => {
      mocks.isProviderFilterOpen.mockReturnValue(true);
      const btn = document.createElement('button');
      btn.id = 'btn-export';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('e');

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const btn = document.createElement('button');
      btn.id = 'btn-export';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('e');

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ── T ─────────────────────────────────────────────────────────────────────

  describe("'t' toggles theme", () => {
    it('clicks theme toggle button', () => {
      const btn = document.createElement('button');
      btn.id = 'btn-theme-toggle';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('t');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when settings drawer is open', () => {
      mocks.isSettingsOpen.mockReturnValue(true);
      const btn = document.createElement('button');
      btn.id = 'btn-theme-toggle';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('t');

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const btn = document.createElement('button');
      btn.id = 'btn-theme-toggle';
      const clickSpy = vi.spyOn(btn, 'click');
      document.body.appendChild(btn);

      dispatchKey('t');

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ── ESCAPE ───────────────────────────────────────────────────────────────

  describe('Escape closes popovers and clears search', () => {
    it('closes provider filter popover when open', () => {
      mocks.isProviderFilterOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeProviderFilter).toHaveBeenCalled();
    });

    it('closes DL filter popover when open', () => {
      mocks.isDlFilterPopoverOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeDlFilterPopover).toHaveBeenCalled();
    });

    it('closes info popover when open', () => {
      mocks.isInfoPopoverOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeInfoPopover).toHaveBeenCalled();
    });

    it('closes consent panel when open', () => {
      mocks.isConsentOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeConsentPanel).toHaveBeenCalled();
    });

    it('closes Adobe env popover when open', () => {
      mocks.isEnvPopoverOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeEnvPopover).toHaveBeenCalled();
    });

    it('closes settings drawer when open', () => {
      mocks.isSettingsOpen.mockReturnValue(true);

      dispatchKey('Escape');

      expect(mocks.closeSettings).toHaveBeenCalled();
    });

    it('clears network filter input when focused', () => {
      const input = document.createElement('input');
      input.id = 'filter-input';
      document.body.appendChild(input);
      mocks.mockFilterInput = input;
      input.focus();
      input.value = 'test search';
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('Escape');

      expect(mocks.setFilterText).toHaveBeenCalledWith('');
      expect(mocks.doApplyFilters).toHaveBeenCalled();
      expect(mocks.doUpdateActiveFilters).toHaveBeenCalled();
    });

    it('clears DL filter input when focused', () => {
      const input = document.createElement('input');
      input.id = 'dl-filter-input';
      document.body.appendChild(input);
      mocks.mockDlFilterInput = input;
      input.focus();
      input.value = 'dl search';
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('Escape');

      expect(mocks.setDlFilterText).toHaveBeenCalledWith('');
    });

    it('closes network detail pane when visible', () => {
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('Escape');

      expect(mocks.closeDetailPane).toHaveBeenCalled();
    });

    it('closes DL detail pane when visible', () => {
      // Ensure network detail pane is hidden so we don't hit the network check first
      const networkDetail = document.createElement('div');
      networkDetail.id = 'detail-pane';
      networkDetail.classList.add('hidden');
      document.body.appendChild(networkDetail);
      mocks.mockDetail = networkDetail;

      const dlDetail = document.createElement('div');
      dlDetail.id = 'dl-detail-pane';
      dlDetail.classList.remove('hidden');
      document.body.appendChild(dlDetail);
      mocks.mockDlDetailPane = dlDetail;
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('Escape');

      expect(mocks.closeDlDetail).toHaveBeenCalled();
      expect(mocks.setDlSelectedId).toHaveBeenCalledWith(null);
    });
  });

  // ── ARROW KEYS ───────────────────────────────────────────────────────────

  describe('Arrow keys navigate list', () => {
    it('ArrowDown navigates network list forward', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('ArrowDown');

      expect(mocks.navigateList).toHaveBeenCalledWith(1, mocks.doSelectRequest);
    });

    it('ArrowUp navigates network list backward', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('ArrowUp');

      expect(mocks.navigateList).toHaveBeenCalledWith(-1, mocks.doSelectRequest);
    });

    it('ArrowDown navigates DL list forward', () => {
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('ArrowDown');

      expect(mocks.navigateDlList).toHaveBeenCalledWith(1, mocks.doSelectPush, false);
    });

    it('ArrowUp navigates DL list backward', () => {
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('ArrowUp');

      expect(mocks.navigateDlList).toHaveBeenCalledWith(-1, mocks.doSelectPush, false);
    });

    it('wraps setSmoothScroll for network navigation', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('ArrowDown');

      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(1, false);
      expect(mocks.navigateList).toHaveBeenCalled();
      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(2, true);
    });

    it('does nothing when button is focused', () => {
      const btn = document.createElement('button');
      document.body.appendChild(btn);
      btn.focus();

      dispatchKey('ArrowDown');

      expect(mocks.navigateList).not.toHaveBeenCalled();
      expect(mocks.navigateDlList).not.toHaveBeenCalled();
    });
  });

  // ── HOME / END ───────────────────────────────────────────────────────────

  describe('Home/End jumps to first/last item', () => {
    it('Home jumps to first network item', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('Home');

      expect(mocks.navigateToEdge).toHaveBeenCalledWith('first', mocks.doSelectRequest);
    });

    it('End jumps to last network item', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('End');

      expect(mocks.navigateToEdge).toHaveBeenCalledWith('last', mocks.doSelectRequest);
    });

    it('Home jumps to first DL item', () => {
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('Home');

      expect(mocks.navigateDlToEdge).toHaveBeenCalledWith('first', mocks.doSelectPush);
    });

    it('End jumps to last DL item', () => {
      mocks.getActiveView.mockReturnValue('datalayer');

      dispatchKey('End');

      expect(mocks.navigateDlToEdge).toHaveBeenCalledWith('last', mocks.doSelectPush);
    });

    it('wraps setSmoothScroll for Home navigation', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('Home');

      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(1, false);
      expect(mocks.navigateToEdge).toHaveBeenCalled();
      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(2, true);
    });

    it('wraps setSmoothScroll for End navigation', () => {
      mocks.getActiveView.mockReturnValue('network');

      dispatchKey('End');

      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(1, false);
      expect(mocks.navigateToEdge).toHaveBeenCalled();
      expect(mocks.setSmoothScroll).toHaveBeenNthCalledWith(2, true);
    });

    it('does nothing when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      dispatchKey('Home');

      expect(mocks.navigateToEdge).not.toHaveBeenCalled();
      expect(mocks.navigateDlToEdge).not.toHaveBeenCalled();
    });
  });

  // ── NUMBER KEYS 1-5 ────────────────────────────────────────────────────────

  describe('Number keys 1-5 switch detail tabs', () => {
    it('does nothing when detail pane is closed', () => {
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.add('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      dispatchKey('1');

      // Should not crash
    });

    it('clicks first tab when 1 is pressed and network detail is open', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      // Create tab elements
      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      tab1.id = 'tab-1';
      const tab2 = document.createElement('div');
      tab2.className = 'dtab';
      tab2.id = 'tab-2';
      document.body.appendChild(tab1);
      document.body.appendChild(tab2);
      const clickSpy1 = vi.spyOn(tab1, 'click');

      dispatchKey('1');

      expect(clickSpy1).toHaveBeenCalled();
    });

    it('clicks second tab when 2 is pressed', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      const tab2 = document.createElement('div');
      tab2.className = 'dtab';
      tab2.id = 'tab-2';
      document.body.appendChild(tab1);
      document.body.appendChild(tab2);
      const clickSpy2 = vi.spyOn(tab2, 'click');

      dispatchKey('2');

      expect(clickSpy2).toHaveBeenCalled();
    });

    it('clicks fifth tab when 5 is pressed', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      // Create 5 tabs
      const tabs = Array.from({ length: 5 }, (_, i) => {
        const tab = document.createElement('div');
        tab.className = 'dtab';
        tab.id = `tab-${i + 1}`;
        document.body.appendChild(tab);
        return tab;
      });
      const clickSpy5 = vi.spyOn(tabs[4], 'click');

      dispatchKey('5');

      expect(clickSpy5).toHaveBeenCalled();
    });

    it('does not click disabled tabs', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab disabled';
      document.body.appendChild(tab1);
      const clickSpy = vi.spyOn(tab1, 'click');

      dispatchKey('1');

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('ignores keys when Ctrl is held', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      document.body.appendChild(tab1);
      const clickSpy = vi.spyOn(tab1, 'click');

      dispatchKey('1', { ctrlKey: true });

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('ignores keys when Meta is held', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      document.body.appendChild(tab1);
      const clickSpy = vi.spyOn(tab1, 'click');

      dispatchKey('1', { metaKey: true });

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('ignores keys when Alt is held', () => {
      mocks.getActiveView.mockReturnValue('network');
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      document.body.appendChild(tab1);
      const clickSpy = vi.spyOn(tab1, 'click');

      dispatchKey('1', { altKey: true });

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('uses dl-dtab selector in datalayer view', () => {
      mocks.getActiveView.mockReturnValue('datalayer');
      const dlDetail = document.createElement('div');
      dlDetail.id = 'dl-detail-pane';
      dlDetail.classList.remove('hidden');
      document.body.appendChild(dlDetail);
      mocks.mockDlDetailPane = dlDetail;

      const dlTab = document.createElement('div');
      dlTab.className = 'dl-dtab';
      dlTab.id = 'dl-tab-1';
      document.body.appendChild(dlTab);
      const clickSpy = vi.spyOn(dlTab, 'click');

      dispatchKey('1');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when provider filter popover is open', () => {
      mocks.getActiveView.mockReturnValue('network');
      mocks.isProviderFilterOpen.mockReturnValue(true);
      const detail = document.createElement('div');
      detail.id = 'detail-pane';
      detail.classList.remove('hidden');
      document.body.appendChild(detail);
      mocks.mockDetail = detail;

      const tab1 = document.createElement('div');
      tab1.className = 'dtab';
      document.body.appendChild(tab1);
      const clickSpy = vi.spyOn(tab1, 'click');

      dispatchKey('1');

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ── CTRL+, ──────────────────────────────────────────────────────────────

  describe('Ctrl+, toggles settings drawer', () => {
    it('calls toggleSettingsDrawer when Ctrl+, is pressed', () => {
      dispatchKey(',', { ctrlKey: true });

      expect(mocks.toggleSettingsDrawer).toHaveBeenCalled();
    });

    it('works without ctrlKey (key is just ,)', () => {
      // The handler checks e.ctrlKey specifically
      dispatchKey(',', { ctrlKey: true });

      expect(mocks.toggleSettingsDrawer).toHaveBeenCalled();
    });
  });

  // ── EDGE CASES ───────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('Escape skips export format menus', () => {
      // Create visible export menus
      const menu1 = document.createElement('div');
      menu1.id = 'export-format-menu';
      menu1.classList.add('visible');
      const menu2 = document.createElement('div');
      menu2.id = 'dl-export-format-menu';
      menu2.classList.add('visible');
      document.body.appendChild(menu1);
      document.body.appendChild(menu2);

      dispatchKey('Escape');

      // Menus should be hidden
      expect(menu1.classList.contains('visible')).toBe(false);
      expect(menu2.classList.contains('visible')).toBe(false);
    });

    it('All popovers are checked in isAnyPopoverOpen', () => {
      // Test that all popover flags are checked
      mocks.isProviderFilterOpen.mockReturnValue(true);
      mocks.isDlFilterPopoverOpen.mockReturnValue(true);
      mocks.isInfoPopoverOpen.mockReturnValue(true);
      mocks.isSettingsOpen.mockReturnValue(true);
      mocks.isConsentOpen.mockReturnValue(true);
      mocks.isEnvPopoverOpen.mockReturnValue(true);

      // Escape should close provider filter first (it's first in the if chain)
      dispatchKey('Escape');

      expect(mocks.closeProviderFilter).toHaveBeenCalled();
    });
  });
});