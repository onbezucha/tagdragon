// @vitest-environment jsdom
// ═════════════════════════════════════════════════════════════════════════════
// STATUS BAR DOM TESTS
// ═════════════════════════════════════════════════════════════════════════════
// Unit + component integration tests for status-bar.ts:
// - updateStatusBar, updateDlStatusBar, updateNetworkStatusBar
// - showPruneNotification, clearPruneTimer, resetStatusBar
// - initTimestampToggle (internal: updateMemoryIndicator)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AppConfig } from '@/shared/constants';
import type { DataLayerPush } from '@/types/datalayer';

// ─── MOCK COLLECTOR ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // ── format utils ────────────────────────────────────────────────────────────
  const formatBytes = vi.fn((bytes: number): string => {
    if (bytes === 0) return '0B';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  });

  // ── panel state ─────────────────────────────────────────────────────────────
  // _cfg initialized lazily (null) so it doesn't reference DEFAULT_CFG before
  // it is declared. Each beforeEach resets it to DEFAULT_CFG; per-test overrides
  // set it to a specific config object before initTimestampToggle is called.
  let _cfg: AppConfig | null = null;
  const getConfig = vi.fn((): Readonly<AppConfig> =>
    _cfg ? { ..._cfg } : { ...DEFAULT_CFG }
  );
  const getAllRequests = vi.fn(() => []);
  const getStats = vi.fn(() => ({ visibleCount: 0, totalSize: 0, totalDuration: 0 }));
  const updateConfig = vi.fn((_key: keyof AppConfig, value: AppConfig[keyof AppConfig]) => {
    if (_cfg) _cfg = { ..._cfg, [_key]: value };
  });

  // ── datalayer state ──────────────────────────────────────────────────────────
  const getAllDlPushes = vi.fn(() => []);
  const getDlVisibleCount = vi.fn(() => 0);
  const getDlTotalCount = vi.fn(() => 0);

  // ── provider breakdown ──────────────────────────────────────────────────────
  const renderProviderBreakdown = vi.fn();

  // ── DOM refs ────────────────────────────────────────────────────────────────
  let statusStats: HTMLElement | null = null;
  let sizeBadge: HTMLElement | null = null;
  let timeBadge: HTMLElement | null = null;
  let statusBar: HTMLElement | null = null;
  let memBarFill: HTMLElement | null = null;
  let memBarTopFill: HTMLElement | null = null;
  let memBar: HTMLElement | null = null;
  let memBarTop: HTMLElement | null = null;
  let btnTimestamp: HTMLElement | null = null;
  let timestampLabel: HTMLElement | null = null;
  let separators: HTMLElement[] = [];

  return {
    formatBytes,
    getConfig,
    getAllRequests,
    getStats,
    updateConfig,
    getAllDlPushes,
    getDlVisibleCount,
    getDlTotalCount,
    renderProviderBreakdown,
    // Mutable config — accessible for per-test overrides
    get _cfg() { return _cfg; },
    set _cfg(v: AppConfig) { _cfg = v; },
    // DOM getters (live refs to fixture elements)
    get statusStats() { return statusStats; },
    get sizeBadge() { return sizeBadge; },
    get timeBadge() { return timeBadge; },
    get statusBar() { return statusBar; },
    get memBarFill() { return memBarFill; },
    get memBarTopFill() { return memBarTopFill; },
    get memBar() { return memBar; },
    get memBarTop() { return memBarTop; },
    get btnTimestamp() { return btnTimestamp; },
    get timestampLabel() { return timestampLabel; },
    get separators() { return separators; },
    // Setters for re-setup in beforeEach
    set statusStats(v: HTMLElement | null) { statusStats = v; },
    set sizeBadge(v: HTMLElement | null) { sizeBadge = v; },
    set timeBadge(v: HTMLElement | null) { timeBadge = v; },
    set statusBar(v: HTMLElement | null) { statusBar = v; },
    set memBarFill(v: HTMLElement | null) { memBarFill = v; },
    set memBarTopFill(v: HTMLElement | null) { memBarTopFill = v; },
    set memBar(v: HTMLElement | null) { memBar = v; },
    set memBarTop(v: HTMLElement | null) { memBarTop = v; },
    set btnTimestamp(v: HTMLElement | null) { btnTimestamp = v; },
    set timestampLabel(v: HTMLElement | null) { timestampLabel = v; },
    set separators(v: HTMLElement[]) { separators = v; },
  };
});

