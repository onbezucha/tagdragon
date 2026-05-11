// ─── CONSENT PANEL ────────────────────────────────────────────────────────────

import type { ConsentData } from '@/types/consent';
import { DOM } from '../utils/dom';
import { copyToClipboard, showCopyFeedback } from '../utils/clipboard';
import { esc } from '../utils/format';
import { closeAllPopovers, registerPopover } from '../utils/popover-manager';
import {
  GET_CONSENT_DATA_SCRIPT,
  ACCEPT_ALL_SCRIPT,
  REJECT_ALL_SCRIPT,
} from '@/shared/cmp-detection';

const STORAGE_KEY = 'rt_consent_override';
const MAX_APPLY_ATTEMPTS = 6;
const APPLY_RETRY_MS = 1500; // retry interval between post-navigation attempts
const FIRST_ATTEMPT_MS = 1000; // delay after navigation before first attempt

type ConsentOverride = 'accept_all' | 'reject_all' | null;

let consentData: ConsentData | null = null;
let isRefreshing = false;
let consentOverride: ConsentOverride = null;
let deleteConfirmPending = false;
let deleteConfirmTimer: ReturnType<typeof setTimeout> | null = null;

// ─── STORAGE ──────────────────────────────────────────────────────────────

async function loadOverride(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    consentOverride = (stored[STORAGE_KEY] as ConsentOverride) ?? null;
  } catch {
    consentOverride = null;
  }
}

export async function clearConsentOverride(): Promise<void> {
  await saveOverride(null);
  renderOverrideBadge();
}

// ─── PUBLIC CLOSE ────────────────────────────────────────────────────────

export function closeConsentPanel(): void {
  const $consentPopover = DOM.consentPopover;
  if ($consentPopover) $consentPopover.classList.remove('visible');
}

export function isConsentOpen(): boolean {
  return DOM.consentPopover?.classList.contains('visible') ?? false;
}

async function saveOverride(value: ConsentOverride): Promise<void> {
  consentOverride = value;
  try {
    if (value === null) {
      await chrome.storage.local.remove(STORAGE_KEY);
    } else {
      await chrome.storage.local.set({ [STORAGE_KEY]: value });
    }
  } catch {
    console.warn('TagDragon: consent override save failed');
  }
}

// ─── AUTO-APPLY ON NAVIGATION ─────────────────────────────────────────────

function applyOverrideWithRetry(override: ConsentOverride, attempt = 1): void {
  if (!override) return;
  const script = override === 'accept_all' ? ACCEPT_ALL_SCRIPT : REJECT_ALL_SCRIPT;

  chrome.devtools.inspectedWindow.eval(script, (result: unknown) => {
    if (result && result !== false) {
      // Success — refresh panel if open
      if (DOM.consentPopover?.classList.contains('visible')) {
        setTimeout(() => refreshConsentData(), 600);
      }
    } else if (attempt < MAX_APPLY_ATTEMPTS) {
      // CMP not yet initialized — retry
      setTimeout(() => applyOverrideWithRetry(override, attempt + 1), APPLY_RETRY_MS);
    }
  });
}

function initNavigationListener(): void {
  // Fired when the inspected page navigates to a new URL
  type NetworkWithNavigated = typeof chrome.devtools.network & {
    onNavigated?: { addListener: (cb: () => void) => void };
  };
  (chrome.devtools.network as NetworkWithNavigated).onNavigated?.addListener(() => {
    if (!consentOverride) return;
    setTimeout(() => applyOverrideWithRetry(consentOverride), FIRST_ATTEMPT_MS);
  });
}

// ─── INIT ──────────────────────────────────────────────────────────────────

