// ─── POPUP BRIDGE ─────────────────────────────────────────────────────────────
// Handles messages between the popup and the rest of the extension.
// Runs in background (service worker) context.

import type {
  TabPopupStats,
  PopupStatsResponse,
  UpdatePopupStatsMessage,
  UpdatePopupStatsBatchMessage,
} from '@/types/popup';
import { updateBadgeForTab } from './badge';
import { devToolsPorts } from './index';

// ─── IN-MEMORY STATS CACHE ──────────────────────────────────────────────────
// Prevents TOCTOU race conditions when multiple UPDATE_POPUP_STATS messages
// arrive in quick succession. Stats are accumulated in memory and flushed
// to chrome.storage.session with a debounce.
let _statsCache: Record<number, TabPopupStats> | null = null;
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

async function loadStatsCache(): Promise<Record<number, TabPopupStats>> {
  if (!_statsCache) {
    _statsCache = await loadAllStats();
  }
  return _statsCache;
}

function scheduleFlush(): void {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    if (_statsCache) {
      try {
        await chrome.storage.session.set({ popup_stats: _statsCache });
      } catch {
        /* storage write failed, data is still in memory cache */
      }
    }
  }, 100);
}

// ─── CACHE INVALIDATION ───────────────────────────────────────────────────────

/**
 * Invalidate the in-memory stats cache.
 * Call this whenever storage is mutated outside of the normal update path
 * (e.g. when a tab is closed and its entry is deleted directly from storage).
 */
export function invalidateStatsCache(): void {
  _statsCache = null;
}

// ─── MESSAGE HANDLERS ─────────────────────────────────────────────────────────

export function initPopupBridge(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'UPDATE_POPUP_STATS') {
      handleUpdateStats(message as UpdatePopupStatsMessage)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === 'UPDATE_POPUP_STATS_BATCH') {
      handleUpdateStatsBatch(message as UpdatePopupStatsBatchMessage)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === 'GET_POPUP_STATS') {
      handleGetStats(message.tabId)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    if (message.type === 'PAUSE_RECORDING') {
      handleSetPaused(message.tabId, true)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === 'RESUME_RECORDING') {
      handleSetPaused(message.tabId, false)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === 'CLEAR_REQUESTS') {
      handleClear(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
  });
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────

async function loadAllStats(): Promise<Record<number, TabPopupStats>> {
  const result = await chrome.storage.session.get('popup_stats');
  return (result['popup_stats'] ?? {}) as Record<number, TabPopupStats>;
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab.id;
}

export function createEmptyStats(tabId: number): TabPopupStats {
  return {
    tabId,
    totalRequests: 0,
    totalSize: 0,
    totalDuration: 0,
    successCount: 0,
    providers: [],
    firstRequest: null,
    lastRequest: null,
    isPaused: false,
  };
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

interface StatsUpdate {
  provider: string;
  color: string;
  size: number;
  duration: number;
  status: number;
}

/**
 * Accumulate a single update into the stats object.
 * Shared between single and batch update handlers.
 */
export function accumulateStatsUpdate(stats: TabPopupStats, update: StatsUpdate): void {
  stats.totalRequests++;
  stats.totalSize += update.size || 0;
  stats.totalDuration += update.duration || 0;
  if (update.status >= 200 && update.status < 300) stats.successCount++;
  const existing = stats.providers.find((p) => p.name === update.provider);
  if (existing) {
    existing.count++;
  } else {
    stats.providers.push({ name: update.provider, color: update.color, count: 1 });
  }
}

async function handleUpdateStats(message: UpdatePopupStatsMessage): Promise<void> {
  if (typeof message.tabId !== 'number' || message.tabId <= 0) return;
  const allStats = await loadStatsCache();
  const stats: TabPopupStats = allStats[message.tabId] ?? createEmptyStats(message.tabId);

  const now = new Date().toISOString();
  stats.lastRequest = now;
  if (!stats.firstRequest) stats.firstRequest = now;

  accumulateStatsUpdate(stats, message);
  stats.providers.sort((a, b) => b.count - a.count);

  allStats[message.tabId] = stats;
  scheduleFlush();
  await updateBadgeForTab(message.tabId, stats.totalRequests);
}

async function handleUpdateStatsBatch(message: UpdatePopupStatsBatchMessage): Promise<void> {
  if (typeof message.tabId !== 'number' || message.tabId <= 0) return;
  if (!Array.isArray(message.updates) || message.updates.length === 0) return;
  const allStats = await loadStatsCache();
  const stats: TabPopupStats = allStats[message.tabId] ?? createEmptyStats(message.tabId);

  const now = new Date().toISOString();
  stats.lastRequest = now;
  if (!stats.firstRequest) stats.firstRequest = now;

  for (const update of message.updates) {
    accumulateStatsUpdate(stats, update);
  }
  stats.providers.sort((a, b) => b.count - a.count);

  allStats[message.tabId] = stats;
  scheduleFlush();
  await updateBadgeForTab(message.tabId, stats.totalRequests);
}

async function handleGetStats(tabId?: number): Promise<PopupStatsResponse> {
  if (typeof tabId !== 'number' || tabId <= 0) return buildPopupResponse(createEmptyStats(0), 0);
  const targetTabId = tabId ?? (await getActiveTabId());
  const allStats = await loadStatsCache();
  const stats = allStats[targetTabId] ?? createEmptyStats(targetTabId);
  return buildPopupResponse(stats, targetTabId);
}

export function buildPopupResponse(stats: TabPopupStats, tabId: number): PopupStatsResponse {
  const TOP_N = 5;
  const topProviders = stats.providers.slice(0, TOP_N);
  const others = stats.providers.slice(TOP_N);

  return {
    ...stats,
    isDevToolsOpen: devToolsPorts.has(tabId),
    avgDuration:
      stats.totalRequests > 0 ? Math.round(stats.totalDuration / stats.totalRequests) : 0,
    successRate:
      stats.totalRequests > 0 ? Math.round((stats.successCount / stats.totalRequests) * 100) : 100,
    topProviders,
    otherProvidersCount: others.length,
    otherProvidersTotal: others.reduce((sum, p) => sum + p.count, 0),
  };
}

async function handleSetPaused(tabId: number | undefined, paused: boolean): Promise<void> {
  if (typeof tabId !== 'number' || tabId <= 0) return;
  const allStats = await loadStatsCache();
  const stats = allStats[tabId] ?? createEmptyStats(tabId);
  stats.isPaused = paused;
  allStats[tabId] = stats;
  scheduleFlush();

  // Notify only the specific tab's DevTools panel — avoids broadcasting to all open panels
  const port = devToolsPorts.get(tabId);
  if (port) {
    port.postMessage({ type: paused ? 'RECORDING_PAUSED' : 'RECORDING_RESUMED' });
  }
}

async function handleClear(tabId?: number): Promise<void> {
  if (typeof tabId !== 'number' || tabId <= 0) return;
  const targetTabId = tabId ?? (await getActiveTabId());
  const allStats = await loadStatsCache();
  delete allStats[targetTabId];
  scheduleFlush();
  await updateBadgeForTab(targetTabId, 0);
}