// ─── DEFAULT CONFIG ────────────────────────────────────────────────────────────

const DEFAULT_CFG: AppConfig = {
  maxRequests: 500,
  autoPrune: true,
  pruneRatio: 0.75,
  sortOrder: 'asc',
  wrapValues: false,
  autoExpand: false,
  collapsedGroups: [],
  hiddenProviders: [],
  defaultTab: 'decoded',
  compactRows: false,
  showEmptyParams: false,
  timestampFormat: 'absolute',
  exportFormat: 'json',
  dlSortField: 'time',
  dlSortOrder: 'asc',
  dlGroupBySource: false,
  maxDlPushes: 1000,
  correlationWindowMs: 2000,
  sectionAccentBar: true,
  sectionDimOthers: true,
  sectionDimOpacity: 0.5,
};

// ─── MODULE MOCKS (static vi.mock at file scope) ────────────────────────────────

vi.mock('@/panel/utils/format', () => ({
  formatBytes: mocks.formatBytes,
}));

vi.mock('@/panel/state', () => ({
  getConfig: mocks.getConfig,
  getAllRequests: mocks.getAllRequests,
  getStats: mocks.getStats,
  updateConfig: mocks.updateConfig,
}));

vi.mock('@/panel/datalayer/state', () => ({
  getAllDlPushes: mocks.getAllDlPushes,
  getDlVisibleCount: mocks.getDlVisibleCount,
  getDlTotalCount: mocks.getDlTotalCount,
}));

vi.mock('@/panel/components/provider-breakdown', () => ({
  renderProviderBreakdown: mocks.renderProviderBreakdown,
}));

// ─── DYNAMIC IMPORT ────────────────────────────────────────────────────────────

let updateStatusBar: (visibleCount: number, totalSize: number, totalDuration: number) => void;
let updateDlStatusBar: () => void;
let updateNetworkStatusBar: () => void;
let showPruneNotification: (count: number) => void;
let clearPruneTimer: () => void;
let resetStatusBar: () => void;
let initTimestampToggle: () => void;

beforeEach(async () => {
  vi.resetModules();

  // Re-setup DOM mocks with live fixture element refs
  vi.doMock('@/panel/utils/dom', () => ({
    DOM: {
      get statusStats() { return mocks.statusStats; },
      get sizeBadge() { return mocks.sizeBadge; },
      get timeBadge() { return mocks.timeBadge; },
    },
    $: (id: string): HTMLElement | null => {
      if (id === 'status-bar') return mocks.statusBar;
      if (id === 'memory-bar') return mocks.memBar;
      if (id === 'memory-bar-top') return mocks.memBarTop;
      if (id === 'memory-bar-fill') return mocks.memBarFill;
      if (id === 'memory-bar-top-fill') return mocks.memBarTopFill;
      return null;
    },
  }));

  // Re-setup format mock
  vi.doMock('@/panel/utils/format', () => ({
    formatBytes: mocks.formatBytes,
  }));

  // Re-setup state mocks
  vi.doMock('@/panel/state', () => ({
    getConfig: mocks.getConfig,
    getAllRequests: mocks.getAllRequests,
    getStats: mocks.getStats,
    updateConfig: mocks.updateConfig,
  }));

  // Re-setup datalayer state mock
  vi.doMock('@/panel/datalayer/state', () => ({
    getAllDlPushes: mocks.getAllDlPushes,
    getDlVisibleCount: mocks.getDlVisibleCount,
    getDlTotalCount: mocks.getDlTotalCount,
  }));

  // Re-setup provider breakdown mock
  vi.doMock('@/panel/components/provider-breakdown', () => ({
    renderProviderBreakdown: mocks.renderProviderBreakdown,
  }));

  // Dynamic import
  const mod = await import('@/panel/components/status-bar');
  updateStatusBar = mod.updateStatusBar;
  updateDlStatusBar = mod.updateDlStatusBar;
  updateNetworkStatusBar = mod.updateNetworkStatusBar;
  showPruneNotification = mod.showPruneNotification;
  clearPruneTimer = mod.clearPruneTimer;
  resetStatusBar = mod.resetStatusBar;
  initTimestampToggle = mod.initTimestampToggle;
});

