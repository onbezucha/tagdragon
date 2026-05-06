// ─── PUSH DETAIL COMPONENT ───────────────────────────────────────────────────
// Detail pane with 4 sub-tabs: Push Data, Diff, Current State, Correlation.

import type { DataLayerPush } from '@/types/datalayer';
import type { ParsedRequest } from '@/types/request';
import { DOM } from '../../utils/dom';
import { copyToClipboard, showCopyFeedback } from '../../utils/clipboard';
import { formatTimestamp } from '../../utils/format';
import { getConfig, getAllRequests } from '../../state';
import {
  getAllDlPushes,
  computeCumulativeState,
  getValidationErrors,
  getCorrelationWindow,
  setCorrelationWindow,
} from '../state';
import { deepDiff, renderDiff } from '../utils/diff-renderer';
import { renderEcommerceTable, detectEcommerceType } from '../utils/ecommerce-formatter';
import { findCorrelatedRequests, renderCorrelation } from '../utils/correlation';
import { getSourceColor, getSourceBadge } from './push-list';
import { renderLiveInspector } from './live-inspector';

// ─── DETAIL RENDERING ────────────────────────────────────────────────────────

let activeTab: string = 'push-data';

const TAB_DESCRIPTIONS: Record<string, string> = {
  'push-data': 'Categorized key-value pairs from this push. Click a value to copy.',
  diff: 'Changes from the cumulative state before this push.',
  'current-state': 'Full merged DataLayer state after applying this push.',
  correlation: 'Network requests sent within the time window after this push.',
  live: 'Reactive tree view of current DataLayer state. Right-click a key to watch it.',
};

function showTabDescription(tabName: string): void {
  const existing = document.querySelector('.dl-tab-description');
  existing?.remove();

  const $content = DOM.dlDetailContent;
  if (!$content) return;

  const desc = TAB_DESCRIPTIONS[tabName];
  if (!desc) return;

  const descEl = document.createElement('div');
  descEl.className = 'dl-tab-description';
  descEl.textContent = desc;

  $content.parentElement?.insertBefore(descEl, $content);
}

/**
 * Show a DataLayer push in the detail pane.
 */
export function selectDlPush(
  push: DataLayerPush,
  row: HTMLElement,
  onGotoNetwork: (requestId: number) => void
): void {
  const $detail = DOM.dlDetailPane;
  if (!$detail) return;

  $detail.classList.remove('hidden');

  // Update header
  const $badge = DOM.dlDetailBadge;
  const $title = DOM.dlDetailTitle;
  const color = getSourceColor(push.source);

  if ($badge) {
    $badge.textContent = getSourceBadge(push.source);
    $badge.style.background = color + '22';
    $badge.style.color = color;
    $badge.style.border = `1px solid ${color}55`;
  }

  if ($title) {
    const cfg = getConfig();
    const sessionStart = getAllDlPushes()[0]?.timestamp;
    const time = formatTimestamp(push.timestamp, cfg.timestampFormat, sessionStart, true);
    $title.textContent = `#${push.pushIndex}${push._eventName ? ' · ' + push._eventName : ''} · ${time}`;
  }

  // Activate the currently selected tab
  renderActiveTab(push, onGotoNetwork);

  // Mark row as active
  const $list = DOM.dlPushList;
  if ($list) {
    $list.querySelectorAll('.dl-push-row.active').forEach((r) => r.classList.remove('active'));
  }
  row.classList.add('active');
}

/**
 * Close the detail pane.
 */
export function closeDlDetail(): void {
  const $detail = DOM.dlDetailPane;
  if ($detail) $detail.classList.add('hidden');
  const $list = DOM.dlPushList;
  if ($list) {
    $list.querySelectorAll('.dl-push-row.active').forEach((r) => r.classList.remove('active'));
  }
}

/**
 * Initialize tab click handlers for the DataLayer detail pane.
 */
export function initDlDetailTabHandlers(
  currentPushGetter: () => DataLayerPush | null,
  onGotoNetwork: (requestId: number) => void
): void {
  const $tabs = DOM.dlDetailTabs;
  if (!$tabs) return;

  $tabs.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.dl-dtab') as HTMLElement | null;
    if (!target) return;

    const tab = target.dataset['tab'];
    if (!tab) return;
    activeTab = tab;

    // Update active tab button
    $tabs.querySelectorAll('.dl-dtab').forEach((btn) => btn.classList.remove('active'));
    target.classList.add('active');

    // Show tab description
    showTabDescription(tab);

    const push = currentPushGetter();
    if (push) {
      renderActiveTab(push, onGotoNetwork);
    }
  });
}

function renderActiveTab(push: DataLayerPush, onGotoNetwork: (requestId: number) => void): void {
  const $content = DOM.dlDetailContent;
  if (!$content) return;
  $content.innerHTML = '';

  switch (activeTab) {
    case 'push-data':
      renderPushDataTab($content, push);
      break;
    case 'diff':
      renderDiffTab($content, push);
      break;
    case 'current-state':
      renderCurrentStateTab($content, push);
      break;
    case 'correlation':
      renderCorrelationTab($content, push, onGotoNetwork);
      break;
    case 'live':
      renderLiveTab($content, push);
      break;
    default:
      renderPushDataTab($content, push);
  }
}

