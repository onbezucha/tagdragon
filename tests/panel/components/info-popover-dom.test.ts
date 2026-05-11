// @vitest-environment jsdom
// ─── INFO POPOVER DOM TESTS ───────────────────────────────────────────────────
// Unit tests for info-popover component: initInfoPopover, closeInfoPopover,
// isOpen, accordion behavior, search filtering, and section rendering.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ParsedRequest } from '@/types/request';
import type { AppConfig } from '@/shared/constants';

// ─── MOCK COLLECTOR ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // ── format utils ──────────────────────────────────────────────────────────
  const esc = vi.fn((str: unknown) => String(str));

  // ── panel state ───────────────────────────────────────────────────────────
  const getAllRequests = vi.fn(() => [] as ParsedRequest[]);
  const getActiveProviders = vi.fn(() => new Set<string>());

  // ── datalayer state ────────────────────────────────────────────────────────
  const getDlTotalCount = vi.fn(() => 0);

  // ── popover manager ────────────────────────────────────────────────────────
  const registerPopover = vi.fn();
  const closeAllPopovers = vi.fn();

  // ── DOM refs ───────────────────────────────────────────────────────────────
  let mockInfoPopover: HTMLElement | null = null;
  let mockBtnInfo: HTMLElement | null = null;
  let mockInfoProviderGroups: HTMLElement | null = null;

  // ── lucide createIcons ─────────────────────────────────────────────────────
  const createIcons = vi.fn();

  return {
    esc,
    getAllRequests,
    getActiveProviders,
    getDlTotalCount,
    registerPopover,
    closeAllPopovers,
    createIcons,
    get mockInfoPopover() { return mockInfoPopover; },
    set mockInfoPopover(v: HTMLElement | null) { mockInfoPopover = v; },
    get mockBtnInfo() { return mockBtnInfo; },
    set mockBtnInfo(v: HTMLElement | null) { mockBtnInfo = v; },
    get mockInfoProviderGroups() { return mockInfoProviderGroups; },
    set mockInfoProviderGroups(v: HTMLElement | null) { mockInfoProviderGroups = v; },
  };
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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

// ─── MODULE MOCKS (static) ────────────────────────────────────────────────────

vi.mock('@/panel/utils/format', () => ({
  esc: mocks.esc,
}));

vi.mock('@/panel/state', () => ({
  getAllRequests: mocks.getAllRequests,
  getActiveProviders: mocks.getActiveProviders,
}));

vi.mock('@/panel/datalayer/state', () => ({
  getDlTotalCount: mocks.getDlTotalCount,
}));

vi.mock('@/panel/utils/popover-manager', () => ({
  registerPopover: mocks.registerPopover,
  closeAllPopovers: mocks.closeAllPopovers,
}));

vi.mock('@/panel/utils/dom', () => ({
  DOM: {
    get infoPopover() { return mocks.mockInfoPopover; },
    get btnInfo() { return mocks.mockBtnInfo; },
    get infoProviderGroups() { return mocks.mockInfoProviderGroups; },
  },
}));

vi.mock('lucide', () => ({
  createIcons: mocks.createIcons,
  // Provide stub icon references so createIcons() destructuring doesn't fail
  // Keep in sync with src/panel/utils/lucide-icons.ts
  Cable: vi.fn(),
  Database: vi.fn(),
  Eraser: vi.fn(),
  Cookie: vi.fn(),
  Sun: vi.fn(),
  Moon: vi.fn(),
  Trash2: vi.fn(),
  Settings: vi.fn(),
  CircleHelp: vi.fn(),
  Search: vi.fn(),
  ArrowUpDown: vi.fn(),
  WrapText: vi.fn(),
  Maximize2: vi.fn(),
  AlignJustify: vi.fn(),
  Filter: vi.fn(),
  Download: vi.fn(),
  Pause: vi.fn(),
  Play: vi.fn(),
  ChevronDown: vi.fn(),
  X: vi.fn(),
  SlidersHorizontal: vi.fn(),
  ShoppingCart: vi.fn(),
  CheckCircle: vi.fn(),
  Upload: vi.fn(),
  EyeOff: vi.fn(),
}));

// ─── DYNAMIC IMPORT ───────────────────────────────────────────────────────────

let initInfoPopover: () => void;
let closeInfoPopover: () => void;
let isOpen: () => boolean;