export async function initConsentPanel(): Promise<void> {
  await loadOverride();
  initNavigationListener();

  const $btnConsent = document.getElementById('btn-consent') as HTMLButtonElement | null;
  const $consentPopover = DOM.consentPopover;

  if (!$btnConsent || !$consentPopover) return;
  registerPopover('consent', closeConsentPanel);

  $btnConsent.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const isVisible = $consentPopover.classList.contains('visible');
    closeAllPopovers();
    if (!isVisible) {
      $consentPopover.classList.add('visible');
      renderOverrideBadge();
      refreshConsentData();
    }
  });

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!$consentPopover.contains(target) && !target.closest('#btn-consent')) {
      $consentPopover.classList.remove('visible');
    }
  });

  const $acceptBtn = document.getElementById('consent-accept-all') as HTMLButtonElement | null;
  const $rejectBtn = document.getElementById('consent-reject-all') as HTMLButtonElement | null;

  $acceptBtn?.addEventListener('click', () => {
    setActionLoading($acceptBtn, '⏳ Applying...');
    runConsentAction(ACCEPT_ALL_SCRIPT, 'accept_all', $acceptBtn, '✓ Accept all');
  });

  $rejectBtn?.addEventListener('click', () => {
    setActionLoading($rejectBtn, '⏳ Applying...');
    runConsentAction(REJECT_ALL_SCRIPT, 'reject_all', $rejectBtn, '✕ Reject all');
  });

  document.getElementById('consent-refresh')?.addEventListener('click', () => {
    refreshConsentData();
  });

  const $clearCookiesBtn = document.getElementById(
    'consent-clear-cookies'
  ) as HTMLButtonElement | null;
  $clearCookiesBtn?.addEventListener('click', () => {
    void runClearCookies($clearCookiesBtn);
  });

  // Show current state on init
  renderOverrideBadge();
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────

function setActionLoading(btn: HTMLButtonElement, text: string): void {
  btn.disabled = true;
  btn.textContent = text;
}

function resetActionButton(btn: HTMLButtonElement, label: string): void {
  btn.disabled = false;
  btn.textContent = label;
}

function runConsentAction(
  script: string,
  override: ConsentOverride,
  btn: HTMLButtonElement,
  label: string
): void {
  chrome.devtools.inspectedWindow.eval(script, (result: unknown) => {
    const apiCalled = result && result !== false;

    const $status = document.getElementById('consent-action-status');
    if ($status) {
      $status.textContent = apiCalled ? `✓ Called: ${result}` : '⚠️ CMP API not found';
      $status.style.display = 'block';
    }

    if (apiCalled) {
      // Save preference for auto-apply on navigation
      void saveOverride(override);
      renderOverrideBadge();
    }

    setTimeout(() => {
      // Fade out status message
      if ($status) $status.style.opacity = '0';
      setTimeout(() => {
        resetActionButton(btn, label);
        refreshConsentData();
        if ($status) {
          $status.style.display = 'none';
          $status.style.opacity = '1';
        }
      }, 300);
    }, 4000);
  });
}

// ─── CLEAR COOKIES ────────────────────────────────────────────────────────

export async function clearAllCookies(): Promise<number> {
  // Get URL of the inspected page
  const url = await new Promise<string>((resolve) => {
    chrome.devtools.inspectedWindow.eval('location.href', (result: unknown) => {
      resolve(typeof result === 'string' ? result : '');
    });
  });

  if (!url) return 0;

  // Relay to background — chrome.cookies is not available in DevTools panels
  // 5-second timeout to prevent infinite hang if background doesn't respond
  try {
    return await Promise.race<number>([
      chrome.runtime
        .sendMessage({
          type: 'CLEAR_COOKIES',
          url,
          source: 'devtools',
          tabId: chrome.devtools.inspectedWindow.tabId,
        })
        .then((resp: unknown) => (resp as { deleted?: number } | null)?.deleted ?? 0),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Clear cookies timeout')), 5000)
      ),
    ]);
  } catch {
    console.warn('TagDragon: clearAllCookies failed or timed out');
    return 0;
  }
}

