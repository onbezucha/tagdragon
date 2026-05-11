/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PANEL FIXTURE — Shared test helpers for TagDragon panel DOM tests
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { vi } from 'vitest';

import type { ParsedRequest } from '@/types/request';
import type { DataLayerPush } from '@/types/datalayer';

// ═══════════════════════════════════════════════════════════════════════════
// Module-level counters for auto-incrementing IDs
// ═══════════════════════════════════════════════════════════════════════════

let _requestIdCounter = 0;
let _pushIdCounter = 0;

// ═══════════════════════════════════════════════════════════════════════════
// DOM element creation helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a minimal DOM structure matching panel.html for unit tests.
 * Sets up all the IDs and elements that panel components expect.
 */
export function setupPanelFixture(): () => void {
  // Clear existing content
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // ─── Global tab bar ────────────────────────────────────────────────────
  const globalTabBar = document.createElement('div');
  globalTabBar.id = 'global-tab-bar';
  globalTabBar.innerHTML = `
    <div id="tab-switcher">
      <button class="tab-btn active" data-view="network">
        <span id="tab-badge-network" class="tab-badge">0</span>
      </button>
      <button class="tab-btn" data-view="datalayer">
        <span id="tab-badge-datalayer" class="tab-badge">0</span>
      </button>
    </div>
  `;
  document.body.appendChild(globalTabBar);

  // ─── Context toolbars ──────────────────────────────────────────────────
  const networkContext = document.createElement('div');
  networkContext.id = 'network-context';
  networkContext.className = 'context-toolbar';
  networkContext.innerHTML = `
    <input type="text" id="filter-input" />
    <button id="btn-clear-filter"></button>
  `;
  document.body.appendChild(networkContext);

  const datalayerContext = document.createElement('div');
  datalayerContext.id = 'datalayer-context';
  datalayerContext.className = 'context-toolbar';
  datalayerContext.style.display = 'none';
  document.body.appendChild(datalayerContext);

  // ─── Filter bar ────────────────────────────────────────────────────────
  const filterBar = document.createElement('div');
  filterBar.id = 'filter-bar';
  filterBar.innerHTML = '<div id="active-filters"></div>';
  document.body.appendChild(filterBar);

  const dlFilterBar = document.createElement('div');
  dlFilterBar.id = 'dl-filter-bar';
  document.body.appendChild(dlFilterBar);

  // ─── Main content ──────────────────────────────────────────────────────
  const main = document.createElement('div');
  main.id = 'main';

  // List pane
  const listPane = document.createElement('div');
  listPane.id = 'list-pane';
  listPane.innerHTML = `
    <div id="memory-bar-top"><div id="memory-bar-top-fill"></div></div>
    <div id="request-list">
      <div id="empty-state" class="es-container"></div>
    </div>
  `;
  main.appendChild(listPane);

  // Splitter
  const splitter = document.createElement('div');
  splitter.id = 'splitter';
  main.appendChild(splitter);

  // Detail pane
  const detailPane = document.createElement('div');
  detailPane.id = 'detail-pane';
  detailPane.className = 'hidden';
  detailPane.innerHTML = `
    <div id="detail-summary">
      <div class="summary-row-1">
        <span id="summary-provider-icon" class="summary-provider-icon"></span>
        <span id="summary-provider-name" class="summary-provider-name"></span>
        <span id="summary-event-name" class="summary-event-name"></span>
        <button id="btn-close-detail"></button>
      </div>
      <div class="summary-row-2">
        <span id="summary-method" class="summary-method"></span>
        <span id="summary-status" class="summary-status"></span>
        <span id="summary-duration" class="summary-duration"></span>
        <span id="summary-time" class="summary-time"></span>
      </div>
      <div class="summary-row-3">
        <span id="summary-url" class="summary-url"></span>
      </div>
      <div class="summary-row-4">
        <button id="btn-copy-url" class="copy-action-btn"></button>
        <button id="btn-copy-curl" class="copy-action-btn"></button>
        <button id="btn-copy-params" class="copy-action-btn"></button>
      </div>
    </div>
    <div id="triggered-by-banner"></div>
    <div id="detail-tabs" role="tablist">
      <button class="dtab active" data-tab="decoded">Decoded</button>
      <button class="dtab" data-tab="query">Query</button>
      <button class="dtab" data-tab="post">POST</button>
      <button class="dtab" data-tab="headers">Headers</button>
      <button class="dtab" data-tab="response">Response</button>
    </div>
    <div id="detail-content"></div>
  `;
  main.appendChild(detailPane);

  document.body.appendChild(main);

  // ─── DataLayer view ────────────────────────────────────────────────────
  const datalayerView = document.createElement('div');
  datalayerView.id = 'datalayer-view';
  datalayerView.style.display = 'none';
  datalayerView.innerHTML = `
    <div id="dl-main">
      <div id="dl-list-pane">
        <div id="dl-push-list">
          <div id="dl-empty-state" class="es-container"></div>
        </div>
      </div>
      <div id="dl-splitter"></div>
      <div id="dl-detail-pane" class="hidden">
        <div id="dl-detail-header">
          <span id="dl-detail-badge"></span>
          <span id="dl-detail-title"></span>
          <button id="dl-detail-close"></button>
        </div>
        <div id="dl-detail-tabs"></div>
        <div id="dl-detail-content"></div>
      </div>
    </div>
  `;
  document.body.appendChild(datalayerView);

  // ─── Status bar ────────────────────────────────────────────────────────
  const statusBar = document.createElement('div');
  statusBar.id = 'status-bar';
  statusBar.innerHTML = `
    <span id="status-stats">0 requests</span>
    <span id="size-badge"><span class="value">0B</span></span>
    <span id="time-badge"><span class="value">—</span></span>
    <span class="status-separator">·</span>
    <span class="status-separator" id="timestamp-separator">·</span>
    <button id="btn-timestamp-format"><span id="timestamp-format-label">Abs</span></button>
    <span class="status-hint">Backspace to clear</span>
    <div id="provider-breakdown"></div>
  `;
  document.body.appendChild(statusBar);

  const memoryBar = document.createElement('div');
  memoryBar.id = 'memory-bar';
  memoryBar.innerHTML = '<div id="memory-bar-fill"></div>';
  document.body.appendChild(memoryBar);

  // ─── Popovers ──────────────────────────────────────────────────────────
  const popovers = document.createElement('section');
  popovers.id = 'popovers';

  // Settings popover
  const settingsPopover = document.createElement('div');
  settingsPopover.id = 'settings-popover';
  settingsPopover.innerHTML = `
    <input type="text" id="settings-search" />
    <button id="btn-settings-close"></button>
    <div id="popover-body"></div>
    <div id="import-error" style="display:none;"></div>
  `;
  popovers.appendChild(settingsPopover);

  // Provider filter popover
  const providerFilterPopover = document.createElement('div');
  providerFilterPopover.id = 'provider-filter-popover';
  providerFilterPopover.innerHTML = `
    <input type="text" id="provider-search-input" />
    <button id="btn-provider-popover-close"></button>
    <div id="provider-group-list"></div>
    <span id="provider-footer-count">0</span>
    <span id="provider-footer-total">0</span>
    <button id="btn-show-all-providers">Show all</button>
    <button id="btn-hide-all-providers">Hide all</button>
    <div id="http-status-pills"></div>
    <div id="http-method-pills"></div>
  `;
  popovers.appendChild(providerFilterPopover);

  // Consent popover
  const consentPopover = document.createElement('div');
  consentPopover.id = 'consent-popover';
  consentPopover.innerHTML = `
    <div id="consent-cmp-info"><span class="consent-loading">Loading...</span></div>
    <div id="consent-override-badge" style="display:none;"></div>
    <div id="consent-actions" style="display:none;">
      <button id="consent-accept-all">✓ Accept all</button>
      <button id="consent-reject-all">✕ Reject all</button>
    </div>
    <div id="consent-action-status" style="display:none;"></div>
    <div id="consent-categories"></div>
    <div id="consent-timestamp"></div>
    <button id="consent-clear-cookies">🗑 Delete cookies</button>
    <button id="consent-refresh">↻</button>
  `;
  popovers.appendChild(consentPopover);

  // Env popover (Adobe)
  const envPopover = document.createElement('div');
  envPopover.id = 'env-popover';
  envPopover.innerHTML = `
    <div id="env-detected-info">
      <span id="env-detected-url">—</span>
      <span id="env-detected-type"></span>
    </div>
    <input type="text" id="env-url-dev" />
    <input type="text" id="env-url-acc" />
    <input type="text" id="env-url-prod" readonly disabled />
    <button id="env-apply" disabled>Switch</button>
    <button id="env-reset">Restore</button>
    <span id="env-hostname">—</span>
  `;
  popovers.appendChild(envPopover);

  // Info popover
  const infoPopover = document.createElement('div');
  infoPopover.id = 'info-popover';
  infoPopover.innerHTML = `
    <span id="info-version"></span>
    <div id="info-description"></div>
    <span id="info-provider-count">59</span>
    <span id="info-category-count">9</span>
    <input type="text" id="info-search" />
    <button id="btn-info-search-clear">×</button>
    <div id="info-provider-groups"></div>
    <div id="info-no-results" class="info-no-results hidden"></div>
    <div id="info-whats-new"></div>
    <div id="info-shortcuts-list"></div>
    <div id="info-toolbar-icons"></div>
    <div id="info-dl-sources"></div>
  `;
  popovers.appendChild(infoPopover);

  // DL filter popover
  const dlFilterPopover = document.createElement('div');
  dlFilterPopover.id = 'dl-filter-popover';
  dlFilterPopover.innerHTML = `
    <button id="btn-dl-filter-popover-close"></button>
    <div class="popover-body"></div>
    <button id="btn-dl-filter-reset">Reset filters</button>
  `;
  popovers.appendChild(dlFilterPopover);

  document.body.appendChild(popovers);

  // ─── Adobe env badge ───────────────────────────────────────────────────
  const adobeEnvBadge = document.createElement('div');
  adobeEnvBadge.id = 'adobe-env-badge';
  adobeEnvBadge.className = 'env-badge hidden';
  document.body.appendChild(adobeEnvBadge);

  const envSeparator = document.createElement('div');
  envSeparator.id = 'env-separator';
  envSeparator.style.display = 'none';
  document.body.appendChild(envSeparator);

  // ─── Toolbar buttons ───────────────────────────────────────────────────
  const toolbarButtons = [
    { id: 'btn-providers', badge: 'provider-hidden-badge' },
    { id: 'btn-info' },
    { id: 'btn-settings' },
    { id: 'btn-consent' },
    { id: 'btn-theme-toggle' },
    { id: 'btn-clear-all' },
    { id: 'btn-pause' },
    { id: 'btn-export' },
    { id: 'btn-export-format' },
    { id: 'btn-quick-sort' },
    { id: 'btn-wrap-values' },
    { id: 'btn-compact-rows' },
    { id: 'btn-clear-network' },
    { id: 'btn-reload-page' },
  ];

  toolbarButtons.forEach(({ id }) => {
    const button = document.createElement('button');
    button.id = id;
    document.body.appendChild(button);
  });

  // Provider hidden badge (span, not button)
  const providerHiddenBadge = document.createElement('span');
  providerHiddenBadge.id = 'provider-hidden-badge';
  document.body.appendChild(providerHiddenBadge);

  // Return cleanup function
  return () => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  };
}

