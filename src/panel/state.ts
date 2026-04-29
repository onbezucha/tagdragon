// ─── APPLICATION STATE ───────────────────────────────────────────────────────
// Centralized state management for the panel with full type safety

import type {
  ParsedRequest,
  RequestState,
  UIState,
  FilterState,
  StatsState,
  TabName,
  PendingRequest,
  AdobeEnvState,
} from '@/types/request';
import { DEFAULT_CONFIG } from '@/shared/constants';
import type { AppConfig } from '@/shared/constants';

// ─── STATE CONTAINERS ────────────────────────────────────────────────────────

/**
 * Request data store: all captured requests with fast O(1) lookup by ID
 * and filtered set for efficient filtering operations
 */
const requestState: RequestState = {
  all: [],
  map: new Map(),
  filteredIds: new Set(),
};

/**
 * UI state: selected request, pause status, and active tab
 */
const uiState: UIState = {
  selectedId: null,
  isPaused: false,
  activeTab: 'decoded',
};

/**
 * Filter state: text search and field-specific filters
 */
const filterState: FilterState = {
  text: '',
  eventType: '',
  userId: '',
  status: '',
  method: '',
  hasParam: '',
};

/**
 * Statistics accumulators: visible count, total size, and total duration
 */
const statsState: StatsState = {
  visibleCount: 0,
  totalSize: 0,
  totalDuration: 0,
};

/**
 * Application configuration: loaded from chrome.storage.local
 */
let config: AppConfig = { ...DEFAULT_CONFIG };

// ─── PROVIDER STATE ──────────────────────────────────────────────────────────

/**
 * Set of provider names that have been detected in the current session
 */
const activeProviders = new Set<string>();

/**
 * Set of provider names hidden by the user in the provider bar
 */
const hiddenProviders = new Set<string>();

// ─── BATCHING STATE ──────────────────────────────────────────────────────────

/**
 * Queue of pending requests waiting to be added to the DOM.
 * Used for batching updates to improve performance.
 */
let pendingRequests: PendingRequest[] = [];

/**
 * RequestAnimationFrame ID for batched request processing
 */
let rafId: number | null = null;

// ─── ADOBE ENV STATE ─────────────────────────────────────────────────────────

/**
 * Adobe Launch/AEP environment detection and configuration state.
 * Used to track detected environment, user config, and selected environment.
 */
