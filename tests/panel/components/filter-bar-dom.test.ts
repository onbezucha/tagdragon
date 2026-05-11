// @vitest-environment jsdom
// ─── FILTER BAR DOM TESTS ─────────────────────────────────────────────────────
// Unit tests for updateActiveFilters: pill creation, remove actions, clear all

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── MOCK COLLECTOR ───────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // ── format utils ────────────────────────────────────────────────────────
  const esc = vi.fn((str: unknown) => String(str));

  // ── state module ─────────────────────────────────────────────────────────
  const getFilterText = vi.fn(() => '');
  const setFilterText = vi.fn();
  const getFilterEventType = vi.fn(() => '');
  const setFilterEventType = vi.fn();
  const getFilterStatus = vi.fn(() => '');
  const setFilterStatus = vi.fn();
  const getFilterMethod = vi.fn(() => '');
  const setFilterMethod = vi.fn();
  const getFilterUserId = vi.fn(() => '');
  const setFilterUserId = vi.fn();
  const getFilterHasParam = vi.fn(() => '');
  const setFilterHasParam = vi.fn();
  const getHiddenProviders = vi.fn(() => new Set<string>());
  const syncHiddenProviders = vi.fn();
  const resetFilters = vi.fn();

  // ── icon builder ──────────────────────────────────────────────────────────
  const getCachedIcon = vi.fn((_provider: string) => null);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  let mockActiveFilters: HTMLElement | null = null;
  let mockFilterInput: HTMLInputElement | null = null;
  let mockClearFilter: HTMLElement | null = null;
  let mockFilterBar: HTMLElement | null = null;

  // ── updateFilterBarVisibility (side effect) ───────────────────────────────
  const updateFilterBarVisibility = vi.fn();

  return {
    esc,
    getFilterText,
    setFilterText,
    getFilterEventType,
    setFilterEventType,
    getFilterStatus,
    setFilterStatus,
    getFilterMethod,
    setFilterMethod,
    getFilterUserId,
    setFilterUserId,
    getFilterHasParam,
    setFilterHasParam,
    getHiddenProviders,
    syncHiddenProviders,
    resetFilters,
    getCachedIcon,
    get mockActiveFilters() { return mockActiveFilters; },
    set mockActiveFilters(v: HTMLElement | null) { mockActiveFilters = v; },
    get mockFilterInput() { return mockFilterInput; },
    set mockFilterInput(v: HTMLInputElement | null) { mockFilterInput = v; },
    get mockClearFilter() { return mockClearFilter; },
    set mockClearFilter(v: HTMLElement | null) { mockClearFilter = v; },
    get mockFilterBar() { return mockFilterBar; },
    set mockFilterBar(v: HTMLElement | null) { mockFilterBar = v; },
    updateFilterBarVisibility,
  };
});

// ─── MODULE MOCKS (static) ────────────────────────────────────────────────────

vi.mock('@/panel/utils/format', () => ({
  esc: mocks.esc,
}));

vi.mock('@/panel/state', () => ({
  getFilterText: mocks.getFilterText,
  setFilterText: mocks.setFilterText,
  getFilterEventType: mocks.getFilterEventType,
  setFilterEventType: mocks.setFilterEventType,
  getFilterStatus: mocks.getFilterStatus,
  setFilterStatus: mocks.setFilterStatus,
  getFilterMethod: mocks.getFilterMethod,
  setFilterMethod: mocks.setFilterMethod,
  getFilterUserId: mocks.getFilterUserId,
  setFilterUserId: mocks.setFilterUserId,
  getFilterHasParam: mocks.getFilterHasParam,
  setFilterHasParam: mocks.setFilterHasParam,
  getHiddenProviders: mocks.getHiddenProviders,
  syncHiddenProviders: mocks.syncHiddenProviders,
  resetFilters: mocks.resetFilters,
}));

vi.mock('@/panel/utils/icon-builder', () => ({
  getCachedIcon: mocks.getCachedIcon,
}));

vi.mock('@/panel/components/provider-filter', () => ({
  updateFilterBarVisibility: mocks.updateFilterBarVisibility,
}));