async function runClearCookies(btn: HTMLButtonElement): Promise<void> {
  if (!deleteConfirmPending) {
    // First click — ask for confirmation
    deleteConfirmPending = true;
    btn.textContent = '⚠ Confirm delete?';
    btn.classList.add('confirm-pending');
    deleteConfirmTimer = setTimeout(() => {
      // Revert after 3 seconds
      deleteConfirmPending = false;
      btn.textContent = '🗑 Delete cookies';
      btn.classList.remove('confirm-pending');
    }, 3000);
    return;
  }

  // Second click — confirmed
  deleteConfirmPending = false;
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer);
  btn.textContent = '🗑 Delete cookies';
  btn.classList.remove('confirm-pending');

  const $status = document.getElementById('consent-action-status');

  try {
    const count = await clearAllCookies();
    if ($status) {
      $status.textContent = `🗑 Deleted ${count} cookies`;
      $status.style.display = 'block';
    }
    // Refresh panel — consent cookies are gone
    setTimeout(() => refreshConsentData(), 400);
  } catch (err) {
    if ($status) {
      $status.textContent = '⚠️ Error deleting cookies';
      $status.style.display = 'block';
    }
    console.warn('TagDragon: clearAllCookies failed', err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🗑 Delete cookies';
    }
  }
}

// ─── OVERRIDE BADGE ───────────────────────────────────────────────────────

function renderOverrideBadge(): void {
  const $badge = document.getElementById('consent-override-badge');
  if (!$badge) return;

  if (!consentOverride) {
    $badge.style.display = 'none';
    return;
  }

  const label = consentOverride === 'accept_all' ? 'All accepted' : 'All rejected';
  const cls = consentOverride === 'accept_all' ? 'override-accept' : 'override-reject';
  $badge.className = `consent-override-badge ${cls}`;
  $badge.style.display = 'flex';

  // Build badge content with createElement to avoid listener stacking from innerHTML replacement.
  $badge.textContent = '';
  const icon = document.createElement('span');
  icon.className = 'consent-override-icon';
  icon.textContent = '🔒';
  const labelEl = document.createElement('span');
  labelEl.className = 'consent-override-label';
  labelEl.textContent = `Auto: ${label}`;
  const clearBtn = document.createElement('button');
  clearBtn.id = 'consent-override-clear';
  clearBtn.className = 'consent-override-clear';
  clearBtn.title = 'Cancel auto-apply';
  clearBtn.textContent = '✕';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    void saveOverride(null);
    renderOverrideBadge();
  });
  $badge.appendChild(icon);
  $badge.appendChild(labelEl);
  $badge.appendChild(clearBtn);
}

// ─── DATA REFRESH ─────────────────────────────────────────────────────────

function refreshConsentData(): void {
  if (isRefreshing) return;
  isRefreshing = true;

  renderLoading();

  chrome.devtools.inspectedWindow.eval(
    GET_CONSENT_DATA_SCRIPT,
    (result: unknown, isException: unknown) => {
      isRefreshing = false;
      if (isException || !result) {
        renderNoData('Error reading consent data');
        return;
      }
      try {
        consentData = JSON.parse(result as string) as ConsentData;
        renderConsentPanel(consentData);
      } catch {
        renderNoData('Cannot process consent data');
      }
    }
  );
}

// ─── RENDER ───────────────────────────────────────────────────────────────

function renderLoading(): void {
  const $cmpInfo = document.getElementById('consent-cmp-info');
  const $categories = document.getElementById('consent-categories');
  if ($cmpInfo) $cmpInfo.innerHTML = '<span class="consent-loading">Loading...</span>';
  if ($categories) $categories.innerHTML = '';
}

function renderNoData(message: string): void {
  const $cmpInfo = document.getElementById('consent-cmp-info');
  const $categories = document.getElementById('consent-categories');
  const $actions = document.getElementById('consent-actions');
  const $tcf = document.getElementById('consent-tcf');
  const $timestamp = document.getElementById('consent-timestamp');

  if ($cmpInfo) $cmpInfo.innerHTML = '<span class="consent-no-cmp">❌ CMP not detected</span>';
  if ($categories)
    $categories.innerHTML = `
    <div class="consent-no-data">
      <div class="consent-no-data-icon">🍪</div>
      <div class="consent-no-data-text">${esc(message)}</div>
      <div class="consent-no-data-hint">Open a page with CMP to view consent data</div>
    </div>
  `;
  if ($actions) ($actions as HTMLElement).style.display = 'none';
  if ($tcf) $tcf.innerHTML = '';
  if ($timestamp) $timestamp.textContent = '';
}