// ─── PUSH DATA TAB ───────────────────────────────────────────────────────────

const DATA_CATEGORIES: { label: string; keys: string[] }[] = [
  {
    label: 'Event',
    keys: [
      'event',
      'eventAction',
      'eventCategory',
      'eventLabel',
      'eventValue',
      'event_name',
      '_method',
      '_type',
      '_satellite',
    ],
  },
  {
    label: 'User',
    keys: [
      'user_id',
      'userId',
      'user_email',
      'userEmail',
      'user_type',
      'userType',
      'client_id',
      'session_id',
    ],
  },
  {
    label: 'Page',
    keys: [
      'page_title',
      'pageTitle',
      'page_location',
      'pageUrl',
      'page_type',
      'pageType',
      'page_path',
      'pagePath',
    ],
  },
  {
    label: 'E-Commerce',
    keys: [
      'ecommerce',
      'transaction_id',
      'transactionId',
      'value',
      'currency',
      'items',
      'products',
    ],
  },
];

function renderPushDataTab(container: HTMLElement, push: DataLayerPush): void {
  const categorized = categorizeData(push.data);

  // Build error map for validation highlighting
  const errors = getValidationErrors(push.id);
  const errorMap = new Map<string, string>();
  for (const err of errors) {
    if (err.failedKey) errorMap.set(err.failedKey, err.checkMessage);
  }

  // Render each category
  for (const { label, entries } of categorized) {
    if (entries.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'dl-data-section';

    const header = document.createElement('div');
    header.className = 'dl-data-section-header';
    header.textContent = label;
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });
    section.appendChild(header);

    const body = document.createElement('div');
    body.className = 'dl-data-section-body';

    for (const [key, value] of entries) {
      if (key === 'ecommerce' && typeof value === 'object' && value !== null) {
        // Special e-commerce rendering
        const ecType = detectEcommerceType(push.data);
        if (ecType) {
          const ecContainer = document.createElement('div');
          ecContainer.className = 'dl-ec-container';
          renderEcommerceTable(ecContainer, value as Record<string, unknown>);
          body.appendChild(ecContainer);
        }
        renderKvRow(body, key, value, errorMap);
      } else {
        renderKvRow(body, key, value, errorMap);
      }
    }

    section.appendChild(body);
    container.appendChild(section);
  }

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'dl-copy-btn';
  copyBtn.textContent = 'Copy as JSON';
  copyBtn.addEventListener('click', async () => {
    const success = await copyToClipboard(JSON.stringify(push.data, null, 2));
    showCopyFeedback(copyBtn, success);
  });
  container.appendChild(copyBtn);
}

function categorizeData(
  data: Record<string, unknown>
): { label: string; entries: [string, unknown][] }[] {
  const assignedKeys = new Set<string>();
  const result: { label: string; entries: [string, unknown][] }[] = [];

  for (const cat of DATA_CATEGORIES) {
    const entries: [string, unknown][] = [];
    for (const key of Object.keys(data)) {
      if (assignedKeys.has(key)) continue;
      if (cat.keys.some((k) => key === k || key.toLowerCase().includes(k.toLowerCase()))) {
        entries.push([key, data[key]]);
        assignedKeys.add(key);
      }
    }
    result.push({ label: cat.label, entries });
  }

  // Other
  const otherEntries: [string, unknown][] = [];
  for (const key of Object.keys(data)) {
    if (!assignedKeys.has(key)) {
      otherEntries.push([key, data[key]]);
    }
  }
  result.push({ label: 'Other', entries: otherEntries });

  return result;
}

function renderKvRow(
  container: HTMLElement,
  key: string,
  value: unknown,
  errorMap?: Map<string, string>
): void {
  const row = document.createElement('div');
  row.className = 'dl-kv-row';

  const keyEl = document.createElement('span');
  keyEl.className = 'dl-kv-key';
  keyEl.textContent = key;

  // Validation error highlight
  if (errorMap?.has(key)) {
    keyEl.classList.add('dl-kv-key-invalid');
    keyEl.title = errorMap.get(key) ?? '';
  }

  const valEl = document.createElement('span');
  valEl.className = 'dl-kv-value';

  if (typeof value === 'object' && value !== null) {
    valEl.textContent = JSON.stringify(value, null, 2);
    valEl.className += ' dl-kv-value-json';
  } else {
    valEl.textContent = String(value ?? '');
  }

  // Copy value on click
  valEl.title = 'Click to copy';
  valEl.style.cursor = 'pointer';
  valEl.addEventListener('click', async () => {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
    const success = await copyToClipboard(text);
    showCopyFeedback(valEl, success);
  });

  row.appendChild(keyEl);
  row.appendChild(valEl);
  container.appendChild(row);
}

// ─── DIFF TAB ────────────────────────────────────────────────────────────────

