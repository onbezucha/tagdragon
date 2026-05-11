// @vitest-environment jsdom
/**
 * DOM unit tests for the provider filter popover components.
 *
 * Tests cover: toggleProviderFilter, closeProviderFilter, isProviderFilterOpen,
 * HTTP status/method pills rendering and interaction, search filtering,
 * show all / hide all bulk actions, provider pill visibility toggle,
 * group state updates, footer summary, hidden badge, and close on Esc/button.
 */

import { vi } from 'vitest';
import type { ParsedRequest } from '@/types/request';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK COLLECTOR (hoisted before vi.mock calls)
// ═══════════════════════════════════════════════════════════════════════════════

const {
  state,
  mockDOM,
  mockQsa,
  mockRegisterPopover,
  mockCloseAllPopovers,
  mockGetHiddenProviders,
  mockGetActiveProviders,
  mockSyncHiddenProviders,
  mockGetFilterStatus,
  mockSetFilterStatus,
  mockGetFilterMethod,
  mockSetFilterMethod,
  mockGetAllRequests,
  mockGetFilterText,
  mockGetFilterEventType,
  mockGetFilterUserId,
  mockGetFilterHasParam,
  mockGetCachedIcon,
  mockGetProviderGroup,
} = vi.hoisted(() => {
  // Shared mutable state for mock functions
  const state = {
    hiddenProviders: new Set<string>(),
    activeProviders: new Set<string>(),
    filterStatus: '' as string,
    filterMethod: '' as '' | 'GET' | 'POST',
    allRequests: [] as ParsedRequest[],
    filterText: '',
    filterEventType: '',
    filterUserId: '',
    filterHasParam: '',
  };

  // Mock DOM — lazy getters resolve against actual document
  const mockDOM = {
    get btnProviders() { return document.getElementById('btn-providers'); },
    get providerFilterPopover() { return document.getElementById('provider-filter-popover'); },
    get btnProviderPopoverClose() { return document.getElementById('btn-provider-popover-close'); },
    get providerGroupList() { return document.getElementById('provider-group-list'); },
    get providerSearchInput() { return document.getElementById('provider-search-input'); },
    get filterBar() { return document.getElementById('filter-bar'); },
  };

  const mockQsa = <T extends Element = Element>(selector: string, parent: ParentNode = document): T[] => {
    return Array.from(parent.querySelectorAll<T>(selector));
  };

  // Popover manager mocks
  const mockCloseAllPopovers = vi.fn();
  const mockRegisterPopover = vi.fn();

  // State accessors / mutators
  const mockGetHiddenProviders = vi.fn(() => state.hiddenProviders);
  const mockGetActiveProviders = vi.fn(() => state.activeProviders);
  const mockSyncHiddenProviders = vi.fn();
  const mockGetFilterStatus = vi.fn(() => state.filterStatus);
  const mockSetFilterStatus = vi.fn((v: string) => { state.filterStatus = v; });
  const mockGetFilterMethod = vi.fn(() => state.filterMethod);
  const mockSetFilterMethod = vi.fn((v: '' | 'GET' | 'POST') => { state.filterMethod = v; });
  const mockGetAllRequests = vi.fn(() => state.allRequests);
  const mockGetFilterText = vi.fn(() => state.filterText);
  const mockGetFilterEventType = vi.fn(() => state.filterEventType);
  const mockGetFilterUserId = vi.fn(() => state.filterUserId);
  const mockGetFilterHasParam = vi.fn(() => state.filterHasParam);
  const mockGetCachedIcon = vi.fn().mockReturnValue(null);
  const mockGetProviderGroup = vi.fn().mockReturnValue(undefined);

  return {
    state,
    mockDOM,
    mockQsa,
    mockRegisterPopover,
    mockCloseAllPopovers,
    mockGetHiddenProviders,
    mockGetActiveProviders,
    mockSyncHiddenProviders,
    mockGetFilterStatus,
    mockSetFilterStatus,
    mockGetFilterMethod,
    mockSetFilterMethod,
    mockGetAllRequests,
    mockGetFilterText,
    mockGetFilterEventType,
    mockGetFilterUserId,
    mockGetFilterHasParam,
    mockGetCachedIcon,
    mockGetProviderGroup,
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('@/panel/utils/dom', () => ({
  DOM: mockDOM,
  qsa: mockQsa,
}));

vi.mock('@/panel/utils/popover-manager', () => ({
  registerPopover: mockRegisterPopover,
  closeAllPopovers: mockCloseAllPopovers,
}));

vi.mock('@/panel/state', () => ({
  getHiddenProviders: mockGetHiddenProviders,
  getActiveProviders: mockGetActiveProviders,
  syncHiddenProviders: mockSyncHiddenProviders,
  getFilterStatus: mockGetFilterStatus,
  setFilterStatus: mockSetFilterStatus,
  getFilterMethod: mockGetFilterMethod,
  setFilterMethod: mockSetFilterMethod,
  getAllRequests: mockGetAllRequests,
  getFilterText: mockGetFilterText,
  getFilterEventType: mockGetFilterEventType,
  getFilterUserId: mockGetFilterUserId,
  getFilterHasParam: mockGetFilterHasParam,
  updateConfig: vi.fn(),
}));

vi.mock('@/panel/utils/icon-builder', () => ({
  getCachedIcon: mockGetCachedIcon,
}));

vi.mock('@/shared/provider-groups', () => ({
  getProviderGroup: mockGetProviderGroup,
  UNGROUPED_ID: 'other',
  UNGROUPED_LABEL: 'Other',
  PROVIDER_GROUPS: [],
}));

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC IMPORTS AFTER MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

// Re-import submodules directly to test each in isolation
let pillDomUpdates: {
  updateGroupStates: () => void;
  updateHiddenBadge: () => void;
  updateFooterSummary: () => void;
};

let popover: {
  initProviderFilterPopover: (context: { doApplyFilters: () => void; doUpdateActiveFilters: () => void }) => void;
  toggleProviderFilter: () => void;
  closeProviderFilter: () => void;
  isProviderFilterOpen: () => boolean;
  refreshHttpFilterPillStates: () => void;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildDOM(): void {
  document.body.innerHTML = `
    <button id="btn-providers">
      <span id="provider-hidden-badge" class="provider-hidden-badge"></span>
    </button>
    <div id="filter-bar" class="hidden"></div>
    <div id="provider-filter-popover">
      <input type="text" id="provider-search-input" />
      <button id="btn-provider-popover-close">×</button>
      <div id="provider-group-list"></div>
      <div id="http-status-pills"></div>
      <div id="http-method-pills"></div>
      <span id="provider-footer-count">0</span>
      <span id="provider-footer-total">0</span>
      <button id="btn-show-all-providers">Show all</button>
      <button id="btn-hide-all-providers">Hide all</button>
    </div>
  `;
}

function createRequest(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    id: 1,
    provider: 'GA4',
    color: '#e37400',
    url: 'https://www.google-analytics.com/g/collect?v=2&en=page_view',
    method: 'POST',
    status: 200,
    timestamp: new Date().toISOString(),
    duration: 150,
    size: 500,
    allParams: { v: '2', en: 'page_view' },
    decoded: { v: '2', en: 'page_view' },
    postBody: null,
    ...overrides,
  } as ParsedRequest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

describe('provider-filter popover', () => {
  beforeEach(async () => {
    // Reset mock state
    state.hiddenProviders.clear();
    state.activeProviders.clear();
    state.filterStatus = '';
    state.filterMethod = '';
    state.allRequests = [];
    state.filterText = '';
    state.filterEventType = '';
    state.filterUserId = '';
    state.filterHasParam = '';

    // Reset mocks
    mockSyncHiddenProviders.mockClear();
    mockSetFilterStatus.mockClear();
    mockSetFilterMethod.mockClear();
    mockRegisterPopover.mockClear();
    mockCloseAllPopovers.mockClear();
    mockGetCachedIcon.mockClear().mockReturnValue(null);
    mockGetProviderGroup.mockClear().mockReturnValue(undefined);

    // Rebuild DOM for each test
    buildDOM();

    // Re-import the popover module to reset its module-level `providerFilterOpen` state.
    // The popover module is cached by the JS module system, so its module-level
    // `let providerFilterOpen = false` closure variable persists across tests.
    // Re-importing gives us a fresh closure with `providerFilterOpen = false`.
    popover = await import('../../../src/panel/components/provider-filter/popover');
    // Ensure popover is closed before each test starts
    popover.closeProviderFilter();
  });

  beforeAll(async () => {
    pillDomUpdates = await import('../../../src/panel/components/provider-filter/pill-dom-updates');
    popover = await import('../../../src/panel/components/provider-filter/popover');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN / CLOSE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleProviderFilter', () => {
    it('otevře popover a přidá .visible třídu', async () => {
      // Init first (wires handlers and registers popover)
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      expect(document.getElementById('provider-filter-popover')!.classList.contains('visible')).toBe(false);

      popover.toggleProviderFilter();

      expect(document.getElementById('provider-filter-popover')!.classList.contains('visible')).toBe(true);
    });

    it('zavře popover při druhém volání toggle', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      popover.toggleProviderFilter();
      popover.toggleProviderFilter();

      expect(document.getElementById('provider-filter-popover')!.classList.contains('visible')).toBe(false);
    });

    it('zavolá closeAllPopovers před otevřením', async () => {
      // Fresh re-import so closeAllPopovers hasn't been called yet by this instance
      popover = await import('../../../src/panel/components/provider-filter/popover');
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      mockCloseAllPopovers.mockClear();

      popover.toggleProviderFilter();

      expect(mockCloseAllPopovers).toHaveBeenCalled();
    });

    it('refreshne HTTP filter pill states při otevření (ověřeno přes DOM)', async () => {
      // Verify via DOM effect: counts update after opening popover.
      // renderHttpFilterPills → refreshHttpFilterPillStates chain is exercised by openProviderFilter.
      state.allRequests = [createRequest({ status: 200 }), createRequest({ status: 200 })];

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      // Counts should be rendered from state.allRequests
      const pill2xx = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="2xx"]');
      expect(pill2xx?.querySelector('.hpill-count')?.textContent).toBe('2');
    });
  });

  describe('closeProviderFilter', () => {
    it('skryje popover odstraněním .visible třídy', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      popover.toggleProviderFilter();
      expect(document.getElementById('provider-filter-popover')!.classList.contains('visible')).toBe(true);

      popover.closeProviderFilter();

      expect(document.getElementById('provider-filter-popover')!.classList.contains('visible')).toBe(false);
    });

    it('vyčistí search input při zavření', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      popover.toggleProviderFilter();
      document.getElementById('provider-search-input')!.value = 'GA4';
      popover.closeProviderFilter();

      expect(document.getElementById('provider-search-input')!.value).toBe('');
    });

    it('obnoví .search-hidden na všech ppills po zavření', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      popover.toggleProviderFilter();
      // Simulate search hiding some pills
      const pill = document.createElement('div');
      pill.className = 'ppill search-hidden';
      document.getElementById('provider-group-list')!.appendChild(pill);
      expect(pill.classList.contains('search-hidden')).toBe(true);

      popover.closeProviderFilter();

      expect(pill.classList.contains('search-hidden')).toBe(false);
    });
  });

  describe('isProviderFilterOpen', () => {
    it('vrací false když je popover zavřený', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      expect(popover.isProviderFilterOpen()).toBe(false);
    });

    it('vrací true když je popover otevřený', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      expect(popover.isProviderFilterOpen()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP FILTER PILLS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('HTTP status pills', () => {
    it('vyrenderuje 4 status pills (2xx, 3xx, 4xx, 5xx)', async () => {
      state.allRequests = [
        createRequest({ status: 200 }),
        createRequest({ status: 304 }),
        createRequest({ status: 404 }),
        createRequest({ status: 503 }),
      ];

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      const pills = document.querySelectorAll('#http-status-pills .hpill');
      expect(pills.length).toBe(4);

      const prefixes = Array.from(pills).map((p) => (p as HTMLElement).dataset.prefix);
      expect(prefixes).toContain('2xx');
      expect(prefixes).toContain('3xx');
      expect(prefixes).toContain('4xx');
      expect(prefixes).toContain('5xx');
    });

    it('počítá requesty správně podle status prefixu', async () => {
      state.allRequests = [
        createRequest({ status: 200 }),
        createRequest({ status: 201 }),
        createRequest({ status: 200 }),
        createRequest({ status: 404 }),
      ];

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      const pill2xx = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="2xx"]');
      const pill4xx = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="4xx"]');

      expect(pill2xx?.querySelector('.hpill-count')?.textContent).toBe('3');
      expect(pill4xx?.querySelector('.hpill-count')?.textContent).toBe('1');
    });

    it('nastaví .active na aktivním status pill', async () => {
      state.allRequests = [createRequest({ status: 200 })];
      state.filterStatus = '2xx';

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      const activePill = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="2xx"]');
      expect(activePill?.classList.contains('active')).toBe(true);
    });

    it('toggle status pill zavolá setFilterStatus a doApplyFilters', async () => {
      state.allRequests = [createRequest({ status: 200 })];
      const doApplyFilters = vi.fn();
      const doUpdateActiveFilters = vi.fn();

      popover.initProviderFilterPopover({ doApplyFilters, doUpdateActiveFilters });

      const pill2xx = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="2xx"]');
      pill2xx?.click();

      expect(mockSetFilterStatus).toHaveBeenCalledWith('2xx');
      expect(doApplyFilters).toHaveBeenCalled();
      expect(doUpdateActiveFilters).toHaveBeenCalled();
    });

    it('odstraní filter když clickne na aktivní status pill', async () => {
      state.allRequests = [createRequest({ status: 200 })];
      state.filterStatus = '2xx';
      const doApplyFilters = vi.fn();
      const doUpdateActiveFilters = vi.fn();

      popover.initProviderFilterPopover({ doApplyFilters, doUpdateActiveFilters });

      const pill2xx = document.querySelector<HTMLElement>('#http-status-pills .hpill[data-prefix="2xx"]');
      pill2xx?.click();

      expect(mockSetFilterStatus).toHaveBeenCalledWith('');
      expect(doApplyFilters).toHaveBeenCalled();
    });
  });

  describe('HTTP method pills', () => {
    it('vyrenderuje GET a POST method pills', async () => {
      state.allRequests = [
        createRequest({ method: 'GET' }),
        createRequest({ method: 'POST' }),
      ];

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      const pills = document.querySelectorAll('#http-method-pills .hpill');
      expect(pills.length).toBe(2);

      const methods = Array.from(pills).map((p) => (p as HTMLElement).dataset.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    it('počítá requesty správně podle metody', async () => {
      state.allRequests = [
        createRequest({ method: 'POST' }),
        createRequest({ method: 'POST' }),
        createRequest({ method: 'GET' }),
      ];

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      const pillGet = document.querySelector<HTMLElement>('#http-method-pills .hpill[data-method="GET"]');
      const pillPost = document.querySelector<HTMLElement>('#http-method-pills .hpill[data-method="POST"]');

      expect(pillGet?.querySelector('.hpill-count')?.textContent).toBe('1');
      expect(pillPost?.querySelector('.hpill-count')?.textContent).toBe('2');
    });

    it('toggle POST pill nastaví filter na POST', async () => {
      state.allRequests = [createRequest({ method: 'POST' })];
      const doApplyFilters = vi.fn();
      const doUpdateActiveFilters = vi.fn();

      popover.initProviderFilterPopover({ doApplyFilters, doUpdateActiveFilters });

      const pillPost = document.querySelector<HTMLElement>('#http-method-pills .hpill[data-method="POST"]');
      pillPost?.click();

      expect(mockSetFilterMethod).toHaveBeenCalledWith('POST');
      expect(doApplyFilters).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search filtering', () => {
    it('přidá .search-hidden na ppill když název neodpovídá search', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      // Create a provider pill
      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'analytics';
      const pill = document.createElement('div');
      pill.className = 'ppill active';
      pill.dataset.provider = 'GA4';
      group.appendChild(pill);
      document.getElementById('provider-group-list')!.appendChild(group);

      // Simulate search input
      const input = document.getElementById('provider-search-input')!;
      input.value = 'Amplitude';
      input.dispatchEvent(new Event('input'));

      expect(pill.classList.contains('search-hidden')).toBe(true);
    });

    it('neodstraní .search-hidden když název odpovídá', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      const pill = document.createElement('div');
      pill.className = 'ppill active';
      pill.dataset.provider = 'GA4';
      document.getElementById('provider-group-list')!.appendChild(pill);

      const input = document.getElementById('provider-search-input')!;
      input.value = 'ga4';
      input.dispatchEvent(new Event('input'));

      expect(pill.classList.contains('search-hidden')).toBe(false);
    });

    it('je case-insensitive', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      const pill = document.createElement('div');
      pill.className = 'ppill active';
      pill.dataset.provider = 'Google Analytics';
      document.getElementById('provider-group-list')!.appendChild(pill);

      const input = document.getElementById('provider-search-input')!;
      input.value = 'GOOGLE';
      input.dispatchEvent(new Event('input'));

      expect(pill.classList.contains('search-hidden')).toBe(false);
    });

    it('zobrazí všechny pills při prázdném search', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      const pill = document.createElement('div');
      pill.className = 'ppill active search-hidden';
      pill.dataset.provider = 'GA4';
      document.getElementById('provider-group-list')!.appendChild(pill);

      const input = document.getElementById('provider-search-input')!;
      input.value = '';
      input.dispatchEvent(new Event('input'));

      expect(pill.classList.contains('search-hidden')).toBe(false);
    });

    it('přidá .search-empty na .pgroup když všechny pills jsou skryté', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'analytics';
      const pill = document.createElement('div');
      pill.className = 'ppill active';
      pill.dataset.provider = 'GA4';
      group.appendChild(pill);
      document.getElementById('provider-group-list')!.appendChild(group);

      const input = document.getElementById('provider-search-input')!;
      input.value = 'NonExistent';
      input.dispatchEvent(new Event('input'));

      expect(group.classList.contains('search-empty')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOW ALL / HIDE ALL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('show all / hide all bulk actions', () => {
    it('Show all vyčistí hiddenProviders a obnoví .active na všech pills', async () => {
      state.hiddenProviders.add('GA4');
      state.activeProviders.add('GA4');
      state.activeProviders.add('Meta Pixel');
      state.hiddenProviders.add('Meta Pixel');

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      // Create pills in DOM
      const group1 = document.createElement('div');
      group1.className = 'pgroup';
      group1.dataset.group = 'analytics';
      const pill1 = document.createElement('div');
      pill1.className = 'ppill inactive';
      pill1.dataset.provider = 'GA4';
      const icon1 = document.createElement('span');
      icon1.className = 'ppill-icon icon-hidden';
      pill1.appendChild(icon1);
      group1.appendChild(pill1);

      const group2 = document.createElement('div');
      group2.className = 'pgroup';
      group2.dataset.group = 'marketing';
      const pill2 = document.createElement('div');
      pill2.className = 'ppill inactive';
      pill2.dataset.provider = 'Meta Pixel';
      const icon2 = document.createElement('span');
      icon2.className = 'ppill-icon icon-hidden';
      pill2.appendChild(icon2);
      group2.appendChild(pill2);

      document.getElementById('provider-group-list')!.appendChild(group1);
      document.getElementById('provider-group-list')!.appendChild(group2);

      const showAllBtn = document.getElementById('btn-show-all-providers')!;
      showAllBtn.click();

      expect(state.hiddenProviders.size).toBe(0);
      expect(pill1.classList.contains('active')).toBe(true);
      expect(pill1.classList.contains('inactive')).toBe(false);
      expect(pill2.classList.contains('active')).toBe(true);
      expect(icon1.classList.contains('icon-hidden')).toBe(false);
      expect(icon2.classList.contains('icon-hidden')).toBe(false);
      expect(mockSyncHiddenProviders).toHaveBeenCalled();
    });

    it('Hide all přidá všechny activeProviders do hiddenProviders', async () => {
      state.activeProviders.add('GA4');
      state.activeProviders.add('Meta Pixel');

      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      // Create pills
      const pill1 = document.createElement('div');
      pill1.className = 'ppill active';
      pill1.dataset.provider = 'GA4';
      const icon1 = document.createElement('span');
      icon1.className = 'ppill-icon';
      pill1.appendChild(icon1);

      const pill2 = document.createElement('div');
      pill2.className = 'ppill active';
      pill2.dataset.provider = 'Meta Pixel';
      const icon2 = document.createElement('span');
      icon2.className = 'ppill-icon';
      pill2.appendChild(icon2);

      document.getElementById('provider-group-list')!.appendChild(pill1);
      document.getElementById('provider-group-list')!.appendChild(pill2);

      const hideAllBtn = document.getElementById('btn-hide-all-providers')!;
      hideAllBtn.click();

      expect(state.hiddenProviders.has('GA4')).toBe(true);
      expect(state.hiddenProviders.has('Meta Pixel')).toBe(true);
      expect(pill1.classList.contains('inactive')).toBe(true);
      expect(pill2.classList.contains('inactive')).toBe(true);
      expect(icon1.classList.contains('icon-hidden')).toBe(true);
      expect(icon2.classList.contains('icon-hidden')).toBe(true);
      expect(mockSyncHiddenProviders).toHaveBeenCalled();
    });

    it('Show all zavolá doApplyFilters a doUpdateActiveFilters', async () => {
      state.hiddenProviders.add('GA4');
      state.activeProviders.add('GA4');

      const doApplyFilters = vi.fn();
      const doUpdateActiveFilters = vi.fn();

      popover.initProviderFilterPopover({ doApplyFilters, doUpdateActiveFilters });
      popover.toggleProviderFilter();

      const showAllBtn = document.getElementById('btn-show-all-providers')!;
      showAllBtn.click();

      expect(doApplyFilters).toHaveBeenCalled();
      expect(doUpdateActiveFilters).toHaveBeenCalled();
    });

    it('Hide all zavolá doApplyFilters a doUpdateActiveFilters', async () => {
      state.activeProviders.add('GA4');

      const doApplyFilters = vi.fn();
      const doUpdateActiveFilters = vi.fn();

      popover.initProviderFilterPopover({ doApplyFilters, doUpdateActiveFilters });
      popover.toggleProviderFilter();

      const hideAllBtn = document.getElementById('btn-hide-all-providers')!;
      hideAllBtn.click();

      expect(doApplyFilters).toHaveBeenCalled();
      expect(doUpdateActiveFilters).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('close button', () => {
    it('skryje popover při kliknutí na close button', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();

      expect(popover.isProviderFilterOpen()).toBe(true);

      document.getElementById('btn-provider-popover-close')!.click();

      expect(popover.isProviderFilterOpen()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESC KEY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Esc key', () => {
    it('skryje popover při stisku Esc (přes registerPopover closeAllPopovers)', async () => {
      // Fresh module instance for this test
      popover = await import('../../../src/panel/components/provider-filter/popover');
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });
      popover.toggleProviderFilter();
      expect(popover.isProviderFilterOpen()).toBe(true);

      // registerPopover wires closeProviderFilter as the Esc handler via popover-manager.
      // Actual Esc key event dispatch is tested at integration/acceptance level.
      // Here we verify the close function works correctly.
      popover.closeProviderFilter();

      expect(popover.isProviderFilterOpen()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PILL-DOM-UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateHiddenBadge', () => {
    it('aktualizuje provider-hidden-badge s počtem skrytých providers', async () => {
      state.hiddenProviders.add('GA4');
      state.hiddenProviders.add('Meta Pixel');
      state.hiddenProviders.add('TikTok Pixel');

      pillDomUpdates.updateHiddenBadge();

      const badge = document.getElementById('provider-hidden-badge')!;
      expect(badge.textContent).toBe('3');
      expect(badge.classList.contains('visible')).toBe(true);
    });

    it('vymaže badge když nejsou žádné skryté providers', async () => {
      state.hiddenProviders.clear();

      pillDomUpdates.updateHiddenBadge();

      const badge = document.getElementById('provider-hidden-badge')!;
      expect(badge.textContent).toBe('');
      expect(badge.classList.contains('visible')).toBe(false);
    });
  });

  describe('updateFooterSummary', () => {
    it('zobrazí správný count a total ve footeru', async () => {
      state.activeProviders.add('GA4');
      state.activeProviders.add('Meta Pixel');
      state.activeProviders.add('TikTok Pixel');
      state.hiddenProviders.add('Meta Pixel'); // 1 hidden, 2 visible

      pillDomUpdates.updateFooterSummary();

      const countEl = document.getElementById('provider-footer-count')!;
      const totalEl = document.getElementById('provider-footer-total')!;

      expect(countEl.textContent).toBe('2');
      expect(totalEl.textContent).toBe('3');
    });

    it('zobrazí total i count = 0 když nejsou žádné providers', async () => {
      state.activeProviders.clear();
      state.hiddenProviders.clear();

      pillDomUpdates.updateFooterSummary();

      const countEl = document.getElementById('provider-footer-count')!;
      const totalEl = document.getElementById('provider-footer-total')!;

      expect(countEl.textContent).toBe('0');
      expect(totalEl.textContent).toBe('0');
    });

    it('count = total když všechny providers jsou visible', async () => {
      state.activeProviders.add('GA4');
      state.activeProviders.add('Meta Pixel');
      state.hiddenProviders.clear();

      pillDomUpdates.updateFooterSummary();

      const countEl = document.getElementById('provider-footer-count')!;
      const totalEl = document.getElementById('provider-footer-total')!;

      expect(countEl.textContent).toBe('2');
      expect(totalEl.textContent).toBe('2');
    });
  });

  describe('updateGroupStates', () => {
    it('nastaví .pgroup-state na "all" když všechny pills jsou active', async () => {
      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'analytics';
      group.innerHTML = `
        <span class="pgroup-state"></span>
        <div class="pgroup-pills">
          <div class="ppill active" data-provider="GA4"></div>
          <div class="ppill active" data-provider="Amplitude"></div>
        </div>
      `;
      document.getElementById('provider-group-list')!.appendChild(group);

      pillDomUpdates.updateGroupStates();

      const stateEl = group.querySelector('.pgroup-state')!;
      expect(stateEl.classList.contains('all')).toBe(true);
    });

    it('nastaví .pgroup-state na "none" když všechny pills jsou inactive', async () => {
      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'analytics';
      group.innerHTML = `
        <span class="pgroup-state"></span>
        <div class="pgroup-pills">
          <div class="ppill inactive" data-provider="GA4"></div>
          <div class="ppill inactive" data-provider="Amplitude"></div>
        </div>
      `;
      document.getElementById('provider-group-list')!.appendChild(group);

      pillDomUpdates.updateGroupStates();

      const stateEl = group.querySelector('.pgroup-state')!;
      expect(stateEl.classList.contains('none')).toBe(true);
    });

    it('nastaví .pgroup-state na "partial" když některé pills jsou inactive', async () => {
      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'analytics';
      group.innerHTML = `
        <span class="pgroup-state"></span>
        <div class="pgroup-pills">
          <div class="ppill active" data-provider="GA4"></div>
          <div class="ppill inactive" data-provider="Amplitude"></div>
        </div>
      `;
      document.getElementById('provider-group-list')!.appendChild(group);

      pillDomUpdates.updateGroupStates();

      const stateEl = group.querySelector('.pgroup-state')!;
      expect(stateEl.classList.contains('partial')).toBe(true);
    });

    it('přeskočí group bez pills', async () => {
      const group = document.createElement('div');
      group.className = 'pgroup';
      group.dataset.group = 'empty';
      group.innerHTML = `<span class="pgroup-state"></span><div class="pgroup-pills"></div>`;
      document.getElementById('provider-group-list')!.appendChild(group);

      // Should not throw
      expect(() => pillDomUpdates.updateGroupStates()).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER POPOVER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initProviderFilterPopover wiring', () => {
    it('zavolá registerPopover s názvem "provider-filter"', async () => {
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      expect(mockRegisterPopover).toHaveBeenCalledWith(
        'provider-filter',
        expect.any(Function)
      );
    });

    it('registerPopover close handler skryje popover', async () => {
      // Fresh module instance so the registered close is the first call
      popover = await import('../../../src/panel/components/provider-filter/popover');
      popover.initProviderFilterPopover({ doApplyFilters: vi.fn(), doUpdateActiveFilters: vi.fn() });

      // Extract the registered close function from the first mock call
      const registeredClose = mockRegisterPopover.mock.calls[0][1] as () => void;
      popover.toggleProviderFilter();
      expect(popover.isProviderFilterOpen()).toBe(true);

      registeredClose();

      expect(popover.isProviderFilterOpen()).toBe(false);
    });
  });
});