vi.mock('@/panel/utils/dom', () => ({
  DOM: {
    get activeFilters() { return mocks.mockActiveFilters; },
    get filterInput() { return mocks.mockFilterInput; },
    get clearFilter() { return mocks.mockClearFilter; },
    get filterBar() { return mocks.mockFilterBar; },
  },
}));

// ─── DYNAMIC IMPORT ───────────────────────────────────────────────────────────

let updateActiveFilters: (applyFiltersCallback: () => void) => void;

beforeEach(async () => {
  vi.resetModules();

  // Re-setup DOM mocks
  vi.doMock('@/panel/utils/dom', () => ({
    DOM: {
      get activeFilters() { return mocks.mockActiveFilters; },
      get filterInput() { return mocks.mockFilterInput; },
      get clearFilter() { return mocks.mockClearFilter; },
      get filterBar() { return mocks.mockFilterBar; },
    },
  }));

  // Re-setup format mocks
  vi.doMock('@/panel/utils/format', () => ({
    esc: mocks.esc,
  }));

  // Re-setup state mocks
  vi.doMock('@/panel/state', () => ({
    getFilterText: mocks.getFilterText,
    setFilterText: mocks.setFilterText,
    getFilterEventType: mocks.getFilterEventType,
    setFilterEventType: mocks.setFilterEventType,
    getFilterStatus: mocks.getFilterStatus,
    setFilterStatus: mocks.setFilterStatus,
    getFilterMethod: mocks.getFilterMethod,
    setFilterMethod: mocks.setFilterMethod,
    getFilterUserId: mocks.getFilterUserId,
    setFilterUserId: mocks.setFilterUserId,
    getFilterHasParam: mocks.getFilterHasParam,
    setFilterHasParam: mocks.setFilterHasParam,
    getHiddenProviders: mocks.getHiddenProviders,
    syncHiddenProviders: mocks.syncHiddenProviders,
    resetFilters: mocks.resetFilters,
  }));

  // Re-setup icon builder mock
  vi.doMock('@/panel/utils/icon-builder', () => ({
    getCachedIcon: mocks.getCachedIcon,
  }));

  // Re-setup provider-filter mock
  vi.doMock('@/panel/components/provider-filter', () => ({
    updateFilterBarVisibility: mocks.updateFilterBarVisibility,
  }));

  // Dynamic import
  const mod = await import('@/panel/components/filter-bar');
  updateActiveFilters = mod.updateActiveFilters;
});

// ─── TEST SETUP / TEARDOWN ─────────────────────────────────────────────────────

