// ─── SHARED CONSTANTS ────────────────────────────────────────────────────────
// SVG icons and app-wide constants

export const COPY_SVG =
  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M10 4V2.5A1.5 1.5 0 008.5 1H2.5A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" stroke="currentColor" stroke-width="1.2"/></svg>';

export interface AppConfig {
  maxRequests: number;
  autoPrune: boolean;
  pruneRatio: number;
  sortOrder: 'asc' | 'desc';
  wrapValues: boolean;
  autoExpand: boolean;
  collapsedGroups: string[];
  hiddenProviders: string[];
  defaultTab: 'decoded' | 'query' | 'post' | 'headers' | 'response';
  compactRows: boolean;
  timestampFormat: 'absolute' | 'relative' | 'elapsed';
  exportFormat: 'json' | 'csv';
  dlSortField: 'time' | 'keycount' | 'source';
  dlSortOrder: 'asc' | 'desc';
  dlGroupBySource: boolean;
  maxDlPushes: number;
  correlationWindowMs: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  maxRequests: 500,
  autoPrune: true,
  pruneRatio: 0.75, // when limit reached, prune down to 75%
  sortOrder: 'asc',
  wrapValues: false,
  autoExpand: false,
  collapsedGroups: [],
  hiddenProviders: [],
  defaultTab: 'decoded',
  compactRows: false,
  timestampFormat: 'absolute',
  exportFormat: 'json',
  dlSortField: 'time',
  dlSortOrder: 'asc',
  dlGroupBySource: false,
  maxDlPushes: 1000,
  correlationWindowMs: 2000,
};

/** Max buffered messages before dropping oldest (panel-bridge, data-layer-relay) */
export const MAX_BUFFER = 500;

/** Debounce delay for filter input (ms) */
export const FILTER_DEBOUNCE_MS = 150;

/** Flash animation duration for copy confirmation (ms) */
export const COPY_FLASH_MS = 800;

/** Slow request threshold duration (ms) */
export const SLOW_REQUEST_THRESHOLD_MS = 1000;

/** Parameter keys that indicate a user ID is present in a request */
export const USER_ID_PARAM_KEYS = ['client_id', 'Client ID', 'cid', 'uid', 'user_id'] as const;
