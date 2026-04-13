// ─── DOM UTILITIES ───────────────────────────────────────────────────────────

/**
 * Get DOM element by ID with type safety.
 */
export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Query selector all shorthand returning array.
 */
export function qsa<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

// ─── DOM ELEMENT REFERENCES ──────────────────────────────────────────────────
// Cached DOM references for performance

interface DOMRefs {
  // ─── TOOLBAR REFS ──────────────────────────────────────────────────────
  readonly globalTabBar: HTMLElement | null;
  readonly tabBadgeNetwork: HTMLElement | null;
  readonly tabBadgeDatalayer: HTMLElement | null;
  readonly networkContext: HTMLElement | null;
  readonly datalayerContext: HTMLElement | null;
  // ─── NETWORK REFS ───────────────────────────────────────────────────────
  readonly list: HTMLElement | null;
  readonly empty: HTMLElement | null;
  readonly detail: HTMLElement | null;
  readonly summaryProviderIcon: HTMLElement | null;
  readonly summaryProviderName: HTMLElement | null;
  readonly summaryEventName: HTMLElement | null;
  readonly summaryMethod: HTMLElement | null;
  readonly detailContent: HTMLElement | null;
  readonly detailTabs: HTMLElement | null;
  readonly triggeredByBanner: HTMLElement | null;
  readonly statusStats: HTMLElement | null;
  readonly sizeBadge: HTMLElement | null;
  readonly timeBadge: HTMLElement | null;
  readonly filterInput: HTMLInputElement | null;
  readonly clearFilter: HTMLElement | null;
  readonly summaryStatus: HTMLElement | null;
  readonly summaryDuration: HTMLElement | null;
  readonly summaryTime: HTMLElement | null;
  readonly summaryUrl: HTMLElement | null;
  readonly providerGroupList: HTMLElement | null;
  readonly providerSearchInput: HTMLInputElement | null;
  readonly activeFilters: HTMLElement | null;
  readonly providerPopover: HTMLElement | null;
  readonly btnProviders: HTMLElement | null;
  readonly filterBar: HTMLElement | null;
  readonly settingsPopover: HTMLElement | null;
  readonly filterPopover: HTMLElement | null;
  readonly filterSubmenu: HTMLElement | null;
  readonly filterSubmenuContent: HTMLElement | null;
  readonly main: HTMLElement | null;
  readonly splitter: HTMLElement | null;
  readonly envBadge: HTMLElement | null;
  readonly envPopover: HTMLElement | null;
  readonly envSeparator: HTMLElement | null;
  readonly envDetectedUrl: HTMLElement | null;
  readonly envDetectedType: HTMLElement | null;
  readonly envUrlDev: HTMLElement | null;
  readonly envUrlAcc: HTMLElement | null;
  readonly envUrlProd: HTMLElement | null;
  readonly envApply: HTMLElement | null;
  readonly envReset: HTMLElement | null;
  readonly envHostname: HTMLElement | null;
  readonly consentPopover: HTMLElement | null;
  readonly infoPopover: HTMLElement | null;
  readonly btnInfo: HTMLElement | null;
  readonly infoProviderGroups: HTMLElement | null;
  // ─── DATALAYER REFS ─────────────────────────────────────────────────────
  readonly dlPushList: HTMLElement | null;
  readonly dlDetailPane: HTMLElement | null;
  readonly dlEmptyState: HTMLElement | null;
  readonly dlSplitter: HTMLElement | null;
  readonly dlFilterInput: HTMLInputElement | null;

  readonly dlBtnExport: HTMLElement | null;
  readonly dlView: HTMLElement | null;
  readonly dlFilterBar: HTMLElement | null;
  readonly dlMain: HTMLElement | null;
  readonly dlDetailContent: HTMLElement | null;
  readonly dlDetailTabs: HTMLElement | null;
  readonly dlDetailBadge: HTMLElement | null;
  readonly dlDetailTitle: HTMLElement | null;
}