// ─── DOM FIXTURE HELPERS ────────────────────────────────────────────────────────

function createFixture(): void {
  // Main status bar
  const bar = document.createElement('div');
  bar.id = 'status-bar';

  const stats = document.createElement('span');
  stats.id = 'status-stats';
  stats.textContent = '0 requests';
  bar.appendChild(stats);

  const sizeB = document.createElement('span');
  sizeB.id = 'size-badge';
  const sizeLabel = document.createElement('span');
  sizeLabel.className = 'status-label';
  sizeLabel.textContent = 'Size:';
  const sizeVal = document.createElement('span');
  sizeVal.className = 'value';
  sizeVal.textContent = '0B';
  sizeB.appendChild(sizeLabel);
  sizeB.appendChild(sizeVal);
  bar.appendChild(sizeB);

  const timeB = document.createElement('span');
  timeB.id = 'time-badge';
  const timeLabel = document.createElement('span');
  timeLabel.className = 'status-label';
  timeLabel.textContent = 'Avg:';
  const timeVal = document.createElement('span');
  timeVal.className = 'value';
  timeVal.textContent = '—';
  timeB.appendChild(timeLabel);
  timeB.appendChild(timeVal);
  bar.appendChild(timeB);

  // General separator
  const sep1 = document.createElement('span');
  sep1.className = 'status-separator';
  sep1.textContent = '·';
  bar.appendChild(sep1);

  // Timestamp separator
  const tsSep = document.createElement('span');
  tsSep.className = 'status-separator';
  tsSep.id = 'timestamp-separator';
  tsSep.textContent = '·';
  bar.appendChild(tsSep);

  // Timestamp toggle button
  const tsBtn = document.createElement('button');
  tsBtn.id = 'btn-timestamp-format';
  const tsLbl = document.createElement('span');
  tsLbl.id = 'timestamp-format-label';
  tsLbl.textContent = 'Abs';
  tsBtn.appendChild(tsLbl);
  bar.appendChild(tsBtn);

  // Hint
  const hint = document.createElement('span');
  hint.className = 'status-hint';
  hint.textContent = 'Backspace to clear';
  bar.appendChild(hint);

  document.body.appendChild(bar);

  // Bottom memory bar
  const memBar = document.createElement('div');
  memBar.id = 'memory-bar';
  const memFill = document.createElement('div');
  memFill.id = 'memory-bar-fill';
  memBar.appendChild(memFill);
  document.body.appendChild(memBar);

  // Top memory bar
  const memBarTop = document.createElement('div');
  memBarTop.id = 'memory-bar-top';
  const memFillTop = document.createElement('div');
  memFillTop.id = 'memory-bar-top-fill';
  memBarTop.appendChild(memFillTop);
  document.body.appendChild(memBarTop);

  // Wire up mock refs
  mocks.statusBar = bar;
  mocks.statusStats = stats;
  mocks.sizeBadge = sizeB;
  mocks.timeBadge = timeB;
  mocks.memBar = memBar;
  mocks.memBarFill = memFill;
  mocks.memBarTop = memBarTop;
  mocks.memBarTopFill = memFillTop;
  mocks.btnTimestamp = tsBtn;
  mocks.timestampLabel = tsLbl;
  mocks.separators = [sep1, tsSep];
}

function resetFixture(): void {
  document.body.innerHTML = '';
  mocks.statusBar = null;
  mocks.statusStats = null;
  mocks.sizeBadge = null;
  mocks.timeBadge = null;
  mocks.memBar = null;
  mocks.memBarFill = null;
  mocks.memBarTop = null;
  mocks.memBarTopFill = null;
  mocks.btnTimestamp = null;
  mocks.timestampLabel = null;
  mocks.separators = [];
}

// ─── TEST HELPERS ─────────────────────────────────────────────────────────────

function makeDlPush(data: Record<string, unknown> = {}): DataLayerPush {
  return {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    source: 'script' as const,
    event: data.event as string | undefined,
    data,
    _ecommerceType: data._ecommerceType as string | undefined,
  } as DataLayerPush;
}

function makeRequest(): { id: string; provider: string; color: string } {
  return { id: '1', provider: 'Google Analytics', color: '#4285f4' };
}

// ─── TEST SETUP / TEARDOWN ─────────────────────────────────────────────────────