/**
 * Setup the complete panel DOM from panel.html for integration tests.
 * Loads the actual HTML file and mocks all required Chrome APIs.
 */
export function setupFullPanelFixture(): () => void {
  // Load the actual panel.html
  const panelHtmlPath = resolve(__dirname, '../../..', 'public/panel.html');
  const htmlContent = readFileSync(panelHtmlPath, 'utf-8');

  // Clear and set HTML
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.body.innerHTML = htmlContent;

  // Mock Chrome APIs
  stubChrome();

  // Return cleanup function
  return () => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock creators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a mock ParsedRequest with sensible defaults.
 * Auto-increments ID for each call.
 */
export function mockRequest(overrides?: Partial<ParsedRequest>): ParsedRequest {
  const id = ++_requestIdCounter;

  return {
    id,
    provider: 'GA4',
    color: '#e37400',
    url: 'https://www.google-analytics.com/g/collect?v=2&en=page_view',
    method: 'GET',
    status: 200,
    timestamp: new Date().toISOString(),
    duration: 150,
    size: 500,
    allParams: { v: '2', en: 'page_view' },
    decoded: { v: '2', en: 'page_view' },
    postBody: null,
    requestHeaders: {},
    responseHeaders: {},
    ...overrides,
  };
}

/**
 * Creates a mock DataLayerPush with sensible defaults.
 * Auto-increments ID for each call.
 */
export function mockPush(overrides?: Partial<DataLayerPush>): DataLayerPush {
  const id = ++_pushIdCounter;

  return {
    id,
    source: 'gtm',
    sourceLabel: 'Google Tag Manager',
    pushIndex: 0,
    timestamp: new Date().toISOString(),
    data: { event: 'page_view' },
    cumulativeState: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Chrome API mocks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a chrome.storage.local mock with get, set, remove methods.
 */
export function mockStorageLocal(): {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  const storage: Record<string, unknown> = {};

  const get = vi.fn().mockImplementation((keys: string | string[] | null, callback?: (result: Record<string, unknown>) => void) => {
    if (callback) {
      const result: Record<string, unknown> = {};
      const keyList = Array.isArray(keys) ? keys : keys ? [keys] : [];
      keyList.forEach((key) => {
        if (key in storage) {
          result[key] = storage[key];
        }
      });
      callback(result);
    }
    return Promise.resolve({});
  });

  const set = vi.fn().mockImplementation((items: Record<string, unknown>, callback?: () => void) => {
    Object.assign(storage, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  const remove = vi.fn().mockImplementation((keys: string | string[], callback?: () => void) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => {
      delete storage[key];
    });
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  return { get, set, remove };
}

/**
 * Stubs the global chrome object with mocked storage APIs.
 */
export function stubChrome(): void {
  const storageMock = mockStorageLocal();

  const chromeMock = {
    storage: {
      local: storageMock,
      session: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn().mockReturnValue(false),
      },
      id: 'mock-extension-id',
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    declarativeNetRequest: {
      updateDynamicRules: vi.fn().mockResolvedValue(undefined),
      getDynamicRules: vi.fn().mockResolvedValue([]),
    },
    cookies: {
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };

  vi.stubGlobal('chrome', chromeMock);
}

/**
 * Resets the auto-incrementing ID counters.
 * Useful between tests to ensure predictable IDs.
 */
export function resetIdCounters(): void {
  _requestIdCounter = 0;
  _pushIdCounter = 0;
}