function renderConsentPanel(data: ConsentData): void {
  const $cmpInfo = document.getElementById('consent-cmp-info');
  const $categories = document.getElementById('consent-categories');
  const $actions = document.getElementById('consent-actions');
  const $tcf = document.getElementById('consent-tcf');
  const $timestamp = document.getElementById('consent-timestamp');

  const $actionStatus = document.getElementById('consent-action-status');
  if ($actionStatus) $actionStatus.style.display = 'none';

  if (!data.cmp) {
    renderNoData('No CMP detected on this page');
    return;
  }

  // CMP Info
  if ($cmpInfo) {
    $cmpInfo.innerHTML = `
      <span class="consent-cmp-name">${esc(data.cmp.name)}</span>
      <span class="consent-cmp-status ${data.cmp.isActive ? 'active' : 'inactive'}">
        ${data.cmp.isActive ? '🟢 Active' : '🔴 API'}
      </span>
      ${data.cmp.hasTCF ? '<span class="consent-tcf-badge">TCF 2.0</span>' : ''}
    `;
  }

  // Action buttons — always show, just disable if API is unavailable
  if ($actions) {
    ($actions as HTMLElement).style.display = 'flex';
    const $acceptBtn = document.getElementById('consent-accept-all') as HTMLButtonElement | null;
    const $rejectBtn = document.getElementById('consent-reject-all') as HTMLButtonElement | null;
    const apiUnavailable = !data.cmp.isActive;
    if ($acceptBtn) {
      $acceptBtn.disabled = apiUnavailable;
      $acceptBtn.title = apiUnavailable ? 'CMP API not available' : '';
    }
    if ($rejectBtn) {
      $rejectBtn.disabled = apiUnavailable;
      $rejectBtn.title = apiUnavailable ? 'CMP API not available' : '';
    }

    // Show explanation when buttons are disabled (CMP API not detected)
    const actionsContainer = document.getElementById('consent-actions');
    if (actionsContainer) {
      let explanation = actionsContainer.querySelector(
        '.consent-disabled-explanation'
      ) as HTMLElement | null;
      if (!explanation) {
        explanation = document.createElement('div');
        explanation.className = 'consent-disabled-explanation';
        explanation.innerHTML =
          'CMP API not detected on this page.<br>The page may not use a consent management platform, or it loads after TagDragon.';
        actionsContainer.appendChild(explanation);
      }
      explanation.style.display = apiUnavailable ? '' : 'none';
    }
  }

  // Categories
  if ($categories) {
    if (data.categories.length > 0) {
      $categories.innerHTML = data.categories
        .map(
          (cat) => `
        <div class="consent-category ${cat.granted ? 'granted' : 'denied'}">
          <div class="consent-category-header">
            <span class="consent-category-status">${cat.granted ? '✅' : '❌'}</span>
            <span class="consent-category-label">${esc(cat.label)}</span>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      $categories.innerHTML =
        '<div class="consent-no-data"><div class="consent-no-data-text">No categories found</div></div>';
    }
  }

  // TCF Section
  if ($tcf) {
    if (data.tcf) {
      $tcf.innerHTML = `
        <div class="consent-tcf-header">
          <span class="consent-label">📋 TCF 2.0 String</span>
          <div class="consent-tcf-actions">
            <button class="consent-btn-small" id="consent-show-tcf">Show</button>
            <button class="consent-btn-small" id="consent-copy-tcf">Copy</button>
          </div>
        </div>
        <div class="consent-tcf-string" id="consent-tcf-value" style="display:none;">${esc(data.tcf.tcString)}</div>
      `;
      document.getElementById('consent-show-tcf')?.addEventListener('click', () => {
        const $val = document.getElementById('consent-tcf-value');
        if ($val) $val.style.display = $val.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('consent-copy-tcf')?.addEventListener('click', async (e) => {
        const btn = e.target as HTMLButtonElement;
        const success = await copyToClipboard(data.tcf!.tcString);
        showCopyFeedback(btn, success);
      });
    } else {
      $tcf.innerHTML = '<span class="consent-no-data-hint">TCF not supported</span>';
    }
  }

  // Timestamp
  if ($timestamp && data.timestamp) {
    const date = new Date(data.timestamp);
    $timestamp.textContent = `🕐 Loaded: ${date.toLocaleString('en-US')}`;
  }
}
