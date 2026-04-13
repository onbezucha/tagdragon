// ─── POPUP ────────────────────────────────────────────────────────────────────
// Quick-view popup showing request statistics for the active tab.

import type { PopupStatsResponse, ProviderStats } from '@/types/popup';
import { formatBytes } from '@/panel/utils/format';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────

const $devtoolsWarning = document.getElementById('devtools-warning') as HTMLElement;
const $statusDot = document.getElementById('status-dot') as HTMLElement;
const $statusText = document.getElementById('status-text') as HTMLElement;
const $btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const $pauseText = $btnPause.querySelector('.pause-text') as HTMLElement;
const $pauseIcon = $btnPause.querySelector('.pause-icon') as HTMLElement;
const $providersEmpty = document.getElementById('providers-empty') as HTMLElement;
const $providersList = document.getElementById('providers-list') as HTMLElement;
const $btnShowAll = document.getElementById('btn-show-all') as HTMLButtonElement;
const $othersCount = document.getElementById('others-count') as HTMLElement;
const $totalRequests = document.getElementById('total-requests') as HTMLElement;
const $totalSize = document.getElementById('total-size') as HTMLElement;
const $avgDuration = document.getElementById('avg-duration') as HTMLElement;
const $successRate = document.getElementById('success-rate') as HTMLElement;
const $lastActivity = document.getElementById('last-activity') as HTMLElement;
const $btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

// ─── STATE ────────────────────────────────────────────────────────────────────

let currentTabId: number | null = null;
let currentStats: PopupStatsResponse | null = null;
let showAllProviders = false;

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '-';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderStats(stats: PopupStatsResponse): void {
  // DevTools warning
  $devtoolsWarning.classList.toggle('hidden', stats.isDevToolsOpen);

  // Status bar
  const paused = stats.isPaused;
  $statusDot.className = `dot ${paused ? 'paused' : 'recording'}`;
  $statusText.textContent = paused ? 'Paused' : 'Recording';
  $pauseIcon.textContent = paused ? '▶' : '⏸';
  $pauseText.textContent = paused ? 'Resume' : 'Pause';
  $btnPause.title = paused ? 'Resume recording' : 'Pause recording';

  // Providers
  const providers: ProviderStats[] = showAllProviders ? stats.providers : stats.topProviders;

  if (providers.length === 0) {
    $providersEmpty.classList.remove('hidden');
    $providersList.classList.add('hidden');
    $btnShowAll.classList.add('hidden');
  } else {
    $providersEmpty.classList.add('hidden');
    $providersList.classList.remove('hidden');
    $providersList.innerHTML = '';
    providers.forEach((p) => $providersList.appendChild(renderProviderPill(p)));

    if (!showAllProviders && stats.otherProvidersCount > 0) {
      $othersCount.textContent = String(stats.otherProvidersCount);
      $btnShowAll.classList.remove('hidden');
    } else {
      $btnShowAll.classList.add('hidden');
    }
  }

  // Summary
  $totalRequests.textContent = String(stats.totalRequests);
  $totalSize.textContent = formatBytes(stats.totalSize);
  $avgDuration.textContent = formatDuration(stats.avgDuration);
  $successRate.textContent = `${stats.successRate}%`;
  $lastActivity.textContent = formatRelativeTime(stats.lastRequest);
}

function renderProviderPill(provider: ProviderStats): HTMLElement {
  const pill = document.createElement('div');
  pill.className = 'provider-pill';
  pill.style.borderLeftColor = provider.color;
  pill.title = `${provider.name}: ${provider.count} requests`;

  const nameEl = document.createElement('span');
  nameEl.className = 'provider-name';
  nameEl.textContent = provider.name;

  const countEl = document.createElement('span');
  countEl.className = 'provider-count';
  countEl.style.color = provider.color;
  countEl.textContent = String(provider.count);

  pill.appendChild(nameEl);
  pill.appendChild(countEl);
  return pill;
}

// ─── LOAD STATS ───────────────────────────────────────────────────────────────

async function loadStats(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_POPUP_STATS',
      tabId: currentTabId ?? undefined,
    });

    if (response?.ok && response.data) {
      currentStats = response.data;
      renderStats(response.data);
    }
  } catch {
    // Background may not be ready
  }
}

// ─── EVENT HANDLERS ───────────────────────────────────────────────────────────

$btnPause.addEventListener('click', async () => {
  if (!currentStats) return;
  const paused = !currentStats.isPaused;

  try {
    await chrome.runtime.sendMessage({
      type: paused ? 'PAUSE_RECORDING' : 'RESUME_RECORDING',
      tabId: currentTabId ?? undefined,
    });
    // Optimistically update UI
    currentStats.isPaused = paused;
    renderStats(currentStats);
  } catch {
    // ignore
  }
});

$btnClear.addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'CLEAR_REQUESTS',
      tabId: currentTabId ?? undefined,
    });
    await loadStats();
  } catch {
    // ignore
  }
});

$btnShowAll.addEventListener('click', () => {
  showAllProviders = true;
  $btnShowAll.classList.add('hidden');
  if (currentStats) renderStats(currentStats);
});

// ─── LIVE UPDATES ─────────────────────────────────────────────────────────────
// Listen for storage changes to refresh popup while it's open.

chrome.storage.session.onChanged.addListener((changes) => {
  if ('popup_stats' in changes && currentTabId !== null) {
    const allStats = changes['popup_stats'].newValue ?? {};
    if (!allStats[currentTabId]) return;
    // Reload full computed stats (includes computed fields like avgDuration)
    loadStats().catch(() => {});
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Get current tab ID
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;

  await loadStats();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(() => {});
});