describe('status-bar component', () => {
  beforeEach(() => {
    createFixture();

    // Reset mutable config + all mock return values / call counts
    mocks._cfg = { ...DEFAULT_CFG };
    mocks.formatBytes.mockImplementation((bytes: number): string => {
      if (bytes === 0) return '0B';
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    });
    mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));
    mocks.getAllRequests.mockReturnValue([]);
    mocks.getStats.mockReturnValue({ visibleCount: 0, totalSize: 0, totalDuration: 0 });
    mocks.updateConfig.mockClear();
    mocks.updateConfig.mockImplementation((_key: keyof AppConfig, value: AppConfig[keyof AppConfig]) => {
      mocks._cfg = { ...mocks._cfg, [_key]: value };
    });
    mocks.getAllDlPushes.mockReturnValue([]);
    mocks.getDlVisibleCount.mockReturnValue(0);
    mocks.getDlTotalCount.mockReturnValue(0);
    mocks.renderProviderBreakdown.mockClear();
  });

  afterEach(() => {
    resetFixture();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE STATUS BAR (NETWORK)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateStatusBar', () => {
    // ── 1. zobrazí "N requests" když visibleCount === total ─────────────────

    it('zobrazí "N requests" když visibleCount === total', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest(), makeRequest(), makeRequest()]);

      updateStatusBar(3, 0, 0);

      expect(mocks.statusStats?.textContent).toBe('3 requests');
    });

    // ── 2. zobrazí "Showing X of Y" když visibleCount !== total ─────────────

    it('zobrazí "Showing X of Y" když visibleCount !== total', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest(), makeRequest(), makeRequest()]);

      updateStatusBar(1, 0, 0);

      expect(mocks.statusStats?.textContent).toBe('Showing 1 of 3');
    });

    // ── 3. zobrazí formátovanou size (formatBytes) v .value child ────────────

    it('zobrazí formátovanou size (formatBytes) v .value child', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest()]);

      updateStatusBar(1, 1024 * 1024, 0);

      const sizeVal = mocks.sizeBadge?.querySelector('.value');
      expect(sizeVal?.textContent).toBe('1.0MB');
      expect(mocks.formatBytes).toHaveBeenCalledWith(1024 * 1024);
    });

    // ── 4. zobrazí průměrný čas s ms příponou v .value child ────────────────

    it('zobrazí průměrný čas s ms příponou v .value child', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest()]);

      updateStatusBar(2, 0, 300);

      const timeVal = mocks.timeBadge?.querySelector('.value');
      expect(timeVal?.textContent).toBe('150ms');
    });

    // ── 5. zobrazí — pro nulový avg time ────────────────────────────────────

    it('zobrazí — pro nulový avg time', () => {
      mocks.getAllRequests.mockReturnValue([]);

      updateStatusBar(0, 0, 0);

      const timeVal = mocks.timeBadge?.querySelector('.value');
      expect(timeVal?.textContent).toBe('—');
    });

    // ── 6. zavolá renderProviderBreakdown ───────────────────────────────────

    it('zavolá renderProviderBreakdown', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest()]);

      updateStatusBar(1, 0, 0);

      expect(mocks.renderProviderBreakdown).toHaveBeenCalledTimes(1);
    });

    // ── 7. zavolá updateMemoryIndicator (barva + fill) ──────────────────────

    it('zavolá updateMemoryIndicator (nastaví barvu + memory bar fill)', () => {
      mocks.getAllRequests.mockReturnValue([makeRequest()]);

      updateStatusBar(1, 0, 0);

      // Memory bar fill should be set based on usage (1/500 = 0.2%)
      expect(mocks.memBarFill?.style.width).toBe('0.2%');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE DL STATUS BAR (DATALAYER)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('updateDlStatusBar', () => {
    // ── 8. zobrazí "N pushes" když visible === total ────────────────────────

    it('zobrazí "N pushes" když visible === total', () => {
      mocks.getDlTotalCount.mockReturnValue(5);
      mocks.getDlVisibleCount.mockReturnValue(5);
      mocks.getAllDlPushes.mockReturnValue([]);

      updateDlStatusBar();

      expect(mocks.statusStats?.textContent).toBe('5 pushes');
    });

    // ── 9. zobrazí "Showing X of Y pushes" při rozdílu ─────────────────────

    it('zobrazí "Showing X of Y pushes" při rozdílu', () => {
      mocks.getDlTotalCount.mockReturnValue(10);
      mocks.getDlVisibleCount.mockReturnValue(3);
      mocks.getAllDlPushes.mockReturnValue([]);

      updateDlStatusBar();

      expect(mocks.statusStats?.textContent).toBe('Showing 3 of 10 pushes');
    });

    // ── 10. přidá e-commerce count když > 0 (" · N e-commerce") ──────────────

    it('přidá e-commerce count když > 0 (" · N e-commerce")', () => {
      mocks.getDlTotalCount.mockReturnValue(2);
      mocks.getDlVisibleCount.mockReturnValue(2);
      mocks.getAllDlPushes.mockReturnValue([
        makeDlPush({ event: 'pageview' }),
        makeDlPush({ event: 'purchase', _ecommerceType: 'enhanced ecommerce' }),
      ]);

      updateDlStatusBar();

      expect(mocks.statusStats?.textContent).toBe('2 pushes · 1 e-commerce');
    });

    // ── 11. skryje size a time badges (display=none) ─────────────────────────

    it('skryje size a time badges (display=none)', () => {
      mocks.getDlTotalCount.mockReturnValue(0);
      mocks.getDlVisibleCount.mockReturnValue(0);
      mocks.getAllDlPushes.mockReturnValue([]);

      updateDlStatusBar();

      expect(mocks.sizeBadge?.style.display).toBe('none');
      expect(mocks.timeBadge?.style.display).toBe('none');
    });

    // ── 12. skryje status separátory kromě timestamp-separator ────────────────

    it('skryje status separátory kromě timestamp-separator', () => {
      mocks.getDlTotalCount.mockReturnValue(0);
      mocks.getDlVisibleCount.mockReturnValue(0);
      mocks.getAllDlPushes.mockReturnValue([]);

      updateDlStatusBar();

      // First separator (general) should be hidden
      expect(mocks.separators[0]?.style.display).toBe('none');
      // Timestamp separator should be visible
      expect(mocks.separators[1]?.style.display).toBe('');
    });

    // ── 13. vyčistí memory warning barvu ($bar.style.color = "") ─────────────

    it('vyčistí memory warning barvu ($bar.style.color = "")', () => {
      // Set initial color
      if (mocks.statusBar) mocks.statusBar.style.color = 'var(--orange)';
      mocks.getDlTotalCount.mockReturnValue(0);
      mocks.getDlVisibleCount.mockReturnValue(0);
      mocks.getAllDlPushes.mockReturnValue([]);

      updateDlStatusBar();

      expect(mocks.statusBar?.style.color).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE NETWORK STATUS BAR (RESTORE)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('updateNetworkStatusBar', () => {
    // ── 14. obnoví visibility size badge (display = "") ─────────────────────

    it('obnoví visibility size badge (display = "")', () => {
      // Precondition: size badge is hidden from DL view
      if (mocks.sizeBadge) mocks.sizeBadge.style.display = 'none';

      updateNetworkStatusBar();

      expect(mocks.sizeBadge?.style.display).toBe('');
    });

    // ── 15. obnoví visibility time badge (display = "") ─────────────────────

    it('obnoví visibility time badge (display = "")', () => {
      // Precondition: time badge is hidden from DL view
      if (mocks.timeBadge) mocks.timeBadge.style.display = 'none';

      updateNetworkStatusBar();

      expect(mocks.timeBadge?.style.display).toBe('');
    });

    // ── 16. obnoví visibility separátorů ────────────────────────────────────

    it('obnoví visibility separátorů', () => {
      // Precondition: all separators are hidden from DL view
      mocks.separators.forEach((s) => { s.style.display = 'none'; });

      updateNetworkStatusBar();

      mocks.separators.forEach((s) => {
        expect(s.style.display).toBe('');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEMORY INDICATOR (BOTTOM BAR)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('updateMemoryIndicator (bottom bar)', () => {
    // ── 17. normal barva (empty) když usage < 80% ────────────────────────────

    it('normal barva (empty) když usage < 80%', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 300 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(300, 0, 0);

      expect(mocks.statusBar?.style.color).toBe('');
    });

    // ── 18. orange barva (var(--orange)) když usage > 80% ───────────────────
    // Threshold is STRICTLY > 0.8, so 401/500 = 0.802 triggers orange

    it('orange barva (var(--orange)) když usage > 80%', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 401 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(401, 0, 0);

      expect(mocks.statusBar?.style.color).toBe('var(--orange)');
    });

    // ── 19. red barva (var(--red)) když usage > 95% ─────────────────────────

    it('red barva (var(--red)) když usage > 95%', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 480 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(480, 0, 0);

      expect(mocks.statusBar?.style.color).toBe('var(--red)');
    });

    // ── 20. nastaví memory-bar-fill width v % ───────────────────────────────

    it('nastaví memory-bar-fill width v %', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 250 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(250, 0, 0);

      expect(mocks.memBarFill?.style.width).toBe('50%');
    });

    // ── 21. přidá .warning pro 80-95% ───────────────────────────────────────

    it('přidá .warning pro 80-95% (bottom bar)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 450 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(450, 0, 0);

      expect(mocks.memBarFill?.classList.contains('warning')).toBe(true);
      expect(mocks.memBarFill?.classList.contains('critical')).toBe(false);
    });

    // ── 22. přidá .critical pro > 95% ───────────────────────────────────────

    it('přidá .critical pro > 95% (bottom bar)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 480 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(480, 0, 0);

      expect(mocks.memBarFill?.classList.contains('critical')).toBe(true);
      expect(mocks.memBarFill?.classList.contains('warning')).toBe(false);
    });

    // ── 23. nedělá nic když maxRequests = 0 ────────────────────────────────

    it('nedělá nic když maxRequests = 0', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 0 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 100 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(100, 0, 0);

      expect(mocks.memBarFill?.style.width).toBe('');
      expect(mocks.statusBar?.style.color).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEMORY INDICATOR (TOP BAR)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('updateMemoryIndicator (top bar)', () => {
    // ── 24. nastaví memory-bar-top-fill width v % (same as bottom) ───────────

    it('nastaví memory-bar-top-fill width v % (same as bottom)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 250 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(250, 0, 0);

      expect(mocks.memBarTopFill?.style.width).toBe('50%');
    });

    // ── 25. přidá .warning pro > 60-95% (DIFFERENT threshold!) ───────────────
    // Threshold is STRICTLY > 0.6, so 301/500 = 60.2% triggers warning on top bar

    it('přidá .warning pro > 60-95% (different threshold — top bar uses 60%)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      // 301 requests = 60.2% — triggers warning on top bar but NOT on bottom bar
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 301 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(301, 0, 0);

      // Top bar: 60.2% > 60% threshold → warning
      expect(mocks.memBarTopFill?.classList.contains('warning')).toBe(true);
      // Bottom bar: 60.2% (< 80% threshold) → no warning
      expect(mocks.memBarFill?.classList.contains('warning')).toBe(false);
    });

    // ── 26. přidá .critical pro > 95% ───────────────────────────────────────

    it('přidá .critical pro > 95% (top bar)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 500 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 480 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(480, 0, 0);

      expect(mocks.memBarTopFill?.classList.contains('critical')).toBe(true);
      expect(mocks.memBarTopFill?.classList.contains('warning')).toBe(false);
    });

    // ── 27. nedělá nic když maxRequests = 0 ────────────────────────────────

    it('nedělá nic když maxRequests = 0 (top bar)', () => {
      mocks.getConfig.mockImplementation(() => ({ ...DEFAULT_CFG, maxRequests: 0 }));
      mocks.getAllRequests.mockReturnValue(
        Array.from({ length: 100 }, (_, i) => ({ ...makeRequest(), id: String(i) }))
      );

      updateStatusBar(100, 0, 0);

      expect(mocks.memBarTopFill?.style.width).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRUNE NOTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('showPruneNotification', () => {
    // ── 28. nastaví text s "(N oldest removed)" ─────────────────────────────

    it('nastaví text s "(N oldest removed)"', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest(), makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 2, totalSize: 0, totalDuration: 0 });

      showPruneNotification(10);

      vi.advanceTimersByTime(0);

      expect(mocks.statusStats?.textContent).toContain('(10 oldest removed)');
      vi.useRealTimers();
    });

    // ── 29. nastaví orange barvu na status bar ──────────────────────────────

    it('nastaví orange barvu na status bar', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      showPruneNotification(5);

      expect(mocks.statusBar?.style.color).toBe('var(--orange)');
      vi.useRealTimers();
    });

    // ── 30. nastaví opacity transition a fade out/in ─────────────────────────
    // With sync mocked rAF, opacity is set back to '1' immediately inside the
    // callback. We verify the transition style was set and opacity was restored.

    it('nastaví opacity transition a fade out/in', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      showPruneNotification(5);

      // Transition style should be set
      expect(mocks.statusStats?.style.transition).toBe('opacity 200ms ease');
      // With sync rAF mock, opacity is restored to '1' inside the callback
      expect(mocks.statusStats?.style.opacity).toBe('1');
      vi.useRealTimers();
    });

    // ── 31. obnoví text po 3 sekundách (setTimeout) ─────────────────────────

    it('obnoví text po 3 sekundách (setTimeout)', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest(), makeRequest(), makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 3, totalSize: 2048, totalDuration: 300 });
      mocks.formatBytes.mockReturnValue('2.0KB');

      showPruneNotification(7);

      // Fast-forward past the 3-second timeout
      vi.advanceTimersByTime(3200);

      // Should have restored text via updateStatusBar
      expect(mocks.statusStats?.textContent).toBe('3 requests');
      expect(mocks.statusBar?.style.color).toBe('');
      vi.useRealTimers();
    });

    // ── 32. zruší předchozí timer při dalším prune ───────────────────────────

    it('zruší předchozí timer při dalším prune', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      // First prune
      showPruneNotification(5);

      // Second prune before 3s
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

      showPruneNotification(10);

      expect(clearSpy).toHaveBeenCalled();

      // Advance past both timers
      vi.advanceTimersByTime(3200);

      vi.useRealTimers();
    });

    // ── 33. vyčistí timer přes clearPruneTimer ─────────────────────────────

    it('vyčistí timer přes clearPruneTimer', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      showPruneNotification(5);

      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      clearPruneTimer();

      expect(clearSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TIMESTAMP TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('initTimestampToggle', () => {
    // ── 34. cyklí absolute → relative → elapsed → absolute ───────────────────
    // Uses mutable _cfg so that updateConfig modifies the same object getConfig reads.

    it('cyklí absolute → relative → elapsed → absolute', () => {
      // Start: absolute — override config via mutable ref
      mocks._cfg = { ...DEFAULT_CFG, timestampFormat: 'absolute' as const };
      mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));
      initTimestampToggle();

      mocks.btnTimestamp?.click();
      expect(mocks.timestampLabel?.textContent).toBe('Rel');
      expect(mocks._cfg.timestampFormat).toBe('relative');
      expect(mocks.updateConfig).toHaveBeenCalledWith('timestampFormat', 'relative');

      mocks.btnTimestamp?.click();
      expect(mocks.timestampLabel?.textContent).toBe('Elap');
      expect(mocks._cfg.timestampFormat).toBe('elapsed');
      expect(mocks.updateConfig).toHaveBeenCalledWith('timestampFormat', 'elapsed');

      mocks.btnTimestamp?.click();
      expect(mocks.timestampLabel?.textContent).toBe('Abs');
      expect(mocks._cfg.timestampFormat).toBe('absolute');
      expect(mocks.updateConfig).toHaveBeenCalledWith('timestampFormat', 'absolute');
    });

    // ── 35. zobrazí "Abs" label pro absolute ─────────────────────────────────

    it('zobrazí "Abs" label pro absolute', () => {
      mocks._cfg = { ...DEFAULT_CFG, timestampFormat: 'absolute' as const };
      mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));

      initTimestampToggle();

      expect(mocks.timestampLabel?.textContent).toBe('Abs');
    });

    // ── 36. zobrazí "Rel" label pro relative ─────────────────────────────────

    it('zobrazí "Rel" label pro relative', () => {
      mocks._cfg = { ...DEFAULT_CFG, timestampFormat: 'relative' as const };
      mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));

      initTimestampToggle();

      expect(mocks.timestampLabel?.textContent).toBe('Rel');
    });

    // ── 37. zobrazí "Elap" label pro elapsed ────────────────────────────────

    it('zobrazí "Elap" label pro elapsed', () => {
      mocks._cfg = { ...DEFAULT_CFG, timestampFormat: 'elapsed' as const };
      mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));

      initTimestampToggle();

      expect(mocks.timestampLabel?.textContent).toBe('Elap');
    });

    // ── 38. persistuje format přes updateConfig ───────────────────────────────

    it('persistuje format přes updateConfig', () => {
      mocks._cfg = { ...DEFAULT_CFG, timestampFormat: 'absolute' as const };
      mocks.getConfig.mockImplementation((): Readonly<AppConfig> => ({ ...mocks._cfg }));
      initTimestampToggle();

      mocks.btnTimestamp?.click();

      expect(mocks.updateConfig).toHaveBeenCalledWith('timestampFormat', 'relative');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET STATUS BAR
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('resetStatusBar', () => {
    // ── 39. zobrazí "0 requests" ─────────────────────────────────────────────

    it('zobrazí "0 requests"', () => {
      // Precondition: change stats text
      if (mocks.statusStats) mocks.statusStats.textContent = '100 requests';
      mocks.getAllRequests.mockReturnValue([]);

      resetStatusBar();

      expect(mocks.statusStats?.textContent).toBe('0 requests');
    });

    // ── 40. reset size na "0B" + display="" ─────────────────────────────────

    it('reset size na "0B" + display=""', () => {
      // Precondition: change size value
      if (mocks.sizeBadge) {
        const sizeVal = mocks.sizeBadge.querySelector('.value');
        if (sizeVal) sizeVal.textContent = '99.9MB';
        mocks.sizeBadge.style.display = 'none';
      }

      resetStatusBar();

      const sizeVal = mocks.sizeBadge?.querySelector('.value');
      expect(sizeVal?.textContent).toBe('0B');
      expect(mocks.sizeBadge?.style.display).toBe('');
    });

    // ── 41. reset time na "—" + display="" ──────────────────────────────────

    it('reset time na "—" + display=""', () => {
      // Precondition: change time value
      if (mocks.timeBadge) {
        const timeVal = mocks.timeBadge.querySelector('.value');
        if (timeVal) timeVal.textContent = '500ms';
        mocks.timeBadge.style.display = 'none';
      }

      resetStatusBar();

      const timeVal = mocks.timeBadge?.querySelector('.value');
      expect(timeVal?.textContent).toBe('—');
      expect(mocks.timeBadge?.style.display).toBe('');
    });

    // ── 42. reset bottom memory bar na 0% + remove .warning/.critical ──────

    it('reset bottom memory bar na 0% + remove .warning/.critical', () => {
      // Precondition: set memory bar to non-zero with warning class
      if (mocks.memBarFill) {
        mocks.memBarFill.style.width = '85%';
        mocks.memBarFill.classList.add('warning');
        mocks.memBarFill.classList.add('critical');
      }

      resetStatusBar();

      expect(mocks.memBarFill?.style.width).toBe('0%');
      expect(mocks.memBarFill?.classList.contains('warning')).toBe(false);
      expect(mocks.memBarFill?.classList.contains('critical')).toBe(false);
    });

    // ── 43. reset top memory bar na 0% + remove .warning/.critical ───────────

    it('reset top memory bar na 0% + remove .warning/.critical', () => {
      // Precondition: set top memory bar to non-zero with warning class
      if (mocks.memBarTopFill) {
        mocks.memBarTopFill.style.width = '65%';
        mocks.memBarTopFill.classList.add('warning');
        mocks.memBarTopFill.classList.add('critical');
      }

      resetStatusBar();

      expect(mocks.memBarTopFill?.style.width).toBe('0%');
      expect(mocks.memBarTopFill?.classList.contains('warning')).toBe(false);
      expect(mocks.memBarTopFill?.classList.contains('critical')).toBe(false);
    });

    // ── 44. obnoví visibility všech elementů (display = "") ─────────────────

    it('obnoví visibility všech elementů (display = "")', () => {
      // Precondition: hide all separators
      mocks.separators.forEach((s) => { s.style.display = 'none'; });

      resetStatusBar();

      mocks.separators.forEach((s) => {
        expect(s.style.display).toBe('');
      });
    });

    // ── 45. vyčistí prune timer ─────────────────────────────────────────────

    it('vyčistí prune timer', () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      mocks.getAllRequests.mockReturnValue([makeRequest()]);
      mocks.getStats.mockReturnValue({ visibleCount: 1, totalSize: 0, totalDuration: 0 });

      showPruneNotification(5);

      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

      resetStatusBar();

      expect(clearSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