export const DOM: DOMRefs = {
  // ─── TOOLBAR REFS ──────────────────────────────────────────────────────
  get globalTabBar() {
    return $('global-tab-bar');
  },
  get tabBadgeNetwork() {
    return $('tab-badge-network');
  },
  get tabBadgeDatalayer() {
    return $('tab-badge-datalayer');
  },
  get networkContext() {
    return $('network-context');
  },
  get datalayerContext() {
    return $('datalayer-context');
  },
  // ─── NETWORK REFS ───────────────────────────────────────────────────────
  get list() {
    return $('request-list');
  },
  get empty() {
    return $('empty-state');
  },
  get detail() {
    return $('detail-pane');
  },
  get summaryProviderIcon() {
    return $('summary-provider-icon');
  },
  get summaryProviderName() {
    return $('summary-provider-name');
  },
  get summaryEventName() {
    return $('summary-event-name');
  },
  get summaryMethod() {
    return $('summary-method');
  },
  get detailContent() {
    return $('detail-content');
  },
  get detailTabs() {
    return $('detail-tabs');
  },
  get triggeredByBanner() {
    return $('triggered-by-banner');
  },
  get statusStats() {
    return $('status-stats');
  },
  get sizeBadge() {
    return $('size-badge');
  },
  get timeBadge() {
    return $('time-badge');
  },
  get filterInput() {
    return $<HTMLInputElement>('filter-input');
  },
  get clearFilter() {
    return $('btn-clear-filter');
  },
  get summaryStatus() {
    return $('summary-status');
  },
  get summaryDuration() {
    return $('summary-duration');
  },
  get summaryTime() {
    return $('summary-time');
  },
  get summaryUrl() {
    return $('summary-url');
  },
  get providerGroupList() {
    return $('provider-group-list');
  },
  get providerSearchInput() {
    return $<HTMLInputElement>('provider-search-input');
  },
  get activeFilters() {
    return $('active-filters');
  },
  get providerPopover() {
    return $('provider-popover');
  },
  get btnProviders() {
    return $('btn-providers');
  },
  get filterBar() {
    return $('filter-bar');
  },
  get settingsPopover() {
    return $('settings-popover');
  },
  get filterPopover() {
    return $('filter-popover');
  },
  get filterSubmenu() {
    return $('filter-submenu');
  },
  get filterSubmenuContent() {
    return $('filter-submenu-content');
  },
  get main() {
    return $('main');
  },
  get splitter() {
    return $('splitter');
  },
  get envBadge() {
    return $('adobe-env-badge');
  },
  get envPopover() {
    return $('env-popover');
  },
  get envSeparator() {
    return $('env-separator');
  },
  get envDetectedUrl() {
    return $('env-detected-url');
  },
  get envDetectedType() {
    return $('env-detected-type');
  },
  get envUrlDev() {
    return $('env-url-dev');
  },
  get envUrlAcc() {
    return $('env-url-acc');
  },
  get envUrlProd() {
    return $('env-url-prod');
  },
  get envApply() {
    return $('env-apply');
  },
  get envReset() {
    return $('env-reset');
  },
  get envHostname() {
    return $('env-hostname');
  },
  get consentPopover() {
    return $('consent-popover');
  },
  get infoPopover() {
    return $('info-popover');
  },
  get btnInfo() {
    return $('btn-info');
  },
  get infoProviderGroups() {
    return $('info-provider-groups');
  },
  // ─── DATALAYER REFS ─────────────────────────────────────────────────────
  get dlPushList() {
    return $('dl-push-list');
  },
  get dlDetailPane() {
    return $('dl-detail-pane');
  },
  get dlEmptyState() {
    return $('dl-empty-state');
  },
  get dlSplitter() {
    return $('dl-splitter');
  },
  get dlFilterInput() {
    return $<HTMLInputElement>('dl-filter-input');
  },

  get dlBtnExport() {
    return $('dl-btn-export');
  },
  get dlView() {
    return $('datalayer-view');
  },
  get dlFilterBar() {
    return $('dl-filter-bar');
  },
  get dlMain() {
    return $('dl-main');
  },
  get dlDetailContent() {
    return $('dl-detail-content');
  },
  get dlDetailTabs() {
    return $('dl-detail-tabs');
  },
  get dlDetailBadge() {
    return $('dl-detail-badge');
  },
  get dlDetailTitle() {
    return $('dl-detail-title');
  },
};