beforeEach(async () => {
  vi.resetModules();

  // Re-setup DOM mocks
  vi.doMock('@/panel/utils/dom', () => ({
    DOM: {
      get infoPopover() { return mocks.mockInfoPopover; },
      get btnInfo() { return mocks.mockBtnInfo; },
      get infoProviderGroups() { return mocks.mockInfoProviderGroups; },
    },
  }));

  // Re-setup format mocks
  vi.doMock('@/panel/utils/format', () => ({
    esc: mocks.esc,
  }));

  // Re-setup state mocks
  vi.doMock('@/panel/state', () => ({
    getAllRequests: mocks.getAllRequests,
    getActiveProviders: mocks.getActiveProviders,
  }));

  // Re-setup datalayer state mocks
  vi.doMock('@/panel/datalayer/state', () => ({
    getDlTotalCount: mocks.getDlTotalCount,
  }));

  // Re-setup popover manager mocks
  vi.doMock('@/panel/utils/popover-manager', () => ({
    registerPopover: mocks.registerPopover,
    closeAllPopovers: mocks.closeAllPopovers,
  }));

  // Re-setup lucide mock
  vi.doMock('lucide', () => ({
    createIcons: mocks.createIcons,
    Cable: vi.fn(),
    Database: vi.fn(),
    Eraser: vi.fn(),
    Cookie: vi.fn(),
    Sun: vi.fn(),
    Moon: vi.fn(),
    Trash2: vi.fn(),
    Settings: vi.fn(),
    CircleHelp: vi.fn(),
    Search: vi.fn(),
    ArrowUpDown: vi.fn(),
    WrapText: vi.fn(),
    Maximize2: vi.fn(),
    AlignJustify: vi.fn(),
    Filter: vi.fn(),
    Download: vi.fn(),
    Pause: vi.fn(),
    Play: vi.fn(),
    ChevronDown: vi.fn(),
    X: vi.fn(),
    SlidersHorizontal: vi.fn(),
    ShoppingCart: vi.fn(),
    CheckCircle: vi.fn(),
    Upload: vi.fn(),
    EyeOff: vi.fn(),
  }));

  // Dynamic import
  const mod = await import('@/panel/components/info-popover');
  initInfoPopover = mod.initInfoPopover;
  closeInfoPopover = mod.closeInfoPopover;
  isOpen = mod.isOpen;
});

// ─── TEST SETUP / TEARDOWN ─────────────────────────────────────────────────────

function createFixture(): void {
  // Create the info popover DOM fixture
  const popover = document.createElement('div');
  popover.id = 'info-popover';
  popover.innerHTML = `
    <div class="info-header">
      <span class="info-title">TagDragon</span>
      <span class="info-version" id="info-version"></span>
    </div>
    <div class="info-description" id="info-description">
      <span id="info-provider-count">59</span>
      <span id="info-category-count">9</span>
    </div>
    <div id="info-session-stats">
      <span id="info-stat-requests">0</span>
      <span id="info-stat-providers">0</span>
      <span id="info-stat-dl">0</span>
      <div id="info-stats-top"></div>
    </div>
    <div class="info-section">
      <button class="info-section-header" aria-expanded="true">🆕 What's New</button>
      <div class="info-section-content"><div id="info-whats-new"></div></div>
    </div>
    <div class="info-section">
      <button class="info-section-header" aria-expanded="false">📦 Supported platforms</button>
      <div class="info-section-content">
        <input type="text" id="info-search" />
        <button id="btn-info-search-clear" class="hidden">×</button>
        <div id="info-provider-groups"></div>
        <div id="info-no-results" class="hidden">No providers found.</div>
      </div>
    </div>
    <div class="info-section">
      <button class="info-section-header" aria-expanded="false">⌨️ Keyboard shortcuts</button>
      <div class="info-section-content"><div id="info-shortcuts-list"></div></div>
    </div>
    <div class="info-section">
      <button class="info-section-header" aria-expanded="false">📡 DataLayer sources</button>
      <div class="info-section-content"><div id="info-dl-sources"></div></div>
    </div>
    <div class="info-section">
      <button class="info-section-header" aria-expanded="false">🗂️ Toolbar icons</button>
      <div class="info-section-content"><div id="info-toolbar-icons"></div></div>
    </div>
  `;
  document.body.appendChild(popover);
  mocks.mockInfoPopover = popover;

  // The #info-provider-groups div lives inside the popover's Supported platforms section
  const infoProviderGroups = popover.querySelector<HTMLElement>('#info-provider-groups')!;
  mocks.mockInfoProviderGroups = infoProviderGroups;

  // Create the info button
  const btnInfo = document.createElement('button');
  btnInfo.id = 'btn-info';
  document.body.appendChild(btnInfo);
  mocks.mockBtnInfo = btnInfo;

  // Reset mock call counts and return values
  mocks.esc.mockImplementation((str: unknown) => String(str));
  mocks.getAllRequests.mockReturnValue([]);
  mocks.getActiveProviders.mockReturnValue(new Set<string>());
  mocks.getDlTotalCount.mockReturnValue(0);
  mocks.registerPopover.mockReturnValue(undefined);
  mocks.closeAllPopovers.mockReturnValue(undefined);
  mocks.createIcons.mockReturnValue(undefined);
}

