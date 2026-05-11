// ─── PUSH DETAIL COMPONENT ───────────────────────────────────────────────────
// Detail pane with 4 sub-tabs: Push Data, Diff, Current State, Correlation.

import type { DataLayerPush } from '@/types/datalayer';
import type { ParsedRequest } from '@/types/request';
import { DOM } from '../../utils/dom';
import { copyToClipboard, showCopyFeedback } from '../../utils/clipboard';
import { formatTimestamp } from '../../utils/format';
import { debounce } from '../../utils/debounce';
import { getConfig, getAllRequests } from '../../state';
import {
  getAllDlPushes,
  computeCumulativeState,
  getValidationErrors,
  getCorrelationWindow,
  setCorrelationWindow,
  addWatchedPath,
} from '../state';
import { deepDiff, renderDiff } from '../utils/diff-renderer';
import { renderEcommerceTable, detectEcommerceType } from '../utils/ecommerce-formatter';
import {
  createTreeNode,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type TreeNodeData,
  type TreeRendererOptions,
} from '../utils/tree-renderer';
import { findCorrelatedRequests, renderCorrelation } from '../utils/correlation';
import { getSourceColor, getSourceBadge } from './push-list';
import { renderLiveInspector } from './live-inspector';

// ─── DETAIL RENDERING ────────────────────────────────────────────────────────

let activeTab: string = 'push-data';

/** Remembers which categories the user has manually collapsed (persists across push selections) */
const collapsedCategories = new Set<string>();

/** Count of pushes that arrived since the user last viewed the Live tab */
let _liveTabNewPushCount = 0;

/**
 * Called when a new push arrives. Increments the Live tab notification badge
 * if the Live tab is not currently active.
 */
export function incrementLiveTabBadge(): void {
  if (activeTab === 'live') return; // Live tab is visible, no badge needed
  _liveTabNewPushCount++;
  updateLiveTabBadge();
}

function updateLiveTabBadge(): void {
  const liveTab = document.querySelector('.dl-dtab[data-tab="live"]');
  if (!liveTab) return;

  // Remove existing badge
  const existing = liveTab.querySelector('.dl-tab-notification');
  if (existing) existing.remove();

  if (_liveTabNewPushCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'dl-tab-notification';
    badge.textContent = `${_liveTabNewPushCount} new`;
    liveTab.appendChild(badge);
  }
}

/**
 * Reset the Live tab notification badge (call on clear).
 */
export function resetLiveTabBadge(): void {
  _liveTabNewPushCount = 0;
  updateLiveTabBadge();
}

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

    // Reset Live tab notification when Live tab is selected
    if (tab === 'live') {
      _liveTabNewPushCount = 0;
      updateLiveTabBadge();
    }

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

/** Map category label to CATEGORY_ICONS/CATEGORY_COLORS key */
const CATEGORY_KEY_MAP: Record<string, string> = {
  Event: 'event',
  User: 'user',
  Page: 'page',
  'E-Commerce': 'ecommerce',
  Other: 'other',
};

/** Tree renderer options for Push Data tab — watch enabled, no highlights, start expanded */
const pushDataTreeOptions: TreeRendererOptions = {
  enableWatch: true,
  enableHighlights: false,
  startExpanded: true,
  onWatch: (path: string) => {
    addWatchedPath(path);
  },
};

/**
 * Render a category card with icon, label, count badge, collapse toggle,
 * and a body containing key-value rows and/or inline trees.
 */
export function renderCategoryCard(
  label: string,
  entries: [string, unknown][],
  errorMap: Map<string, string>,
  pushData: Record<string, unknown>,
  changedKeys?: Set<string>,
  defaultExpanded: boolean = true
): HTMLElement | null {
  if (entries.length === 0) return null;

  const catKey = CATEGORY_KEY_MAP[label] ?? 'other';
  const icon = CATEGORY_ICONS[catKey] ?? CATEGORY_ICONS['other'];
  const color = CATEGORY_COLORS[catKey] ?? CATEGORY_COLORS['other'];

  const card = document.createElement('div');
  card.className = 'dl-category-card';
  if (!defaultExpanded || collapsedCategories.has(catKey)) card.classList.add('collapsed');
  card.dataset['category'] = catKey;

  // Header
  const header = document.createElement('div');
  header.className = 'dl-category-header';
  header.style.setProperty('--card-color', color);

  const iconEl = document.createElement('span');
  iconEl.className = 'dl-category-icon';
  iconEl.innerHTML = icon;
  header.appendChild(iconEl);

  const labelEl = document.createElement('span');
  labelEl.className = 'dl-category-label';
  labelEl.textContent = label.toUpperCase();
  header.appendChild(labelEl);

  const countEl = document.createElement('span');
  countEl.className = 'dl-category-count';
  countEl.textContent = `${entries.length} keys`;
  header.appendChild(countEl);

  const toggle = document.createElement('span');
  toggle.className = 'dl-category-toggle';
  toggle.textContent = '▾';
  header.appendChild(toggle);

  header.addEventListener('click', () => {
    const isNowCollapsed = card.classList.toggle('collapsed');
    if (isNowCollapsed) {
      collapsedCategories.add(catKey);
    } else {
      collapsedCategories.delete(catKey);
    }
  });

  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'dl-category-body';

  for (const [key, value] of entries) {
    // E-commerce special case: render product table before the tree node
    if (key === 'ecommerce' && typeof value === 'object' && value !== null) {
      const ecType = detectEcommerceType(pushData);
      if (ecType) {
        const ecContainer = document.createElement('div');
        ecContainer.className = 'dl-ec-container';
        renderEcommerceTable(ecContainer, value as Record<string, unknown>);
        body.appendChild(ecContainer);
      }
    }

    // Render based on value type
    if (typeof value === 'object' && value !== null) {
      // Nested object/array → inline tree node
      body.appendChild(renderInlineTree(key, value));
    } else {
      // Simple value → key-value row
      const isChanged = changedKeys?.has(key) ?? false;
      renderKvRow(body, key, value, errorMap, isChanged);
    }
  }

  card.appendChild(body);
  return card;
}