export const adobeEnvState: AdobeEnvState = {
  detected: null,
  config: null,
  selectedEnv: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new request to the state.
 * Inserts into both allRequests array and requestMap for fast lookup.
 */
export function addRequest(data: ParsedRequest): void {
  requestState.all.push(data);
  requestState.map.set(String(data.id), data);
}

/**
 * Clear all requests and reset request-related state.
 */
export function clearRequests(): void {
  requestState.all = [];
  requestState.map.clear();
  requestState.filteredIds.clear();
  activeProviders.clear();
}

/**
 * Check if a request exists by ID. Convenience method.
 */
export function hasRequest(id: string | number | null): boolean {
  if (id === null) return false;
  return requestState.map.has(String(id));
}

/**
 * Get a request by its ID.
 */
export function getRequest(id: string | number | null): ParsedRequest | undefined {
  if (id === null) return undefined;
  return requestState.map.get(String(id));
}

/**
 * Delete a request by its ID.
 */
export function deleteRequestById(id: string | number): void {
  const strId = String(id);
  const index = requestState.all.findIndex((r) => String(r.id) === strId);
  if (index !== -1) {
    requestState.all.splice(index, 1);
  }
  requestState.map.delete(strId);
  requestState.filteredIds.delete(strId);
}

/**
 * Get all requests in the order they were captured.
 */
export function getAllRequests(): ParsedRequest[] {
  return requestState.all;
}

/**
 * Get the internal request map for direct access. Use with care.
 */
export function getRequestMap(): Map<string, ParsedRequest> {
  return requestState.map;
}

/**
 * Get the set of filtered request IDs (currently visible).
 */
export function getFilteredIds(): Set<string> {
  return requestState.filteredIds;
}

/**
 * Add a request ID to the filtered set (mark as visible).
 */
export function addFilteredId(id: string): void {
  requestState.filteredIds.add(id);
}

/**
 * Remove a request ID from the filtered set (mark as not visible).
 */
export function removeFromFiltered(id: string): void {
  requestState.filteredIds.delete(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the currently selected request ID.
 */
export function getSelectedId(): string | null {
  return uiState.selectedId;
}

/**
 * Set the currently selected request ID (null to deselect).
 */
export function setSelectedId(id: string | null): void {
  uiState.selectedId = id;
}

/**
 * Check if request capture is paused.
 */
export function getIsPaused(): boolean {
  return uiState.isPaused;
}

/**
 * Set the pause state for request capture.
 */
export function setIsPaused(paused: boolean): void {
  uiState.isPaused = paused;
}

/**
 * Get the currently active detail pane tab.
 */
export function getActiveTab(): TabName {
  return uiState.activeTab;
}

/**
 * Set the currently active detail pane tab.
 */
export function setActiveTab(tab: TabName): void {
  uiState.activeTab = tab;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER STATE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current text search filter.
 */
export function getFilterText(): string {
  return filterState.text;
}

/**
 * Set the text search filter.
 */
export function setFilterText(text: string): void {
  filterState.text = text;
}

/**
 * Get the current event type filter.
 */
export function getFilterEventType(): string {
  return filterState.eventType;
}

/**
 * Set the event type filter.
 */
export function setFilterEventType(type: string): void {
  filterState.eventType = type;
}

/**
 * Get the current user ID filter.
 */
export function getFilterUserId(): string {
  return filterState.userId;
}

/**
 * Set the user ID filter.
 */
export function setFilterUserId(userId: string): void {
  filterState.userId = userId;
}

/**
 * Get the current HTTP status filter.
 */
export function getFilterStatus(): string {
  return filterState.status;
}

/**
 * Set the HTTP status filter.
 */
export function setFilterStatus(status: string): void {
  filterState.status = status;
}

/**
 * Get the current HTTP method filter.
 */
export function getFilterMethod(): '' | 'GET' | 'POST' {
  return filterState.method as '' | 'GET' | 'POST';
}

/**
 * Set the HTTP method filter.
 */
export function setFilterMethod(method: '' | 'GET' | 'POST'): void {
  filterState.method = method;
}

/**
 * Get the current "has parameter" filter.
 */
export function getFilterHasParam(): string {
  return filterState.hasParam;
}

/**
 * Set the "has parameter" filter.
 */
export function setFilterHasParam(param: string): void {
  filterState.hasParam = param;
}

/**
 * Reset all filters to their default empty values.
 */
export function resetFilters(): void {
  filterState.text = '';
  filterState.eventType = '';
  filterState.userId = '';
  filterState.status = '';
  filterState.method = '';
  filterState.hasParam = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a read-only view of the entire stats state.
 */
export function getStats(): Readonly<StatsState> {
  return { ...statsState };
}

/**
 * Reset all statistics to zero.
 */
export function resetStats(): void {
  statsState.visibleCount = 0;
  statsState.totalSize = 0;
  statsState.totalDuration = 0;
}

/**
 * Replace stats with new values (used during filter updates).
 */
export function updateStats(count: number, size: number, duration: number): void {
  statsState.visibleCount = count;
  statsState.totalSize = size;
  statsState.totalDuration = duration;
}

/**
 * Increment stats by adding a single request's data.
 * Used when adding requests one at a time.
 */
export function incrementStats(size: number, duration: number): void {
  statsState.visibleCount++;
  statsState.totalSize += size || 0;
  statsState.totalDuration += duration || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the set of active (detected) providers.
 */
export function getActiveProviders(): Set<string> {
  return activeProviders;
}

/**
 * Get the set of hidden providers.
 */
export function getHiddenProviders(): Set<string> {
  return hiddenProviders;
}

/**
 * Hide a provider in the provider bar.
 */
export function addHiddenProvider(name: string): void {
  hiddenProviders.add(name);
}

/**
 * Unhide a previously hidden provider.
 */
export function removeHiddenProvider(name: string): void {
  hiddenProviders.delete(name);
}

/**
 * Check if a provider is hidden.
 */
export function isProviderHidden(name: string): boolean {
  return hiddenProviders.has(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCHING OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current queue of pending requests.
 */
export function getPendingRequests(): PendingRequest[] {
  return pendingRequests;
}

/**
 * Add a request to the pending batch queue.
 */
export function addPendingRequest(item: PendingRequest): void {
  pendingRequests.push(item);
}

/**
 * Clear the pending requests queue.
 */
export function clearPendingRequests(): void {
  pendingRequests = [];
}

/**
 * Get the current RequestAnimationFrame ID.
 */
export function getRafId(): number | null {
  return rafId;
}

/**
 * Set the RequestAnimationFrame ID.
 */
export function setRafId(id: number | null): void {
  rafId = id;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a read-only view of the current configuration.
 */
export function getConfig(): Readonly<AppConfig> {
  return { ...config };
}

/**
 * Load configuration from chrome.storage.local.
 * Falls back to DEFAULT_CONFIG if storage is unavailable.
 */
export async function loadConfig(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('rt_config');
    if (stored.rt_config) {
      config = { ...DEFAULT_CONFIG, ...stored.rt_config };
    }
  } catch (error) {
    // Fallback to defaults (storage may not be available in all contexts)
    console.warn('Request Tracker: Config load failed, using defaults', error);
  }
  const storedHidden: string[] = config.hiddenProviders ?? [];
  hiddenProviders.clear();
  storedHidden.forEach((p) => hiddenProviders.add(p));
}

/**
 * Persist current hiddenProviders Set to AppConfig.
 */
export function syncHiddenProviders(): void {
  updateConfig('hiddenProviders', [...hiddenProviders]);
}

/**
 * Save current configuration to chrome.storage.local.
 * Logs a warning if save fails (non-fatal).
 */
async function saveConfig(): Promise<void> {
  try {
    await chrome.storage.local.set({ rt_config: config });
  } catch (error) {
    console.warn('Request Tracker: Config save failed', error);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveConfig();
  }, 300);
}

/**
 * Update a specific config value and persist it.
 * Generic function signature ensures type-safe key-value updates.
 */
export function updateConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  config[key] = value;
  scheduleSave();
}

/**
 * Update a config value and persist immediately (no debounce).
 * Use for user-initiated changes where persistence is critical.
 */
export function updateConfigImmediate<K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void {
  config[key] = value;
  void saveConfig();
}

/**
 * Reset all config values to defaults and persist immediately.
 */
export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG };
  void saveConfig();
}

// Flush debounced config save on panel close to prevent data loss
window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    void saveConfig();
  }
});