describe('filter-bar component', () => {
  beforeEach(() => {
    // Create DOM fixture elements
    const activeFilters = document.createElement('div');
    activeFilters.id = 'active-filters';
    document.body.appendChild(activeFilters);
    mocks.mockActiveFilters = activeFilters;

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.id = 'filter-input';
    document.body.appendChild(filterInput);
    mocks.mockFilterInput = filterInput;

    const clearFilter = document.createElement('button');
    clearFilter.id = 'btn-clear-filter';
    document.body.appendChild(clearFilter);
    mocks.mockClearFilter = clearFilter;

    const filterBar = document.createElement('div');
    filterBar.id = 'filter-bar';
    document.body.appendChild(filterBar);
    mocks.mockFilterBar = filterBar;

    // Reset mock call counts and return values
    mocks.esc.mockImplementation((str: unknown) => String(str));
    mocks.getFilterText.mockReturnValue('');
    mocks.setFilterText.mockReturnValue(undefined);
    mocks.getFilterEventType.mockReturnValue('');
    mocks.setFilterEventType.mockReturnValue(undefined);
    mocks.getFilterStatus.mockReturnValue('');
    mocks.setFilterStatus.mockReturnValue(undefined);
    mocks.getFilterMethod.mockReturnValue('');
    mocks.setFilterMethod.mockReturnValue(undefined);
    mocks.getFilterUserId.mockReturnValue('');
    mocks.setFilterUserId.mockReturnValue(undefined);
    mocks.getFilterHasParam.mockReturnValue('');
    mocks.setFilterHasParam.mockReturnValue(undefined);
    mocks.getHiddenProviders.mockReturnValue(new Set<string>());
    mocks.syncHiddenProviders.mockReturnValue(undefined);
    mocks.resetFilters.mockReturnValue(undefined);
    mocks.getCachedIcon.mockReturnValue(null);
    mocks.updateFilterBarVisibility.mockReturnValue(undefined);

    // Reset filterInput value
    if (mocks.mockFilterInput) {
      mocks.mockFilterInput.value = '';
    }

    // Reset clearFilter display
    if (mocks.mockClearFilter) {
      mocks.mockClearFilter.style.display = '';
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
    mocks.mockActiveFilters = null;
    mocks.mockFilterInput = null;
    mocks.mockClearFilter = null;
    mocks.mockFilterBar = null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH PILL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search pill', () => {
    // ── 1. creates search pill for non-empty filterText ──────────────────────

    it('vytvoří search pill pro neprázdný filterText', () => {
      mocks.getFilterText.mockReturnValue('analytics');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--search');
      expect(pill).not.toBeNull();
    });

    // ── 2. displays filter text in pill label ───────────────────────────────

    it('zobrazí filter text v pill labelu', () => {
      mocks.getFilterText.mockReturnValue('pageview');

      updateActiveFilters(vi.fn());

      const label = mocks.mockActiveFilters?.querySelector('.filter-pill--search .filter-pill-label');
      expect(label?.textContent).toBe('"pageview"');
    });

    // ── 3. uses .filter-pill--search class ───────────────────────────────────

    it('použije .filter-pill--search třídu', () => {
      mocks.getFilterText.mockReturnValue('test');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--search');
      expect(pill?.classList.contains('filter-pill--search')).toBe(true);
    });

    // ── 4. displays blue dot color (#5090ff) ─────────────────────────────────

    it('zobrazí modrou dot barvu (#5090ff)', () => {
      mocks.getFilterText.mockReturnValue('test');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--search');
      const dot = pill?.querySelector('.filter-pill-dot');
      // jsdom normalizes hex to rgb() — verify the color is present
      const bg = (dot as HTMLElement)?.style.background;
      expect(bg).toMatch(/#5090ff|rgb\(80, 144, 255\)/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT TYPE PILL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('event type pill', () => {
    // ── 5. creates event pill for non-empty filterEventType ─────────────────

    it('vytvoří event pill pro neprázdný filterEventType', () => {
      mocks.getFilterEventType.mockReturnValue('page_view');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--event');
      expect(pill).not.toBeNull();
    });

    // ── 6. displays "Page views" for page_view ──────────────────────────────

    it('zobrazí "Page views" pro page_view', () => {
      mocks.getFilterEventType.mockReturnValue('page_view');

      updateActiveFilters(vi.fn());

      const label = mocks.mockActiveFilters?.querySelector('.filter-pill--event .filter-pill-label');
      expect(label?.textContent).toBe('event: Page views');
    });

    // ── 7. displays "Purchases" for purchase ─────────────────────────────────

    it('zobrazí "Purchases" pro purchase', () => {
      mocks.getFilterEventType.mockReturnValue('purchase');

      updateActiveFilters(vi.fn());

      const label = mocks.mockActiveFilters?.querySelector('.filter-pill--event .filter-pill-label');
      expect(label?.textContent).toBe('event: Purchases');
    });

    // ── 8. displays "Custom events" for custom ───────────────────────────────

    it('zobrazí "Custom events" pro custom', () => {
      mocks.getFilterEventType.mockReturnValue('custom');

      updateActiveFilters(vi.fn());

      const label = mocks.mockActiveFilters?.querySelector('.filter-pill--event .filter-pill-label');
      expect(label?.textContent).toBe('event: Custom events');
    });

    // ── 9. displays custom label for exact: prefix ───────────────────────────

    it('zobrazí custom label pro exact: prefix', () => {
      mocks.getFilterEventType.mockReturnValue('exact:purchase_complete');

      updateActiveFilters(vi.fn());

      const label = mocks.mockActiveFilters?.querySelector('.filter-pill--event .filter-pill-label');
      expect(label?.textContent).toBe('event: purchase_complete');
    });

    // ── 10. uses .filter-pill--event class ────────────────────────────────────

    it('použije .filter-pill--event třídu', () => {
      mocks.getFilterEventType.mockReturnValue('page_view');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--event');
      expect(pill?.classList.contains('filter-pill--event')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS PILL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('status pill', () => {
    // ── 11. creates status pill for "2xx" with "2xx Success" ──────────────────

    it('vytvoří status pill pro "2xx" s "2xx Success"', () => {
      mocks.getFilterStatus.mockReturnValue('2xx');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--status');
      expect(pill).not.toBeNull();

      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('status: 2xx Success');
    });

    // ── 12. creates status pill for "4xx" with "4xx Error" ───────────────────

    it('vytvoří status pill pro "4xx" s "4xx Error"', () => {
      mocks.getFilterStatus.mockReturnValue('4xx');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--status');
      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('status: 4xx Error');
    });

    // ── 13. uses .filter-pill--status class ───────────────────────────────────

    it('použije .filter-pill--status třídu', () => {
      mocks.getFilterStatus.mockReturnValue('3xx');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--status');
      expect(pill?.classList.contains('filter-pill--status')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METHOD PILL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('method pill', () => {
    // ── 14. creates method pill for "GET" ─────────────────────────────────────

    it('vytvoří method pill pro "GET"', () => {
      mocks.getFilterMethod.mockReturnValue('GET');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--method');
      expect(pill).not.toBeNull();

      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('method: GET');
    });

    // ── 15. creates method pill for "POST" ───────────────────────────────────

    it('vytvoří method pill pro "POST"', () => {
      mocks.getFilterMethod.mockReturnValue('POST');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--method');
      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('method: POST');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER PILL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('provider pill', () => {
    // ── 16. creates provider pill with hidden provider ────────────────────────

    it('vytvoří provider pill se skrytým providerem', () => {
      mocks.getHiddenProviders.mockReturnValue(new Set(['Google Analytics']));

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--provider');
      expect(pill).not.toBeNull();

      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('Google Analytics');
    });

    // ── 17. uses brand icon in pill when available via getCachedIcon ──────────

    it('použije brand ikonu v pill (pokud dostupná přes getCachedIcon)', () => {
      const frag = document.createDocumentFragment();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      frag.appendChild(svg);
      mocks.getCachedIcon.mockReturnValue(frag);
      mocks.getHiddenProviders.mockReturnValue(new Set(['Facebook Pixel']));

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--provider');
      const iconSpan = pill?.querySelector('.filter-pill-icon');
      expect(iconSpan?.querySelector('svg')).not.toBeNull();
    });

    // ── 18. fallback to colored dot when icon missing ────────────────────────

    it('fallback na barevný dot když ikona chybí', () => {
      mocks.getCachedIcon.mockReturnValue(null);
      mocks.getHiddenProviders.mockReturnValue(new Set(['Unknown Provider']));

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--provider');
      // When no icon, the iconSpan gets class 'filter-pill-dot' and style.background set
      const dot = pill?.querySelector('.filter-pill-dot');
      expect(dot).not.toBeNull();
      // jsdom normalizes hex to rgb() — verify the color is present
      const bg = (dot as HTMLElement)?.style.background;
      expect(bg).toMatch(/#ffa726|rgb\(255, 167, 38\)/);
    });

    // ── 19. sets data-tooltip to provider hint ─────────────────────────────────

    it('nastaví data-tooltip na provider hint', () => {
      mocks.getHiddenProviders.mockReturnValue(new Set(['Test Provider']));

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--provider');
      expect(pill?.getAttribute('data-tooltip')).toBe('Provider hidden (click × to show again)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE ACTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove action', () => {
    // ── 20. removes search pill and clears filterText ─────────────────────────

    it('odstraní search pill a vyčistí filterText', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view'); // Second pill to test remove
      mocks.getFilterStatus.mockReturnValue('');

      // Mock empty filterEventType after remove
      mocks.getFilterEventType.mockReturnValueOnce('page_view');

      updateActiveFilters(vi.fn());

      const removeBtn = mocks.mockActiveFilters?.querySelector('.filter-pill--search .filter-pill-remove');
      removeBtn?.dispatchEvent(new MouseEvent('click'));

      expect(mocks.setFilterText).toHaveBeenCalledWith('');
    });

    // ── 21. removes provider pill and removes from hiddenProviders ─────────────

    it('odstraní provider pill a odstraní ze hiddenProviders', () => {
      const hiddenSet = new Set(['Google Analytics']);
      mocks.getHiddenProviders.mockReturnValue(hiddenSet);
      mocks.getFilterText.mockReturnValue('search'); // Add search to have multiple pills
      mocks.getFilterText.mockReturnValueOnce('search');

      updateActiveFilters(vi.fn());

      const removeBtn = mocks.mockActiveFilters?.querySelector('.filter-pill--provider .filter-pill-remove');
      removeBtn?.dispatchEvent(new MouseEvent('click'));

      expect(hiddenSet.has('Google Analytics')).toBe(false);
      expect(mocks.syncHiddenProviders).toHaveBeenCalled();
    });

    // ── 22. calls applyFiltersCallback after remove ───────────────────────────

    it('zavolá applyFiltersCallback po remove', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view');
      mocks.getFilterText.mockReturnValueOnce('test');
      mocks.getFilterEventType.mockReturnValueOnce('page_view');

      const callback = vi.fn();
      updateActiveFilters(callback);

      const removeBtn = mocks.mockActiveFilters?.querySelector('.filter-pill--search .filter-pill-remove');
      removeBtn?.dispatchEvent(new MouseEvent('click'));

      expect(callback).toHaveBeenCalled();
    });

    // ── 23. recursively calls updateActiveFilters after remove ────────────────

    it('rekurzivně zavolá updateActiveFilters po remove', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.setFilterText.mockImplementation(() => {
        mocks.getFilterText.mockReturnValue('');
      });

      mocks.getFilterEventType.mockReturnValue('page_view');
      mocks.getFilterEventType.mockReturnValueOnce('page_view');

      updateActiveFilters(vi.fn());

      // Reset filterText mock so recursive call has no search pill
      mocks.getFilterText.mockReturnValue('');

      const removeBtn = mocks.mockActiveFilters?.querySelector('.filter-pill--search .filter-pill-remove');
      removeBtn?.dispatchEvent(new MouseEvent('click'));

      // updateFilterBarVisibility is called at the end of updateActiveFilters
      expect(mocks.updateFilterBarVisibility).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clear all', () => {
    // ── 24. shows "Clear all" button when pills > 1 ────────────────────────────

    it('zobrazí "Clear all" button když pills > 1', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view');

      updateActiveFilters(vi.fn());

      const clearBtn = mocks.mockActiveFilters?.querySelector('.filter-clear-all');
      expect(clearBtn).not.toBeNull();
      expect(clearBtn?.textContent).toBe('Clear all');
    });

    // ── 25. does not show "Clear all" button when pills <= 1 ──────────────────

    it('nezobrazí "Clear all" button když pills <= 1', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('');

      updateActiveFilters(vi.fn());

      const clearBtn = mocks.mockActiveFilters?.querySelector('.filter-clear-all');
      expect(clearBtn).toBeNull();
    });

    // ── 26. clears all filters and providers on click ─────────────────────────

    it('vyčistí všechny filtry a providers na click', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view');
      mocks.getFilterStatus.mockReturnValue('2xx');
      mocks.getFilterMethod.mockReturnValue('GET');

      const hiddenSet = new Set(['Google Analytics']);
      mocks.getHiddenProviders.mockReturnValue(hiddenSet);

      updateActiveFilters(vi.fn());

      const clearBtn = mocks.mockActiveFilters?.querySelector('.filter-clear-all') as HTMLButtonElement;
      clearBtn?.click();

      expect(mocks.resetFilters).toHaveBeenCalled();
      expect(hiddenSet.size).toBe(0);
      expect(mocks.syncHiddenProviders).toHaveBeenCalled();
    });

    // ── 27. clears filter input value ────────────────────────────────────────

    it('vyčistí filter input value', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view');

      if (mocks.mockFilterInput) {
        mocks.mockFilterInput.value = 'test';
      }

      updateActiveFilters(vi.fn());

      const clearBtn = mocks.mockActiveFilters?.querySelector('.filter-clear-all') as HTMLButtonElement;
      clearBtn?.click();

      expect(mocks.mockFilterInput?.value).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    // ── 28. clears $activeFilters.innerHTML with empty filters ───────────────

    it('vyčistí $activeFilters.innerHTML při prázdných filters', () => {
      mocks.getFilterText.mockReturnValue('');
      mocks.getFilterEventType.mockReturnValue('');
      mocks.getFilterStatus.mockReturnValue('');
      mocks.getFilterMethod.mockReturnValue('');
      mocks.getFilterUserId.mockReturnValue('');
      mocks.getFilterHasParam.mockReturnValue('');
      mocks.getHiddenProviders.mockReturnValue(new Set());

      // Add some existing content
      if (mocks.mockActiveFilters) {
        mocks.mockActiveFilters.innerHTML = '<div class="old-pill"></div>';
      }

      updateActiveFilters(vi.fn());

      expect(mocks.mockActiveFilters?.innerHTML).toBe('');
    });

    // ── 29. calls updateFilterBarVisibility (side effect) ──────────────────────

    it('zavolá updateFilterBarVisibility (side effect)', () => {
      mocks.getFilterText.mockReturnValue('test');

      updateActiveFilters(vi.fn());

      expect(mocks.updateFilterBarVisibility).toHaveBeenCalled();
    });

    // ── 30. handles user ID filter "has" ─────────────────────────────────────

    it('zpracuje user ID filter "has"', () => {
      mocks.getFilterUserId.mockReturnValue('has');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--userid');
      expect(pill).not.toBeNull();

      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('Has user ID');
    });

    // ── 31. handles user ID filter "missing" ─────────────────────────────────

    it('zpracuje user ID filter "missing"', () => {
      mocks.getFilterUserId.mockReturnValue('missing');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--userid');
      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('Missing user ID');
    });

    // ── 32. handles has-param filter ──────────────────────────────────────────

    it('zpracuje has-param filter', () => {
      mocks.getFilterHasParam.mockReturnValue('uid');

      updateActiveFilters(vi.fn());

      const pill = mocks.mockActiveFilters?.querySelector('.filter-pill--has-param');
      expect(pill).not.toBeNull();

      const label = pill?.querySelector('.filter-pill-label');
      expect(label?.textContent).toBe('has: uid');
    });

    // ── 33. returns early when $activeFilters is null ────────────────────────

    it('vrátí se early když $activeFilters je null', () => {
      mocks.mockActiveFilters = null;
      mocks.getFilterText.mockReturnValue('test');

      // Should not throw
      expect(() => updateActiveFilters(vi.fn())).not.toThrow();
    });

    // ── 34. handles multiple hidden providers ────────────────────────────────

    it('zpracuje více skrytých providers', () => {
      mocks.getHiddenProviders.mockReturnValue(new Set(['Google Analytics', 'Facebook Pixel', 'TikTok']));
      mocks.getFilterText.mockReturnValue('');

      updateActiveFilters(vi.fn());

      const pills = mocks.mockActiveFilters?.querySelectorAll('.filter-pill--provider');
      expect(pills?.length).toBe(3);
    });

    // ── 35. hides clearFilter button when removing search pill ────────────────

    it('skryje clearFilter button když odstraňuje search pill', () => {
      mocks.getFilterText.mockReturnValue('test');
      mocks.getFilterEventType.mockReturnValue('page_view');
      mocks.getFilterText.mockReturnValueOnce('test');
      mocks.getFilterEventType.mockReturnValueOnce('page_view');

      if (mocks.mockClearFilter) {
        mocks.mockClearFilter.style.display = 'block';
      }

      updateActiveFilters(vi.fn());

      mocks.getFilterText.mockReturnValue('');
      mocks.getFilterEventType.mockReturnValueOnce('page_view');

      const removeBtn = mocks.mockActiveFilters?.querySelector('.filter-pill--search .filter-pill-remove');
      removeBtn?.dispatchEvent(new MouseEvent('click'));

      expect(mocks.mockClearFilter?.style.display).toBe('none');
    });
  });
});