/**
 * Render a nested object/array as an inline expandable tree node
 * using the shared tree renderer.
 */
export function renderInlineTree(key: string, value: unknown): HTMLElement {
  const childCount = Object.keys(value as object).length;

  const nodeData: TreeNodeData = {
    key,
    value,
    depth: 0,
    path: key,
    changeType: undefined,
    isLeaf: false,
    childCount,
  };

  return createTreeNode(nodeData, pushDataTreeOptions);
}

function renderPushDataTab(container: HTMLElement, push: DataLayerPush): void {
  // Inline search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dl-push-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dl-push-search-input';
  searchInput.placeholder = 'Find in push… (Ctrl+F)';
  searchWrap.appendChild(searchInput);

  const searchCount = document.createElement('span');
  searchCount.className = 'dl-push-search-count';
  searchCount.style.display = 'none';
  searchWrap.appendChild(searchCount);

  container.appendChild(searchWrap);

  // Container for category cards (separate so search can control visibility)
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'dl-push-cards';

  const categorized = categorizeData(push.data);

  // Build error map for validation highlighting
  const errors = getValidationErrors(push.id);
  const errorMap = new Map<string, string>();
  for (const err of errors) {
    if (err.failedKey) errorMap.set(err.failedKey, err.checkMessage);
  }

  // Compute changed keys from previous cumulative state for diff badges
  const changedKeys = new Set<string>();
  const pushArrayIndex = push.pushIndex - 1;
  if (pushArrayIndex > 0) {
    const prevState = computeCumulativeState(pushArrayIndex - 1);
    const currState = computeCumulativeState(pushArrayIndex);
    const diffEntries = deepDiff(prevState, currState);
    // Collect top-level keys that changed (use first segment of dot path)
    for (const entry of diffEntries) {
      const topKey = entry.path.split('.')[0];
      changedKeys.add(topKey);
    }
  }

  // Render each category as a card
  for (const { label, entries } of categorized) {
    const card = renderCategoryCard(label, entries, errorMap, push.data, changedKeys);
    if (card) cardsContainer.appendChild(card);
  }

  container.appendChild(cardsContainer);

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'dl-copy-btn';
  copyBtn.textContent = 'Copy as JSON';
  copyBtn.addEventListener('click', async () => {
    const success = await copyToClipboard(JSON.stringify(push.data, null, 2));
    showCopyFeedback(copyBtn, success);
  });
  container.appendChild(copyBtn);

  // Search functionality
  searchInput.addEventListener(
    'input',
    debounce(() => {
      const query = searchInput.value.toLowerCase().trim();
      applyPushSearch(cardsContainer, query, searchCount);
    }, 300)
  );
}