function renderDiffTab(container: HTMLElement, push: DataLayerPush): void {
  const allPushes = getAllDlPushes();
  const pushIndex = allPushes.findIndex((p) => p.id === push.id);

  if (pushIndex <= 0) {
    container.innerHTML =
      '<div class="dl-diff-empty">This is the first push — no previous state to diff against.</div>';
    return;
  }

  const prevState = computeCumulativeState(pushIndex - 1);
  const currState = computeCumulativeState(pushIndex);
  const entries = deepDiff(prevState, currState);

  renderDiff(container, entries, entries.length);
}

// ─── CURRENT STATE TAB ───────────────────────────────────────────────────────

function renderCurrentStateTab(container: HTMLElement, push: DataLayerPush): void {
  const allPushes = getAllDlPushes();
  const pushIndex = allPushes.findIndex((p) => p.id === push.id);
  if (pushIndex < 0) return;
  const state = computeCumulativeState(pushIndex);

  const header = document.createElement('div');
  header.className = 'dl-state-header';
  header.textContent = `Cumulative state after push #${push.pushIndex} (${Object.keys(state).length} keys)`;
  container.appendChild(header);

  const keys = Object.keys(state).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div class="dl-state-empty">No state accumulated yet</div>';
    return;
  }

  for (const key of keys) {
    renderKvRow(container, key, state[key]);
  }
}

// ─── CORRELATION TAB ─────────────────────────────────────────────────────────

function renderCorrelationTab(
  container: HTMLElement,
  push: DataLayerPush,
  onGotoNetwork: (requestId: number) => void
): void {
  const allRequests: ParsedRequest[] = getAllRequests();
  const windowMs = getCorrelationWindow();

  // Track the value when tab was opened to detect custom changes
  const defaultWindowMs = 2000;
  const initialValue = windowMs;

  // Time window controls
  const controls = document.createElement('div');
  controls.className = 'dl-correlation-controls';

  const label = document.createElement('label');
  label.textContent = 'Per-push time window:';
  controls.appendChild(label);

  // Custom badge (shown when slider differs from global default)
  const customBadge = document.createElement('span');
  customBadge.className = 'dl-custom-badge';
  customBadge.textContent = 'Custom';
  customBadge.style.cssText = 'display:none;';
  controls.appendChild(customBadge);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '500';
  slider.max = '10000';
  slider.step = '500';
  slider.value = String(windowMs);
  controls.appendChild(slider);

  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = `${(windowMs / 1000).toFixed(1)}s`;
  valueDisplay.style.cssText = 'font-size:11px;color:var(--text-2);min-width:30px;';
  controls.appendChild(valueDisplay);

  // Reset to default link
  const resetLink = document.createElement('a');
  resetLink.href = '#';
  resetLink.className = 'dl-reset-link';
  resetLink.textContent = 'Reset to default';
  resetLink.style.cssText =
    'display:none;margin-left:8px;font-size:11px;color:var(--accent);cursor:pointer;';
  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    freshSlider.value = String(defaultWindowMs);
    freshSlider.dispatchEvent(new Event('input'));
  });
  controls.appendChild(resetLink);

  const description = document.createElement('div');
  description.style.cssText = 'font-size:10px;color:var(--text-3);margin-top:4px;';
  description.textContent =
    'Network requests sent within this time window after the push. Includes requests already in flight (lookback: 500ms).';
  controls.appendChild(description);

  container.appendChild(controls);

  // Render initial correlation
  const correlated = findCorrelatedRequests(push, allRequests, windowMs);
  renderCorrelation(container, correlated, onGotoNetwork, windowMs);

  // Helper to update badge and reset link visibility
  const updateCustomIndicator = (ms: number) => {
    if (ms !== defaultWindowMs) {
      customBadge.style.display = 'inline';
      resetLink.style.display = 'inline';
    } else {
      customBadge.style.display = 'none';
      resetLink.style.display = 'none';
    }
  };

  // Slider interaction — clone to reset any previously stacked listeners before attaching
  const freshSlider = slider.cloneNode(true) as HTMLInputElement;
  slider.replaceWith(freshSlider);
  freshSlider.addEventListener('input', () => {
    const ms = Number(freshSlider.value);
    valueDisplay.textContent = `${(ms / 1000).toFixed(1)}s`;
    updateCustomIndicator(ms);
    setCorrelationWindow(ms);

    // Re-render correlation list (keep controls)
    const oldHeader = container.querySelector('.dl-correlation-header');
    const oldList = container.querySelector('.dl-correlation-list');
    const oldEmpty = container.querySelector('.dl-correlation-empty');
    if (oldHeader) oldHeader.remove();
    if (oldList) oldList.remove();
    if (oldEmpty) oldEmpty.remove();

    const newCorrelated = findCorrelatedRequests(push, allRequests, ms);
    renderCorrelation(container, newCorrelated, onGotoNetwork, ms);
  });

  // Show badge if initial value differs from default
  updateCustomIndicator(initialValue);
}

// ─── LIVE TAB ──────────────────────────────────────────────────────────────

function renderLiveTab(container: HTMLElement, push: DataLayerPush): void {
  const allPushes = getAllDlPushes();
  const pushIndex = allPushes.findIndex((p) => p.id === push.id);
  const state = computeCumulativeState(pushIndex);
  renderLiveInspector(container, state);
}
