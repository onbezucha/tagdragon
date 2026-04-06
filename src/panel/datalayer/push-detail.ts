// ─── PUSH DETAIL COMPONENT ───────────────────────────────────────────────────
// Detail pane with 4 sub-tabs: Push Data, Diff, Current State, Correlation.

import type { DataLayerPush, ValidationResult } from '@/types/datalayer';
import type { ParsedRequest } from '@/types/request';
import { DOM } from '../utils/dom';
import { formatTimestamp } from '../utils/format';
import { getConfig, getAllRequests } from '../state';
import { getAllDlPushes, computeCumulativeState, getValidationErrors, getCorrelationWindow, setCorrelationWindow } from './state';
import { deepDiff, renderDiff } from './diff-renderer';
import { renderEcommerceTable, detectEcommerceType } from './ecommerce-formatter';
import { findCorrelatedRequests, renderCorrelation } from './correlation';
import { getSourceColor, getSourceBadge } from './push-list';
import { renderLiveInspector } from './live-inspector';

// ─── DETAIL RENDERING ────────────────────────────────────────────────────────

let activeTab: string = 'push-data';

/**
 * Show a DataLayer push in the detail pane.
 */
export function selectDlPush(
  push: DataLayerPush,
  row: HTMLElement,
  onGotoNetwork: (requestId: number) => void,
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
  onGotoNetwork: (requestId: number) => void,
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

    const push = currentPushGetter();
    if (push) {
      renderActiveTab(push, onGotoNetwork);
    }
  });
}

function renderActiveTab(
  push: DataLayerPush,
  onGotoNetwork: (requestId: number) => void,
): void {
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
    keys: ['event', 'eventAction', 'eventCategory', 'eventLabel', 'eventValue', 'event_name', '_method', '_type', '_satellite'],
  },
  {
    label: 'User',
    keys: ['user_id', 'userId', 'user_email', 'userEmail', 'user_type', 'userType', 'client_id', 'session_id'],
  },
  {
    label: 'Page',
    keys: ['page_title', 'pageTitle', 'page_location', 'pageUrl', 'page_type', 'pageType', 'page_path', 'pagePath'],
  },
  {
    label: 'E-Commerce',
    keys: ['ecommerce', 'transaction_id', 'transactionId', 'value', 'currency', 'items', 'products'],
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
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(push.data, null, 2)).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy as JSON'; }, 1500);
    }).catch(() => { /* ignore */ });
  });
  container.appendChild(copyBtn);
}

function categorizeData(data: Record<string, unknown>): { label: string; entries: [string, unknown][] }[] {
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

function renderKvRow(container: HTMLElement, key: string, value: unknown, errorMap?: Map<string, string>): void {
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
  valEl.addEventListener('click', () => {
    const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
    navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
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
    container.innerHTML = '<div class="dl-diff-empty">This is the first push — no previous state to diff against.</div>';
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
  for (const key of keys) {
    renderKvRow(container, key, state[key]);
  }

  if (keys.length === 0) {
    container.innerHTML = '<div class="dl-state-empty">No state accumulated yet</div>';
  }
}

// ─── CORRELATION TAB ─────────────────────────────────────────────────────────

function renderCorrelationTab(
  container: HTMLElement,
  push: DataLayerPush,
  onGotoNetwork: (requestId: number) => void,
): void {
  const allRequests: ParsedRequest[] = getAllRequests();
  const windowMs = getCorrelationWindow();

  // Time window controls
  const controls = document.createElement('div');
  controls.className = 'dl-correlation-controls';

  const label = document.createElement('label');
  label.textContent = 'Time window:';
  controls.appendChild(label);

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

  container.appendChild(controls);

  // Render initial correlation
  const correlated = findCorrelatedRequests(push, allRequests, windowMs);
  renderCorrelation(container, correlated, onGotoNetwork, windowMs);

  // Slider interaction
  slider.addEventListener('input', () => {
    const ms = Number(slider.value);
    valueDisplay.textContent = `${(ms / 1000).toFixed(1)}s`;
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
}

// ─── LIVE TAB ──────────────────────────────────────────────────────────────

function renderLiveTab(container: HTMLElement, push: DataLayerPush): void {
  renderLiveInspector(container, push.cumulativeState);
}
