// ─── DOM UTILITIES ───────────────────────────────────────────────────────────

import { COPY_FLASH_MS } from '@/shared/constants';

/**
 * Apply a copy-flash animation to an element.
 * Adds 'copied' class and removes it after COPY_FLASH_MS.
 */
export function flashCopyFeedback(el: HTMLElement): void {
  el.classList.add('copied');
  setTimeout(() => el.classList.remove('copied'), COPY_FLASH_MS);
}

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
  readonly btnProviders: HTMLElement | null;
  readonly filterBar: HTMLElement | null;
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
  // ─── SETTINGS POPOVER REFS ─────────────────────────────────────────────
  readonly settingsPopover: HTMLElement | null;
  readonly popoverBody: HTMLElement | null;
  readonly btnSettingsClose: HTMLElement | null;
  readonly settingsSearch: HTMLInputElement | null;
  // ─── PROVIDER FILTER POPOVER REFS ──────────────────────────────────
  readonly providerFilterPopover: HTMLElement | null;
  readonly providerPopoverBody: HTMLElement | null;
  readonly btnProviderPopoverClose: HTMLElement | null;
}

// ─── LAZY CACHE VARIABLES ────────────────────────────────────────────────────

let _globalTabBar: HTMLElement | null | undefined;
let _tabBadgeNetwork: HTMLElement | null | undefined;
let _tabBadgeDatalayer: HTMLElement | null | undefined;
let _networkContext: HTMLElement | null | undefined;
let _datalayerContext: HTMLElement | null | undefined;
let _list: HTMLElement | null | undefined;
let _empty: HTMLElement | null | undefined;
let _detail: HTMLElement | null | undefined;
let _summaryProviderIcon: HTMLElement | null | undefined;
let _summaryProviderName: HTMLElement | null | undefined;
let _summaryEventName: HTMLElement | null | undefined;
let _summaryMethod: HTMLElement | null | undefined;
let _detailContent: HTMLElement | null | undefined;
let _detailTabs: HTMLElement | null | undefined;
let _triggeredByBanner: HTMLElement | null | undefined;
let _statusStats: HTMLElement | null | undefined;
let _sizeBadge: HTMLElement | null | undefined;
let _timeBadge: HTMLElement | null | undefined;
let _filterInput: HTMLInputElement | null | undefined;
let _clearFilter: HTMLElement | null | undefined;
let _summaryStatus: HTMLElement | null | undefined;
let _summaryDuration: HTMLElement | null | undefined;
let _summaryTime: HTMLElement | null | undefined;
let _summaryUrl: HTMLElement | null | undefined;
let _providerGroupList: HTMLElement | null | undefined;
let _providerSearchInput: HTMLInputElement | null | undefined;
let _activeFilters: HTMLElement | null | undefined;
let _btnProviders: HTMLElement | null | undefined;
let _filterBar: HTMLElement | null | undefined;
let _main: HTMLElement | null | undefined;
let _splitter: HTMLElement | null | undefined;
let _envBadge: HTMLElement | null | undefined;
let _envPopover: HTMLElement | null | undefined;
let _envSeparator: HTMLElement | null | undefined;
let _envDetectedUrl: HTMLElement | null | undefined;
let _envDetectedType: HTMLElement | null | undefined;
let _envUrlDev: HTMLElement | null | undefined;
let _envUrlAcc: HTMLElement | null | undefined;
let _envUrlProd: HTMLElement | null | undefined;
let _envApply: HTMLElement | null | undefined;
let _envReset: HTMLElement | null | undefined;
let _envHostname: HTMLElement | null | undefined;
let _consentPopover: HTMLElement | null | undefined;
let _infoPopover: HTMLElement | null | undefined;
let _btnInfo: HTMLElement | null | undefined;
let _infoProviderGroups: HTMLElement | null | undefined;
let _dlPushList: HTMLElement | null | undefined;
let _dlDetailPane: HTMLElement | null | undefined;
let _dlEmptyState: HTMLElement | null | undefined;
let _dlSplitter: HTMLElement | null | undefined;
let _dlFilterInput: HTMLInputElement | null | undefined;

let _dlBtnExport: HTMLElement | null | undefined;
let _dlView: HTMLElement | null | undefined;
let _dlFilterBar: HTMLElement | null | undefined;
let _dlMain: HTMLElement | null | undefined;
let _dlDetailContent: HTMLElement | null | undefined;
let _dlDetailTabs: HTMLElement | null | undefined;
let _dlDetailBadge: HTMLElement | null | undefined;
let _dlDetailTitle: HTMLElement | null | undefined;
let _settingsPopover: HTMLElement | null | undefined;
let _popoverBody: HTMLElement | null | undefined;
let _btnSettingsClose: HTMLElement | null | undefined;
let _settingsSearch: HTMLInputElement | null | undefined;
let _providerFilterPopover: HTMLElement | null | undefined;
let _providerPopoverBody: HTMLElement | null | undefined;
let _btnProviderPopoverClose: HTMLElement | null | undefined;

