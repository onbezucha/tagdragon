// ─── BADGE COUNTER ────────────────────────────────────────────────────────────
// Updates the extension icon badge with the request count for the active tab.

import type { TabPopupStats } from '@/types/popup';
import { invalidateStatsCache } from './popup-bridge';

const BADGE_COLOR = '#e8710a';

export function initBadge(): void {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });

  // Update badge when the active tab changes
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    updateBadgeForActiveTab(tabId).catch(() => {});
  });

  // Clean up stats when a tab is closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    cleanupTabStats(tabId).catch(() => {});
  });
}

/**
 * Update badge for a specific tab — only updates if that tab is currently active.
 */
export async function updateBadgeForTab(tabId: number, count: number): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === tabId) {
    await setBadgeCount(count);
  }
}

/**
 * Update badge to reflect stats of the given (or currently active) tab.
 */
export async function updateBadgeForActiveTab(tabId?: number): Promise<void> {
  const targetTabId =
    tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (!targetTabId) {
    await setBadgeCount(0);
    return;
  }

  const result = await chrome.storage.session.get('popup_stats');
  const allStats = (result['popup_stats'] ?? {}) as Record<number, TabPopupStats>;
  const stats = allStats[targetTabId];
  await setBadgeCount(stats?.totalRequests ?? 0);
}

async function setBadgeCount(count: number): Promise<void> {
  const text = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
  await chrome.action.setBadgeText({ text });
}

async function cleanupTabStats(tabId: number): Promise<void> {
  const result = await chrome.storage.session.get('popup_stats');
  const allStats = (result['popup_stats'] ?? {}) as Record<number, TabPopupStats>;
  delete allStats[tabId];
  await chrome.storage.session.set({ popup_stats: allStats });
  invalidateStatsCache();
}
