// ─── POPUP BRIDGE ─────────────────────────────────────────────────────────────
// Handles messages between the popup and the rest of the extension.
// Runs in background (service worker) context.

import type { TabPopupStats, PopupStatsResponse, UpdatePopupStatsMessage } from '@/types/popup';
import { updateBadgeForTab, updateBadgeForActiveTab } from './badge';

// ─── DEVTOOLS STATUS TRACKING ────────────────────────────────────────────────
// Uses chrome.runtime.connect() ports — port automatically disconnects when
// DevTools is closed, which is more reliable than the window unload event.

const devToolsOpenTabs = new Set<number>();

function initDevToolsTracking(): void {
  chrome.runtime.onConnect.addListener((port) => {
    const match = port.name.match(/^devtools_(\d+)$/);
    if (!match) return;

    const tabId = parseInt(match[1], 10);
    devToolsOpenTabs.add(tabId);

    port.onDisconnect.addListener(() => {
      devToolsOpenTabs.delete(tabId);
    });
  });
}

// ─── MESSAGE HANDLERS ─────────────────────────────────────────────────────────

export function initPopupBridge(): void {
  initDevToolsTracking();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'UPDATE_POPUP_STATS') {
      handleUpdateStats(message as UpdatePopupStatsMessage)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === 'GET_POPUP_STATS') {
      handleGetStats(message.tabId)
        .then(data => sendResponse({ ok: true, data }))
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
  return result['popup_stats'] ?? {};
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab.id;
}

function createEmptyStats(tabId: number): TabPopupStats {
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

async function handleUpdateStats(message: UpdatePopupStatsMessage): Promise<void> {
  const allStats = await loadAllStats();
  const stats: TabPopupStats = allStats[message.tabId] ?? createEmptyStats(message.tabId);

  stats.totalRequests++;
  stats.totalSize += message.size || 0;
  stats.totalDuration += message.duration || 0;
  if (message.status >= 200 && message.status < 300) stats.successCount++;

  const now = new Date().toISOString();
  stats.lastRequest = now;
  if (!stats.firstRequest) stats.firstRequest = now;

  const existing = stats.providers.find(p => p.name === message.provider);
  if (existing) {
    existing.count++;
  } else {
    stats.providers.push({ name: message.provider, color: message.color, count: 1 });
  }
  stats.providers.sort((a, b) => b.count - a.count);

  allStats[message.tabId] = stats;
  await chrome.storage.session.set({ popup_stats: allStats });
  await updateBadgeForTab(message.tabId, stats.totalRequests);
}

async function handleGetStats(tabId?: number): Promise<PopupStatsResponse> {
  const targetTabId = tabId ?? await getActiveTabId();
  const allStats = await loadAllStats();
  const stats = allStats[targetTabId] ?? createEmptyStats(targetTabId);
  return buildPopupResponse(stats, targetTabId);
}

function buildPopupResponse(stats: TabPopupStats, tabId: number): PopupStatsResponse {
  const TOP_N = 5;
  const topProviders = stats.providers.slice(0, TOP_N);
  const others = stats.providers.slice(TOP_N);

  return {
    ...stats,
    isDevToolsOpen: devToolsOpenTabs.has(tabId),
    avgDuration: stats.totalRequests > 0
      ? Math.round(stats.totalDuration / stats.totalRequests)
      : 0,
    successRate: stats.totalRequests > 0
      ? Math.round((stats.successCount / stats.totalRequests) * 100)
      : 100,
    topProviders,
    otherProvidersCount: others.length,
    otherProvidersTotal: others.reduce((sum, p) => sum + p.count, 0),
  };
}

async function handleSetPaused(tabId: number | undefined, paused: boolean): Promise<void> {
  const targetTabId = tabId ?? await getActiveTabId();
  const allStats = await loadAllStats();
  const stats = allStats[targetTabId] ?? createEmptyStats(targetTabId);
  stats.isPaused = paused;
  allStats[targetTabId] = stats;
  await chrome.storage.session.set({ popup_stats: allStats });

  // Notify devtools script so it can stop/resume processing requests
  chrome.runtime.sendMessage({
    type: paused ? 'RECORDING_PAUSED' : 'RECORDING_RESUMED',
    tabId: targetTabId,
  }).catch(() => {
    // DevTools may be closed, that's fine
  });
}

async function handleClear(tabId?: number): Promise<void> {
  const targetTabId = tabId ?? await getActiveTabId();
  const allStats = await loadAllStats();
  delete allStats[targetTabId];
  await chrome.storage.session.set({ popup_stats: allStats });
  await updateBadgeForTab(targetTabId, 0);
}