export function categorizeData(
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

function applyPushSearch(cardsContainer: HTMLElement, query: string, countEl: HTMLElement): void {
  const rows = cardsContainer.querySelectorAll('.dl-kv-row');
  let matchCount = 0;

  if (!query) {
    // Reset: show all rows and cards, remove highlights
    rows.forEach((row) => {
      row.classList.remove('dl-search-hidden', 'dl-search-match');
      const keyEl = row.querySelector('.dl-kv-key');
      const valEl = row.querySelector('.dl-kv-value');
      if (keyEl) keyEl.innerHTML = keyEl.textContent ?? '';
      if (valEl) valEl.innerHTML = valEl.textContent ?? '';
    });
    cardsContainer.querySelectorAll('.dl-category-card').forEach((card) => {
      (card as HTMLElement).style.display = '';
    });
    countEl.style.display = 'none';
    return;
  }

  // Track which cards have matches
  const cardsWithMatches = new Set<HTMLElement>();

  rows.forEach((row) => {
    const keyText = row.querySelector('.dl-kv-key')?.textContent?.toLowerCase() ?? '';
    const valText = row.querySelector('.dl-kv-value')?.textContent?.toLowerCase() ?? '';
    const matches = keyText.includes(query) || valText.includes(query);

    if (matches) {
      matchCount++;
      row.classList.remove('dl-search-hidden');
      row.classList.add('dl-search-match');
      // Find parent card
      const card = row.closest('.dl-category-card') as HTMLElement | null;
      if (card) cardsWithMatches.add(card);
    } else {
      row.classList.add('dl-search-hidden');
      row.classList.remove('dl-search-match');
    }
  });

  // Hide cards with no matching rows, show cards with matches
  cardsContainer.querySelectorAll('.dl-category-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    if (cardsWithMatches.has(cardEl)) {
      cardEl.style.display = '';
      // Expand cards with matches
      cardEl.classList.remove('collapsed');
    } else {
      cardEl.style.display = 'none';
    }
  });

  // Update count
  countEl.textContent = `${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
  countEl.style.display = matchCount > 0 || query ? '' : 'none';
}

function renderKvRow(
  container: HTMLElement,
  key: string,
  value: unknown,
  errorMap?: Map<string, string>,
  isChanged?: boolean
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

  // Changed indicator badge
  if (isChanged) {
    const changedBadge = document.createElement('span');
    changedBadge.className = 'dl-kv-changed-badge';
    changedBadge.textContent = '● changed';
    keyEl.appendChild(changedBadge);
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
  const pushArrayIndex = push.pushIndex - 1;

  if (pushArrayIndex <= 0) {
    container.innerHTML =
      '<div class="dl-diff-empty">This is the first push — no previous state to diff against.</div>';
    return;
  }

  const prevState = computeCumulativeState(pushArrayIndex - 1);
  const currState = computeCumulativeState(pushArrayIndex);
  const entries = deepDiff(prevState, currState);

  renderDiff(container, entries, entries.length);
}

// ─── CURRENT STATE TAB ───────────────────────────────────────────────────────

function renderCurrentStateTab(container: HTMLElement, push: DataLayerPush): void {
  const pushArrayIndex = push.pushIndex - 1;
  if (pushArrayIndex < 0) return;
  const state = computeCumulativeState(pushArrayIndex);
  const header = document.createElement('div');
  header.className = 'dl-state-header';
  header.textContent = `Cumulative state after push #${push.pushIndex} (${Object.keys(state).length} keys)`;
  container.appendChild(header);

  const keys = Object.keys(state).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div class="dl-state-empty">No state accumulated yet</div>';
    return;
  }

  // Search input
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dl-state-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'dl-state-search-input';
  searchInput.placeholder = 'Filter keys…';
  searchWrap.appendChild(searchInput);

  const searchCount = document.createElement('span');
  searchCount.className = 'dl-state-search-count';
  searchCount.textContent = `${keys.length} keys`;
  searchWrap.appendChild(searchCount);

  container.appendChild(searchWrap);

  // Key-value rows container
  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'dl-state-rows';

  for (const key of keys) {
    renderKvRow(rowsContainer, key, state[key]);
  }
  container.appendChild(rowsContainer);

  // Search filter
  searchInput.addEventListener(
    'input',
    debounce(() => {
      const query = searchInput.value.toLowerCase().trim();
      const rows = rowsContainer.querySelectorAll('.dl-kv-row');
      let visible = 0;
      rows.forEach((row) => {
        const keyText = row.querySelector('.dl-kv-key')?.textContent?.toLowerCase() ?? '';
        const valText = row.querySelector('.dl-kv-value')?.textContent?.toLowerCase() ?? '';
        const matches = !query || keyText.includes(query) || valText.includes(query);
        (row as HTMLElement).style.display = matches ? '' : 'none';
        if (matches) visible++;
      });
      searchCount.textContent = query ? `${visible} / ${keys.length} keys` : `${keys.length} keys`;
    }, 300)
  );
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

  // Correlation confidence legend
  const legend = document.createElement('div');
  legend.className = 'dl-correlation-legend';
  legend.innerHTML = `
    <span class="dl-legend-item"><span class="dl-legend-dot" style="background:var(--green)"></span>&lt;200ms = high</span>
    <span class="dl-legend-item"><span class="dl-legend-dot" style="background:var(--yellow)"></span>200-1000ms = medium</span>
    <span class="dl-legend-item"><span class="dl-legend-dot" style="background:var(--orange)"></span>&gt;1000ms = low</span>
  `;
  controls.appendChild(legend);

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
  const pushArrayIndex = push.pushIndex - 1;
  const state = computeCumulativeState(pushArrayIndex);
  renderLiveInspector(container, state);
}
