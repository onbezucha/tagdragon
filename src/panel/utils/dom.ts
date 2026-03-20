// ─── DOM UTILITIES ───────────────────────────────────────────────────────────

/**
 * Get DOM element by ID with type safety.
 */
export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Query selector shorthand with generic type support.
 */
export function qs<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector<T>(selector);
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
  readonly list: HTMLElement | null;
  readonly empty: HTMLElement | null;
  readonly detail: HTMLElement | null;
  readonly detailBadge: HTMLElement | null;
  readonly detailUrl: HTMLElement | null;
  readonly detailContent: HTMLElement | null;
  readonly detailTabs: HTMLElement | null;
  readonly statusStats: HTMLElement | null;
  readonly filterInput: HTMLInputElement | null;
  readonly clearFilter: HTMLElement | null;
  readonly metaMethod: HTMLElement | null;
  readonly metaStatus: HTMLElement | null;
  readonly metaDur: HTMLElement | null;
  readonly metaTs: HTMLElement | null;
  readonly providerPills: HTMLElement | null;
  readonly providerGroupList: HTMLElement | null;
  readonly providerSearchInput: HTMLInputElement | null;
  readonly activeFilters: HTMLElement | null;
  readonly providerBar: HTMLElement | null;
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
}

export const DOM: DOMRefs = {
  get list() { return $('request-list'); },
  get empty() { return $('empty-state'); },
  get detail() { return $('detail-pane'); },
  get detailBadge() { return $('detail-provider-badge'); },
  get detailUrl() { return $('detail-url'); },
  get detailContent() { return $('detail-content'); },
  get detailTabs() { return $('detail-tabs'); },
  get statusStats() { return $('status-stats'); },
  get filterInput() { return $<HTMLInputElement>('filter-input'); },
  get clearFilter() { return $('btn-clear-filter'); },
  get metaMethod() { return $('meta-method'); },
  get metaStatus() { return $('meta-status'); },
  get metaDur() { return $('meta-duration'); },
  get metaTs() { return $('meta-timestamp'); },
  get providerPills() { return $('provider-pills'); },
  get providerGroupList() { return $('provider-group-list'); },
  get providerSearchInput() { return $<HTMLInputElement>('provider-search-input'); },
  get activeFilters() { return $('active-filters'); },
  get providerBar() { return $('provider-bar'); },
  get providerPopover() { return $('provider-popover'); },
  get btnProviders() { return $('btn-providers'); },
  get filterBar() { return $('filter-bar'); },
  get settingsPopover() { return $('settings-popover'); },
  get filterPopover() { return $('filter-popover'); },
  get filterSubmenu() { return $('filter-submenu'); },
  get filterSubmenuContent() { return $('filter-submenu-content'); },
  get main() { return $('main'); },
  get splitter() { return $('splitter'); },
  get envBadge() { return $('adobe-env-badge'); },
  get envPopover() { return $('env-popover'); },
  get envSeparator() { return $('env-separator'); },
  get envDetectedUrl() { return $('env-detected-url'); },
  get envDetectedType() { return $('env-detected-type'); },
  get envUrlDev() { return $('env-url-dev'); },
  get envUrlAcc() { return $('env-url-acc'); },
  get envUrlProd() { return $('env-url-prod'); },
  get envApply() { return $('env-apply'); },
  get envReset() { return $('env-reset'); },
  get envHostname() { return $('env-hostname'); },
};