export const DOM: DOMRefs = {
  // ─── TOOLBAR REFS ──────────────────────────────────────────────────────
  get globalTabBar() {
    if (_globalTabBar === undefined) _globalTabBar = $('global-tab-bar');
    return _globalTabBar;
  },
  get tabBadgeNetwork() {
    if (_tabBadgeNetwork === undefined) _tabBadgeNetwork = $('tab-badge-network');
    return _tabBadgeNetwork;
  },
  get tabBadgeDatalayer() {
    if (_tabBadgeDatalayer === undefined) _tabBadgeDatalayer = $('tab-badge-datalayer');
    return _tabBadgeDatalayer;
  },
  get networkContext() {
    if (_networkContext === undefined) _networkContext = $('network-context');
    return _networkContext;
  },
  get datalayerContext() {
    if (_datalayerContext === undefined) _datalayerContext = $('datalayer-context');
    return _datalayerContext;
  },
  // ─── NETWORK REFS ───────────────────────────────────────────────────────
  get list() {
    if (_list === undefined) _list = $('request-list');
    return _list;
  },
  get empty() {
    if (_empty === undefined) _empty = $('empty-state');
    return _empty;
  },
  get detail() {
    if (_detail === undefined) _detail = $('detail-pane');
    return _detail;
  },
  get summaryProviderIcon() {
    if (_summaryProviderIcon === undefined) _summaryProviderIcon = $('summary-provider-icon');
    return _summaryProviderIcon;
  },
  get summaryProviderName() {
    if (_summaryProviderName === undefined) _summaryProviderName = $('summary-provider-name');
    return _summaryProviderName;
  },
  get summaryEventName() {
    if (_summaryEventName === undefined) _summaryEventName = $('summary-event-name');
    return _summaryEventName;
  },
  get summaryMethod() {
    if (_summaryMethod === undefined) _summaryMethod = $('summary-method');
    return _summaryMethod;
  },
  get detailContent() {
    if (_detailContent === undefined) _detailContent = $('detail-content');
    return _detailContent;
  },
  get detailTabs() {
    if (_detailTabs === undefined) _detailTabs = $('detail-tabs');
    return _detailTabs;
  },
  get triggeredByBanner() {
    if (_triggeredByBanner === undefined) _triggeredByBanner = $('triggered-by-banner');
    return _triggeredByBanner;
  },
  get statusStats() {
    if (_statusStats === undefined) _statusStats = $('status-stats');
    return _statusStats;
  },
  get sizeBadge() {
    if (_sizeBadge === undefined) _sizeBadge = $('size-badge');
    return _sizeBadge;
  },
  get timeBadge() {
    if (_timeBadge === undefined) _timeBadge = $('time-badge');
    return _timeBadge;
  },
  get filterInput() {
    if (_filterInput === undefined) _filterInput = $<HTMLInputElement>('filter-input');
    return _filterInput;
  },
  get clearFilter() {
    if (_clearFilter === undefined) _clearFilter = $('btn-clear-filter');
    return _clearFilter;
  },
  get summaryStatus() {
    if (_summaryStatus === undefined) _summaryStatus = $('summary-status');
    return _summaryStatus;
  },
  get summaryDuration() {
    if (_summaryDuration === undefined) _summaryDuration = $('summary-duration');
    return _summaryDuration;
  },
  get summaryTime() {
    if (_summaryTime === undefined) _summaryTime = $('summary-time');
    return _summaryTime;
  },
  get summaryUrl() {
    if (_summaryUrl === undefined) _summaryUrl = $('summary-url');
    return _summaryUrl;
  },
  get providerGroupList() {
    if (_providerGroupList === undefined) _providerGroupList = $('provider-group-list');
    return _providerGroupList;
  },
  get providerSearchInput() {
    if (_providerSearchInput === undefined)
      _providerSearchInput = $<HTMLInputElement>('provider-search-input');
    return _providerSearchInput;
  },
  get activeFilters() {
    if (_activeFilters === undefined) _activeFilters = $('active-filters');
    return _activeFilters;
  },
  get btnProviders() {
    if (_btnProviders === undefined) _btnProviders = $('btn-providers');
    return _btnProviders;
  },
  get filterBar() {
    if (_filterBar === undefined) _filterBar = $('filter-bar');
    return _filterBar;
  },
  get main() {
    if (_main === undefined) _main = $('main');
    return _main;
  },
  get splitter() {
    if (_splitter === undefined) _splitter = $('splitter');
    return _splitter;
  },
  get envBadge() {
    if (_envBadge === undefined) _envBadge = $('adobe-env-badge');
    return _envBadge;
  },
  get envPopover() {
    if (_envPopover === undefined) _envPopover = $('env-popover');
    return _envPopover;
  },
  get envSeparator() {
    if (_envSeparator === undefined) _envSeparator = $('env-separator');
    return _envSeparator;
  },
  get envDetectedUrl() {
    if (_envDetectedUrl === undefined) _envDetectedUrl = $('env-detected-url');
    return _envDetectedUrl;
  },
  get envDetectedType() {
    if (_envDetectedType === undefined) _envDetectedType = $('env-detected-type');
    return _envDetectedType;
  },
  get envUrlDev() {
    if (_envUrlDev === undefined) _envUrlDev = $('env-url-dev');
    return _envUrlDev;
  },
  get envUrlAcc() {
    if (_envUrlAcc === undefined) _envUrlAcc = $('env-url-acc');
    return _envUrlAcc;
  },
  get envUrlProd() {
    if (_envUrlProd === undefined) _envUrlProd = $('env-url-prod');
    return _envUrlProd;
  },
  get envApply() {
    if (_envApply === undefined) _envApply = $('env-apply');
    return _envApply;
  },
  get envReset() {
    if (_envReset === undefined) _envReset = $('env-reset');
    return _envReset;
  },
  get envHostname() {
    if (_envHostname === undefined) _envHostname = $('env-hostname');
    return _envHostname;
  },
  get consentPopover() {
    if (_consentPopover === undefined) _consentPopover = $('consent-popover');
    return _consentPopover;
  },
  get infoPopover() {
    if (_infoPopover === undefined) _infoPopover = $('info-popover');
    return _infoPopover;
  },
  get btnInfo() {
    if (_btnInfo === undefined) _btnInfo = $('btn-info');
    return _btnInfo;
  },
  get infoProviderGroups() {
    if (_infoProviderGroups === undefined) _infoProviderGroups = $('info-provider-groups');
    return _infoProviderGroups;
  },
  // ─── DATALAYER REFS ─────────────────────────────────────────────────────
  get dlPushList() {
    if (_dlPushList === undefined) _dlPushList = $('dl-push-list');
    return _dlPushList;
  },
  get dlDetailPane() {
    if (_dlDetailPane === undefined) _dlDetailPane = $('dl-detail-pane');
    return _dlDetailPane;
  },
  get dlEmptyState() {
    if (_dlEmptyState === undefined) _dlEmptyState = $('dl-empty-state');
    return _dlEmptyState;
  },
  get dlSplitter() {
    if (_dlSplitter === undefined) _dlSplitter = $('dl-splitter');
    return _dlSplitter;
  },
  get dlFilterInput() {
    if (_dlFilterInput === undefined) _dlFilterInput = $<HTMLInputElement>('dl-filter-input');
    return _dlFilterInput;
  },

  get dlBtnExport() {
    if (_dlBtnExport === undefined) _dlBtnExport = $('dl-btn-export');
    return _dlBtnExport;
  },
  get dlView() {
    if (_dlView === undefined) _dlView = $('datalayer-view');
    return _dlView;
  },
  get dlFilterBar() {
    if (_dlFilterBar === undefined) _dlFilterBar = $('dl-filter-bar');
    return _dlFilterBar;
  },
  get dlMain() {
    if (_dlMain === undefined) _dlMain = $('dl-main');
    return _dlMain;
  },
  get dlDetailContent() {
    if (_dlDetailContent === undefined) _dlDetailContent = $('dl-detail-content');
    return _dlDetailContent;
  },
  get dlDetailTabs() {
    if (_dlDetailTabs === undefined) _dlDetailTabs = $('dl-detail-tabs');
    return _dlDetailTabs;
  },
  get dlDetailBadge() {
    if (_dlDetailBadge === undefined) _dlDetailBadge = $('dl-detail-badge');
    return _dlDetailBadge;
  },
  get dlDetailTitle() {
    if (_dlDetailTitle === undefined) _dlDetailTitle = $('dl-detail-title');
    return _dlDetailTitle;
  },
  // ─── SETTINGS POPOVER REFS ─────────────────────────────────────────────
  get settingsPopover() {
    if (_settingsPopover === undefined) _settingsPopover = $('settings-popover');
    return _settingsPopover;
  },
  get popoverBody() {
    if (_popoverBody === undefined) _popoverBody = $('popover-body');
    return _popoverBody;
  },
  get btnSettingsClose() {
    if (_btnSettingsClose === undefined) _btnSettingsClose = $('btn-settings-close');
    return _btnSettingsClose;
  },
  get settingsSearch() {
    if (_settingsSearch === undefined) _settingsSearch = $<HTMLInputElement>('settings-search');
    return _settingsSearch;
  },
  // ─── PROVIDER FILTER POPOVER REFS ──────────────────────────────────
  get providerFilterPopover() {
    if (_providerFilterPopover === undefined) _providerFilterPopover = $('provider-filter-popover');
    return _providerFilterPopover;
  },
  get providerPopoverBody() {
    if (_providerPopoverBody === undefined) _providerPopoverBody = $('provider-popover-body');
    return _providerPopoverBody;
  },
  get btnProviderPopoverClose() {
    if (_btnProviderPopoverClose === undefined)
      _btnProviderPopoverClose = $('btn-provider-popover-close');
    return _btnProviderPopoverClose;
  },
};