describe('info-popover component', () => {
  beforeEach(() => {
    createFixture();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    mocks.mockInfoPopover = null;
    mocks.mockBtnInfo = null;
    mocks.mockInfoProviderGroups = null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initialization', () => {
    // ── 1. zobrazí TagDragon název a logo ─────────────────────────────────────

    it('zobrazí TagDragon název a logo', () => {
      initInfoPopover();

      const title = mocks.mockInfoPopover?.querySelector('.info-title');
      expect(title?.textContent).toBe('TagDragon');
    });

    // ── 2. zobrazí verzi z manifestu ────────────────────────────────────────

    it('zobrazí verzi z manifestu', () => {
      // Mock chrome.runtime.getManifest
      const manifest = { version: '1.7.0' };
      vi.stubGlobal('chrome', {
        runtime: {
          getManifest: () => manifest,
        },
      });

      initInfoPopover();

      const versionEl = document.getElementById('info-version');
      expect(versionEl?.textContent).toBe('v1.7.0');
    });

    // ── 3. zobrazí provider count ─────────────────────────────────────────────

    it('zobrazí provider count', () => {
      initInfoPopover();

      const countEl = document.getElementById('info-provider-count');
      // PROVIDERS.length = 59
      expect(countEl?.textContent).toBe('59');
    });

    // ── 4. zobrazí 5 collapsible sekcí ───────────────────────────────────────

    it('zobrazí 5 collapsible sekcí', () => {
      initInfoPopover();

      const sections = mocks.mockInfoPopover?.querySelectorAll('.info-section');
      expect(sections?.length).toBe(5);
    });

    // ── 5. expanduje sekci při kliknutí na header ───────────────────────────────

    it('expanduje sekci při kliknutí na header (aria-expanded toggle)', () => {
      initInfoPopover();

      // Get the Supported platforms section header (should be collapsed initially)
      const header = mocks.mockInfoPopover?.querySelectorAll('.info-section-header')[1] as HTMLButtonElement;
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      // Click to expand
      header?.click();

      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    // ── 6. collapse sekci při opakovaném kliknutí ────────────────────────────

    it('collapse sekci při opakovaném kliknutí', () => {
      initInfoPopover();

      // Get the What's New section header (should be expanded initially)
      const header = mocks.mockInfoPopover?.querySelectorAll('.info-section-header')[0] as HTMLButtonElement;
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      // Click to collapse
      header?.click();
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      // Click again to expand
      header?.click();
      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('section rendering', () => {
    // ── 7. vyrenderuje supported platforms seznam ────────────────────────────

    it('vyrenderuje supported platforms seznam', () => {
      initInfoPopover();

      // The #info-provider-groups div is nested inside the popover's Supported platforms section
      const container = mocks.mockInfoPopover?.querySelector('#info-provider-groups');
      expect(container).not.toBeNull();

      // Verify groups were rendered into it
      const groups = container?.querySelectorAll('.info-provider-group');
      expect(groups?.length).toBeGreaterThan(0);

      // Check that provider pills are rendered
      const pills = container?.querySelectorAll('.info-provider-pill');
      expect(pills?.length).toBeGreaterThan(0);
    });

    // ── 10. vyrenderuje keyboard shortcuts seznam ────────────────────────────

    it('vyrenderuje keyboard shortcuts seznam', () => {
      initInfoPopover();

      const shortcutsList = document.getElementById('info-shortcuts-list');
      expect(shortcutsList?.children.length).toBeGreaterThan(0);

      // Check that shortcut items are rendered
      const shortcuts = shortcutsList?.querySelectorAll('.info-shortcut');
      expect(shortcuts?.length).toBeGreaterThan(0);
    });

    // ── 11. vyrenderuje toolbar icons sekci ──────────────────────────────────

    it('vyrenderuje toolbar icons sekci', () => {
      initInfoPopover();

      const toolbarIcons = document.getElementById('info-toolbar-icons');
      expect(toolbarIcons?.children.length).toBeGreaterThan(0);

      // Check that icon items are rendered
      const iconItems = toolbarIcons?.querySelectorAll('.info-icons-item');
      expect(iconItems?.length).toBeGreaterThan(0);
    });

    // ── 12. zobrazí What's New sekci ────────────────────────────────────────

    it('zobrazí What\'s New sekci', () => {
      initInfoPopover();

      const whatsNew = document.getElementById('info-whats-new');
      expect(whatsNew?.children.length).toBeGreaterThan(0);

      // Check that version entries are rendered
      const versions = whatsNew?.querySelectorAll('.info-whats-new-version');
      expect(versions?.length).toBeGreaterThan(0);
    });

    // ── 13. zobrazí DataLayer sources sekci ─────────────────────────────────

    it('zobrazí DataLayer sources sekci', () => {
      initInfoPopover();

      const dlSources = document.getElementById('info-dl-sources');
      expect(dlSources?.children.length).toBeGreaterThan(0);

      // Check that source items are rendered
      const sources = dlSources?.querySelectorAll('.info-dl-source');
      expect(sources?.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH FILTERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search filtering', () => {
    // ── 8. vyfiltruje providers podle search input ──────────────────────────

    it('vyfiltruje providers podle search input', () => {
      initInfoPopover();

      const searchInput = document.getElementById('info-search') as HTMLInputElement;
      const clearBtn = document.getElementById('btn-info-search-clear');

      // Search for "ga4"
      searchInput.value = 'ga4';
      searchInput.dispatchEvent(new Event('input'));

      // Provider pills should be filtered - GA4 should be visible
      const providerPills = document.querySelectorAll<HTMLElement>('.info-provider-pill');
      const visiblePills = [...providerPills].filter(p => !p.classList.contains('hidden'));
      const ga4Pill = visiblePills.find(p => p.dataset.name?.toLowerCase().includes('ga4'));
      expect(ga4Pill).not.toBeUndefined();

      // Hidden pills should exist
      expect(visiblePills.length).toBeLessThan(providerPills.length);
    });

    // ── 9. zobrazí "No providers found" pro neexistující hledání ─────────────

    it('zobrazí "No providers found" pro neexistující hledání', () => {
      initInfoPopover();

      const searchInput = document.getElementById('info-search') as HTMLInputElement;
      const noResults = document.getElementById('info-no-results');

      // Search for non-existent provider
      searchInput.value = 'xyznonexistent123';
      searchInput.dispatchEvent(new Event('input'));

      // No results message should be visible
      expect(noResults?.classList.contains('hidden')).toBe(false);
    });

    // ── search clear button toggles hidden class ─────────────────────────────

    it('skryje clear button když je search prázdný', () => {
      initInfoPopover();

      const searchInput = document.getElementById('info-search') as HTMLInputElement;
      const clearBtn = document.getElementById('btn-info-search-clear') as HTMLButtonElement;

      // Initially clear button should be hidden
      expect(clearBtn?.classList.contains('hidden')).toBe(true);

      // Type something
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));

      // Clear button should be visible
      expect(clearBtn?.classList.contains('hidden')).toBe(false);
    });

    // ── clear button resets search ───────────────────────────────────────────

    it('clear button vyresetuje search', () => {
      initInfoPopover();

      const searchInput = document.getElementById('info-search') as HTMLInputElement;
      const clearBtn = document.getElementById('btn-info-search-clear') as HTMLButtonElement;

      // Type something
      searchInput.value = 'ga4';
      searchInput.dispatchEvent(new Event('input'));

      // Click clear
      clearBtn?.click();

      // Search should be cleared
      expect(searchInput?.value).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN / CLOSE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('open / close state', () => {
    // ── 14. closeInfoPopover zavře popover ───────────────────────────────────

    it('closeInfoPopover zavře popover', () => {
      initInfoPopover();

      // Open the popover by clicking the button
      mocks.mockBtnInfo?.click();

      // Popover should be open
      expect(isOpen()).toBe(true);

      // Close it
      closeInfoPopover();

      // Popover should be closed
      expect(isOpen()).toBe(false);
    });

    // ── 15. isOpen vrací správný stav ─────────────────────────────────────────

    it('isOpen vrací správný stav', () => {
      initInfoPopover();

      // Initially closed
      expect(isOpen()).toBe(false);

      // Open by clicking the button
      mocks.mockBtnInfo?.click();

      // Should be open
      expect(isOpen()).toBe(true);
    });

    // ── opens popover and calls renderSessionStats ───────────────────────────

    it('otevře popover a zavolá renderSessionStats', () => {
      mocks.getAllRequests.mockReturnValue([]);
      mocks.getActiveProviders.mockReturnValue(new Set<string>());
      mocks.getDlTotalCount.mockReturnValue(0);

      initInfoPopover();

      // Open the popover
      mocks.mockBtnInfo?.click();

      // Stats should be rendered with current state values
      const statRequests = document.getElementById('info-stat-requests');
      expect(statRequests?.textContent).toBe('0');
    });

    // ── registers with popover manager ───────────────────────────────────────

    it('zaregistruje popover přes registerPopover', () => {
      initInfoPopover();

      expect(mocks.registerPopover).toHaveBeenCalledWith('info', closeInfoPopover);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION STATS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('session stats', () => {
    // ── renders request count from state ───────────────────────────────────

    it('zobrazí počet requestů ze stavu', () => {
      const mockRequests: ParsedRequest[] = [
        {
          id: 1,
          provider: 'GA4',
          color: '#ff0000',
          url: 'https://www.google-analytics.com/g/collect',
          method: 'POST',
          status: 200,
          timestamp: '2024-01-01T14:30:00.000Z',
          duration: 150,
          size: 1024,
          allParams: {},
          decoded: {},
          postBody: null,
        },
        {
          id: 2,
          provider: 'GA4',
          color: '#ff0000',
          url: 'https://www.google-analytics.com/g/collect',
          method: 'POST',
          status: 200,
          timestamp: '2024-01-01T14:30:00.000Z',
          duration: 150,
          size: 1024,
          allParams: {},
          decoded: {},
          postBody: null,
        },
      ];
      mocks.getAllRequests.mockReturnValue(mockRequests);
      mocks.getActiveProviders.mockReturnValue(new Set(['GA4']));
      mocks.getDlTotalCount.mockReturnValue(5);

      initInfoPopover();

      // Open popover to trigger renderSessionStats
      mocks.mockBtnInfo?.click();

      const statRequests = document.getElementById('info-stat-requests');
      expect(statRequests?.textContent).toBe('2');
    });

    // ── renders provider count from state ──────────────────────────────────

    it('zobrazí počet providerů ze stavu', () => {
      mocks.getAllRequests.mockReturnValue([]);
      mocks.getActiveProviders.mockReturnValue(new Set(['GA4', 'Meta Pixel']));
      mocks.getDlTotalCount.mockReturnValue(0);

      initInfoPopover();
      mocks.mockBtnInfo?.click();

      const statProviders = document.getElementById('info-stat-providers');
      expect(statProviders?.textContent).toBe('2');
    });

    // ── renders DL push count from state ─────────────────────────────────────

    it('zobrazí DL push count ze stavu', () => {
      mocks.getAllRequests.mockReturnValue([]);
      mocks.getActiveProviders.mockReturnValue(new Set<string>());
      mocks.getDlTotalCount.mockReturnValue(42);

      initInfoPopover();
      mocks.mockBtnInfo?.click();

      const statDl = document.getElementById('info-stat-dl');
      expect(statDl?.textContent).toBe('42');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    // ── returns early when btn or popover is null ────────────────────────────

    it('vrátí se early když btnInfo nebo infoPopover je null', () => {
      mocks.mockBtnInfo = null;
      mocks.mockInfoPopover = null;

      // Should not throw
      expect(() => initInfoPopover()).not.toThrow();
    });

    // ── handles empty search gracefully ─────────────────────────────────────

    it('zpracuje prázdný search korektně', () => {
      initInfoPopover();

      const searchInput = document.getElementById('info-search') as HTMLInputElement;
      const noResults = document.getElementById('info-no-results');

      // Empty search should show no no-results message
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));

      expect(noResults?.classList.contains('hidden')).toBe(true);
    });

    // ── isOpen returns false when popover is null ────────────────────────────

    it('isOpen vrací false když popover je null', () => {
      mocks.mockInfoPopover = null;

      initInfoPopover();

      expect(isOpen()).toBe(false);
    });

    // ── accordions are clickable independently ────────────────────────────────

    it('accordiony jsou klikatelné nezávisle', () => {
      initInfoPopover();

      const headers = mocks.mockInfoPopover?.querySelectorAll('.info-section-header');

      // Click first header (What's New) to collapse
      (headers?.[0] as HTMLButtonElement)?.click();
      expect(headers?.[0]?.getAttribute('aria-expanded')).toBe('false');

      // Click second header (Supported platforms) to expand
      (headers?.[1] as HTMLButtonElement)?.click();
      expect(headers?.[1]?.getAttribute('aria-expanded')).toBe('true');

      // First should still be collapsed
      expect(headers?.[0]?.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
