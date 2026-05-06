// ─── LIVE INSPECTOR COMPONENT ─────────────────────────────────────────────
// Reactive tree view of cumulative DataLayer state with change highlighting
// and watch path functionality.

import { DOM } from '../../utils/dom';
import { copyToClipboard, showCopyFeedback } from '../../utils/clipboard';
import { getWatchedPaths, addWatchedPath, removeWatchedPath, clearWatchedPaths } from '../state';

// ─── TYPES ─────────────────────────────────────────────────────────────────

type ChangeType = 'added' | 'changed' | 'removed' | undefined;

interface TreeNodeData {
  key: string;
  value: unknown;
  depth: number;
  path: string;
  changeType: ChangeType;
  isLeaf: boolean;
  childCount: number;
}

// ─── STATE ─────────────────────────────────────────────────────────────────

const _toastTimers = new Set<ReturnType<typeof setTimeout>>();
let pendingHighlights: Map<string, ChangeType> = new Map();
let highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;
const HIGHLIGHT_DURATION = 1500;
let liveTabRendered = false;

// ─── PUBLIC API ───────────────────────────────────────────────────────────

/**
 * Render the Live Inspector tab content.
 * @param container The #dl-detail-content element
 * @param cumulativeState The current cumulative state to render
 * @param changedPaths Map of path -> change type from the latest diff
 */
export function renderLiveInspector(
  container: HTMLElement,
  cumulativeState: Record<string, unknown>,
  changedPaths?: Map<string, ChangeType>
): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dl-live-container';

  // Watch bar
  renderWatchBar(wrapper);

  // Live header
  const header = document.createElement('div');
  header.className = 'dl-live-header';
  const keyCount = Object.keys(cumulativeState).length;
  header.textContent = `Current state · ${keyCount} top-level keys`;
  wrapper.appendChild(header);

  // Toast area (for watch notifications)
  const toastArea = document.createElement('div');
  toastArea.id = 'dl-watch-toast-area';
  wrapper.appendChild(toastArea);

  // E3: Tree controls (Expand all / Collapse all)
  const treeControls = document.createElement('div');
  treeControls.className = 'dl-tree-controls';

  const expandAll = document.createElement('button');
  expandAll.className = 'dl-tree-control-btn';
  expandAll.textContent = '▾ Expand all';
  expandAll.addEventListener('click', () => {
    wrapper.querySelectorAll('.dl-tree-node').forEach((node) => {
      node.classList.add('expanded');
      const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
      if (toggle) toggle.classList.add('expanded');
    });
  });

  const collapseAll = document.createElement('button');
  collapseAll.className = 'dl-tree-control-btn';
  collapseAll.textContent = '▸ Collapse all';
  collapseAll.addEventListener('click', () => {
    wrapper.querySelectorAll('.dl-tree-node').forEach((node) => {
      node.classList.remove('expanded');
      const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
      if (toggle) toggle.classList.remove('expanded');
    });
  });

  treeControls.appendChild(expandAll);
  treeControls.appendChild(collapseAll);
  wrapper.appendChild(treeControls);

  // Tree
  const treeContainer = document.createElement('div');
  treeContainer.className = 'dl-tree';

  if (keyCount === 0) {
    const empty = document.createElement('div');
    empty.className = 'dl-live-empty';
    empty.textContent = 'No DataLayer state yet';
    treeContainer.appendChild(empty);
  } else {
    const sortedKeys = Object.keys(cumulativeState).sort();
    for (const key of sortedKeys) {
      const node: TreeNodeData = {
        key,
        value: cumulativeState[key],
        depth: 0,
        path: key,
        changeType: changedPaths?.get(key),
        isLeaf: !isExpandable(cumulativeState[key]),
        childCount: isExpandable(cumulativeState[key])
          ? Object.keys(cumulativeState[key] as object).length
          : 0,
      };
      treeContainer.appendChild(createTreeNode(node, changedPaths));
    }
  }

  wrapper.appendChild(treeContainer);
  container.appendChild(wrapper);

  liveTabRendered = true;

  // Apply pending highlights ONLY if this is a live update (queueHighlights triggered
  // while the tab was already visible). Do NOT auto-expand when user first opens
  // the tab — the tree should start collapsed.
  // changedPaths is only passed when queueHighlights() triggers a re-render
  // of an already-visible Live tab.
  if (changedPaths) {
    applyHighlights(treeContainer, changedPaths);
    pendingHighlights.clear();
  } else {
    // First open or tab switch — discard pending highlights without expanding
    pendingHighlights.clear();
  }
}

/**
 * Queue change highlights for the Live Inspector.
 * Called from receiveDataLayerPush when the Live tab may not be visible.
 */
export function queueHighlights(
  changedPaths: Map<string, ChangeType>,
  prevState: Record<string, unknown>,
  newState: Record<string, unknown>
): void {
  pendingHighlights = new Map(changedPaths);

  // If Live tab is currently visible, apply incrementally
  const $content = DOM.dlDetailContent;
  if (!$content) return;

  const activeTab = document.querySelector('.dl-dtab.active') as HTMLElement | null;
  if (activeTab?.dataset['tab'] === 'live') {
    if (liveTabRendered) {
      updateTreeIncremental($content, prevState, newState, changedPaths);
    } else {
      applyHighlights($content, changedPaths);
    }
    pendingHighlights.clear();
  }
}

/**
 * Check watch paths against new cumulative state and show toasts for changes.
 */
export function checkWatchPaths(
  prevState: Record<string, unknown>,
  newState: Record<string, unknown>
): void {
  const watched = getWatchedPaths();
  if (watched.length === 0) return;

  const toastArea = document.getElementById('dl-watch-toast-area');
  if (!toastArea) return;

  for (const path of watched) {
    const oldVal = getNestedValue(prevState, path);
    const newVal = getNestedValue(newState, path);

    if (!shallowEqual(oldVal, newVal)) {
      showWatchToast(toastArea, path, oldVal, newVal);
    }
  }
}

/**
 * Clear all state (called on Clear).
 */
export function clearLiveState(): void {
  _toastTimers.forEach((t) => clearTimeout(t));
  _toastTimers.clear();
  pendingHighlights.clear();
  liveTabRendered = false;
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
}

// ─── INCREMENTAL TREE UPDATE ─────────────────────────────────────────────

function updateTreeIncremental(
  container: HTMLElement,
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  changedPaths: Map<string, ChangeType>
): void {
  const treeContainer = container.querySelector('.dl-tree') as HTMLElement | null;
  if (!treeContainer) return;

  // Update header
  const header = container.querySelector('.dl-live-header') as HTMLElement | null;
  if (header) {
    const keyCount = Object.keys(curr).length;
    header.textContent = `Current state · ${keyCount} top-level keys`;
  }

  // Remove keys that no longer exist
  for (const key of Object.keys(prev)) {
    if (!(key in curr)) {
      const node = treeContainer.querySelector(`.dl-tree-node[data-path="${CSS.escape(key)}"]`);
      if (node) node.remove();
    }
  }

  // Add or update keys
  for (const key of Object.keys(curr).sort()) {
    const existingNode = treeContainer.querySelector(
      `.dl-tree-node[data-path="${CSS.escape(key)}"]`
    ) as HTMLElement | null;

    const changeType = changedPaths.get(key);

    if (!existingNode) {
      // New key — insert in sorted position
      const nodeData: TreeNodeData = {
        key,
        value: curr[key],
        depth: 0,
        path: key,
        changeType,
        isLeaf: !isExpandable(curr[key]),
        childCount: isExpandable(curr[key]) ? Object.keys(curr[key] as object).length : 0,
      };
      const newNode = createTreeNode(nodeData, changedPaths);
      insertNodeSorted(treeContainer, newNode, key);
    } else if (changeType) {
      // Existing key — update value if changed
      updateExistingNode(existingNode, curr[key], changeType, changedPaths);
    }
  }
}

function insertNodeSorted(container: HTMLElement, newNode: HTMLElement, key: string): void {
  const nodes = container.querySelectorAll(':scope > .dl-tree-node');
  let inserted = false;
  for (const node of nodes) {
    const nodeKey = (node as HTMLElement).dataset['path'] ?? '';
    if (key.localeCompare(nodeKey) < 0) {
      container.insertBefore(newNode, node);
      inserted = true;
      break;
    }
  }
  if (!inserted) container.appendChild(newNode);
}

function updateExistingNode(
  node: HTMLElement,
  newValue: unknown,
  changeType: ChangeType,
  changedPaths: Map<string, ChangeType>
): void {
  const isLeaf = !isExpandable(newValue);

  if (isLeaf) {
    const valEl = node.querySelector(':scope > .dl-tree-row .dl-tree-value') as HTMLElement | null;
    if (valEl) {
      valEl.textContent = formatValue(newValue);
      valEl.title =
        typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue);
    }
    const childrenContainer = node.querySelector(':scope > .dl-tree-children');
    if (childrenContainer) childrenContainer.remove();
    const toggle = node.querySelector(':scope > .dl-tree-row .dl-tree-toggle');
    if (toggle) {
      const placeholder = document.createElement('span');
      placeholder.className = 'dl-tree-toggle-placeholder';
      toggle.replaceWith(placeholder);
    }
  } else {
    const bracket = node.querySelector(
      ':scope > .dl-tree-row .dl-tree-value-bracket'
    ) as HTMLElement | null;
    if (bracket) {
      const isArray = Array.isArray(newValue);
      const childCount = Object.keys(newValue as object).length;
      bracket.textContent = isArray ? `[${childCount}]` : `{${childCount}`;
    }
    const oldChildren = node.querySelector(':scope > .dl-tree-children');
    if (oldChildren) oldChildren.remove();
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'dl-tree-children';
    const obj = newValue as Record<string, unknown>;
    const entries = Array.isArray(obj)
      ? obj.map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
    const path = (node as HTMLElement).dataset['path'] ?? '';
    for (const [childKey, childVal] of entries) {
      const childPath = Array.isArray(obj) ? `${path}[${childKey}]` : `${path}.${childKey}`;
      const childNode: TreeNodeData = {
        key: Array.isArray(obj) ? `[${childKey}]` : childKey,
        value: childVal,
        depth: 1,
        path: childPath,
        changeType: changedPaths.get(childPath),
        isLeaf: !isExpandable(childVal),
        childCount: isExpandable(childVal) ? Object.keys(childVal as object).length : 0,
      };
      childrenContainer.appendChild(createTreeNode(childNode, changedPaths));
    }
    node.appendChild(childrenContainer);
  }

  // Apply highlight animation
  const keyEl = node.querySelector(':scope > .dl-tree-row .dl-tree-key') as HTMLElement | null;
  if (keyEl && changeType) {
    keyEl.classList.remove('dl-tree-key-changed', 'dl-tree-key-added', 'dl-tree-key-removed');
    void keyEl.offsetWidth;
    keyEl.classList.add(`dl-tree-key-${changeType}`);
  }
}

// ─── WATCH BAR ─────────────────────────────────────────────────────────────

function renderWatchBar(container: HTMLElement): void {
  const bar = document.createElement('div');
  bar.className = 'dl-watch-bar';

  const label = document.createElement('span');
  label.className = 'dl-watch-bar-label';
  label.textContent = 'Watch';
  bar.appendChild(label);

  const watched = getWatchedPaths();
  if (watched.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'dl-watch-empty';
    empty.innerHTML =
      '💡 Right-click a key to watch it, or click <button class="dl-watch-add-btn">+</button> to add a path';
    bar.appendChild(empty);

    // Click handler for the + button
    const addBtn = empty.querySelector('.dl-watch-add-btn') as HTMLButtonElement;
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Replace hint content with inline input
        empty.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'dl-watch-input';
        input.placeholder = 'Enter path (e.g. ecommerce.purchase.actionField.id)';
        empty.appendChild(input);
        input.focus();

        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter' && input.value.trim()) {
            addWatchedPath(input.value.trim());
            rerenderWatchBar();
          } else if (ke.key === 'Escape') {
            // Restore hint with + button
            rerenderWatchBar();
          }
        });

        // Close on blur
        input.addEventListener('blur', () => {
          // Small delay to allow Enter key to fire first
          setTimeout(() => rerenderWatchBar(), 150);
        });
      });
    }
  } else {
    for (const path of watched) {
      const chip = document.createElement('span');
      chip.className = 'dl-watch-chip';

      // Path label
      const pathLabel = document.createElement('span');
      pathLabel.className = 'dl-watch-chip-path';
      pathLabel.textContent = path;
      chip.appendChild(pathLabel);

      // Value display (E2: Show "⚠ Path not found" when path doesn't exist)
      const valueSpan = document.createElement('span');
      valueSpan.className = 'dl-watch-chip-value';

      // We need cumulativeState to resolve the value - get it from the tree's current state
      // The watch bar is rendered into wrapper which has access to the cumulativeState
      // We'll use a data attribute approach: store path, resolve on first render after DOM is attached
      chip.dataset['watchPath'] = path;
      chip.appendChild(valueSpan);

      const remove = document.createElement('span');
      remove.className = 'dl-watch-remove';
      remove.textContent = '×';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        removeWatchedPath(path);
        rerenderWatchBar();
      });
      chip.appendChild(remove);
      bar.appendChild(chip);
    }

    // E2: Resolve watch path values after DOM is attached
    // This is called from renderLiveInspector after renderWatchBar
    resolveWatchPathValues(bar, container);

    // Clear all button
    const clearBtn = document.createElement('span');
    clearBtn.className = 'dl-watch-chip';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.color = 'var(--red)';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      clearWatchedPaths();
      rerenderWatchBar();
    });
    bar.appendChild(clearBtn);
  }

  container.appendChild(bar);
}

// E2: Resolve and display values for watched paths in the watch bar
function resolveWatchPathValues(bar: HTMLElement, wrapper: HTMLElement): void {
  const chips = bar.querySelectorAll('.dl-watch-chip');
  for (const chip of chips) {
    const path = (chip as HTMLElement).dataset['watchPath'];
    if (!path) continue;

    const valueSpan = chip.querySelector('.dl-watch-chip-value') as HTMLElement;
    if (!valueSpan) continue;

    // Find the cumulative state from the tree container's data
    // The wrapper holds the live container with the state
    const treeContainer = wrapper.querySelector('.dl-tree') as HTMLElement | null;
    if (!treeContainer) continue;

    // Build state from tree nodes (extract current state from rendered tree)
    const state = extractStateFromTree(treeContainer);
    const value = getNestedValue(state, path);

    if (value === undefined) {
      // E2: Path not found - show warning
      valueSpan.textContent = '⚠ Path not found';
      valueSpan.classList.add('dl-watch-value-missing');
    } else {
      valueSpan.textContent = formatValueShort(value);
    }
  }
}

// E2: Extract state object from rendered tree nodes for watch path resolution
function extractStateFromTree(treeContainer: HTMLElement): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  const nodes = treeContainer.querySelectorAll(':scope > .dl-tree-node');

  for (const node of nodes) {
    const path = (node as HTMLElement).dataset['path'];
    if (!path) continue;

    // Get the value from the rendered node
    const value = extractNodeValue(node as HTMLElement);
    state[path] = value;
  }

  return state;
}

// E2: Extract the full value (including nested) from a tree node
function extractNodeValue(node: HTMLElement): unknown {
  const row = node.querySelector(':scope > .dl-tree-row');
  if (!row) return undefined;

  const isLeaf = !node.querySelector(':scope > .dl-tree-children');

  if (isLeaf) {
    // Leaf node - get the raw value from the data
    const valueEl = row.querySelector('.dl-tree-value');
    if (valueEl) {
      const text = valueEl.textContent ?? '';
      // Try to parse the value back to its original type
      if (text === 'null') return null;
      if (text === 'undefined') return undefined;
      if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
      if (text === 'true') return true;
      if (text === 'false') return false;
      if (!isNaN(Number(text)) && text.trim() !== '') return Number(text);
      return text;
    }
    return undefined;
  }

  // Object/Array - recursively build the value
  const childrenContainer = node.querySelector(':scope > .dl-tree-children');
  if (!childrenContainer) {
    // Try to get bracket info for empty object/array
    const bracket = row.querySelector('.dl-tree-value-bracket');
    if (bracket) {
      const bracketText = bracket.textContent ?? '';
      if (bracketText.startsWith('[')) return [];
      if (bracketText.startsWith('{')) return {};
    }
    return undefined;
  }

  const childNodes = childrenContainer.querySelectorAll(':scope > .dl-tree-node');
  const path = node.dataset['path'] ?? '';
  const isArrayPath = path.includes('[');

  if (isArrayPath) {
    // Array
    const arr: unknown[] = [];
    for (const child of childNodes) {
      const childPath = (child as HTMLElement).dataset['path'] ?? '';
      const match = childPath.match(/\[(\d+)\]\s*$/);
      if (match) {
        const index = parseInt(match[1], 10);
        arr[index] = extractNodeValue(child as HTMLElement);
      }
    }
    return arr;
  } else {
    // Object
    const obj: Record<string, unknown> = {};
    for (const child of childNodes) {
      const childPath = (child as HTMLElement).dataset['path'] ?? '';
      const keyMatch = childPath.match(/\.([^.[\]]+)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        obj[key] = extractNodeValue(child as HTMLElement);
      }
    }
    return obj;
  }
}

function rerenderWatchBar(): void {
  const bar = document.querySelector('.dl-watch-bar');
  if (!bar) return;
  const container = bar.parentElement;
  if (!container) return;
  // Remove old bar (and its listeners) then render a fresh one into the same container
  bar.remove();
  renderWatchBar(container);
}

// ─── TREE RENDERING ────────────────────────────────────────────────────────

function createTreeNode(data: TreeNodeData, changedPaths?: Map<string, ChangeType>): HTMLElement {
  const node = document.createElement('div');
  node.className = 'dl-tree-node';
  node.dataset['path'] = data.path;

  const row = document.createElement('div');
  row.className = 'dl-tree-row';
  row.style.paddingLeft = `${data.depth * 16}px`;

  // Toggle or placeholder
  if (!data.isLeaf) {
    const toggle = document.createElement('span');
    toggle.className = 'dl-tree-toggle';
    toggle.textContent = '▶';
    toggle.addEventListener('click', () => {
      node.classList.toggle('expanded');
      toggle.classList.toggle('expanded');
    });
    row.appendChild(toggle);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'dl-tree-toggle-placeholder';
    row.appendChild(placeholder);
  }

  // Key
  const keyEl = document.createElement('span');
  keyEl.className = 'dl-tree-key';

  // Apply change highlight
  if (data.changeType) {
    keyEl.classList.add(`dl-tree-key-${data.changeType}`);
  }

  keyEl.textContent = data.key;

  // Make key clickable to add to watch list (right-click context)
  keyEl.classList.add('dl-tree-key-watch');
  keyEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const added = addWatchedPath(data.path);
    if (!added) return;
    rerenderWatchBar();
  });

  row.appendChild(keyEl);

  // Separator
  const sep = document.createElement('span');
  sep.className = 'dl-tree-separator';
  sep.textContent = ': ';
  row.appendChild(sep);

  // Value
  if (data.isLeaf) {
    const valEl = document.createElement('span');
    valEl.className = 'dl-tree-value';
    valEl.textContent = formatValue(data.value);
    valEl.title =
      typeof data.value === 'object' ? JSON.stringify(data.value, null, 2) : String(data.value);
    valEl.style.cursor = 'pointer';
    valEl.addEventListener('click', async () => {
      const text =
        typeof data.value === 'object'
          ? JSON.stringify(data.value, null, 2)
          : String(data.value ?? '');
      const success = await copyToClipboard(text);
      showCopyFeedback(valEl, success);
    });
    row.appendChild(valEl);
  } else {
    const bracket = document.createElement('span');
    bracket.className = 'dl-tree-value dl-tree-value-bracket';
    const isArray = Array.isArray(data.value);
    bracket.textContent = isArray ? `[${data.childCount}]` : `{${data.childCount}}`;
    row.appendChild(bracket);
  }

  node.appendChild(row);

  // Children (for objects/arrays)
  if (!data.isLeaf) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'dl-tree-children';

    const obj = data.value as Record<string, unknown>;
    const entries = Array.isArray(obj)
      ? obj.map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));

    for (const [childKey, childVal] of entries) {
      const childPath = Array.isArray(obj)
        ? `${data.path}[${childKey}]`
        : `${data.path}.${childKey}`;
      const childNode: TreeNodeData = {
        key: Array.isArray(obj) ? `[${childKey}]` : childKey,
        value: childVal,
        depth: data.depth + 1,
        path: childPath,
        changeType: changedPaths?.get(childPath),
        isLeaf: !isExpandable(childVal),
        childCount: isExpandable(childVal) ? Object.keys(childVal as object).length : 0,
      };
      childrenContainer.appendChild(createTreeNode(childNode, changedPaths));
    }

    node.appendChild(childrenContainer);
  }

  return node;
}

// ─── HIGHLIGHTS ────────────────────────────────────────────────────────────

function applyHighlights(container: HTMLElement, changedPaths: Map<string, ChangeType>): void {
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
  }

  for (const [path, type] of changedPaths) {
    // Find the tree row with matching data-path
    const keyEl = container.querySelector(
      `.dl-tree-node[data-path="${CSS.escape(path)}"] > .dl-tree-row .dl-tree-key`
    ) as HTMLElement | null;

    if (keyEl) {
      // Remove old highlight classes
      keyEl.classList.remove('dl-tree-key-changed', 'dl-tree-key-added', 'dl-tree-key-removed');
      // Force reflow to restart animation
      void keyEl.offsetWidth;
      keyEl.classList.add(`dl-tree-key-${type}`);

      // Auto-expand parent nodes to make the changed key visible
      let parent = keyEl.closest('.dl-tree-node')?.parentElement?.closest('.dl-tree-node');
      while (parent) {
        parent.classList.add('expanded');
        const toggle = parent.querySelector(
          ':scope > .dl-tree-row .dl-tree-toggle'
        ) as HTMLElement | null;
        if (toggle) toggle.classList.add('expanded');
        parent = parent.parentElement?.closest('.dl-tree-node');
      }
    }
  }

  // Clean up highlight classes after animation
  highlightTimeoutId = setTimeout(() => {
    for (const [path, type] of changedPaths) {
      const keyEl = container.querySelector(
        `.dl-tree-node[data-path="${CSS.escape(path)}"] > .dl-tree-row .dl-tree-key`
      ) as HTMLElement | null;
      if (keyEl) {
        keyEl.classList.remove(`dl-tree-key-${type}`);
      }
    }
    highlightTimeoutId = null;
  }, HIGHLIGHT_DURATION);
}

// ─── WATCH TOASTS ──────────────────────────────────────────────────────────

function showWatchToast(
  container: HTMLElement,
  path: string,
  oldVal: unknown,
  newVal: unknown
): void {
  const toast = document.createElement('div');
  toast.className = 'dl-watch-toast';

  const pathEl = document.createElement('span');
  pathEl.className = 'dl-toast-path';
  pathEl.textContent = path;
  toast.appendChild(pathEl);

  const arrow = document.createElement('span');
  arrow.className = 'dl-toast-arrow';
  arrow.textContent = ': ';
  toast.appendChild(arrow);

  const oldStr = formatValueShort(oldVal);
  const newStr = formatValueShort(newVal);

  if (oldStr !== '—') {
    const oldEl = document.createElement('span');
    oldEl.className = 'dl-toast-value';
    oldEl.style.color = 'var(--red)';
    oldEl.style.textDecoration = 'line-through';
    oldEl.textContent = oldStr;
    toast.appendChild(oldEl);

    const sep = document.createElement('span');
    sep.className = 'dl-toast-arrow';
    sep.textContent = ' → ';
    toast.appendChild(sep);
  }

  const newEl = document.createElement('span');
  newEl.className = 'dl-toast-value';
  newEl.textContent = newStr;
  toast.appendChild(newEl);

  container.appendChild(toast);

  // Auto-dismiss after 3s
  const timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  _toastTimers.add(timer);

  // Limit toasts (keep max 5)
  const toasts = container.querySelectorAll('.dl-watch-toast');
  if (toasts.length > 5) {
    toasts[0].remove();
  }
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────

/**
 * Get a nested value from an object using dot-notation path.
 * Supports bracket notation for arrays: "items[0].name"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function isExpandable(val: unknown): boolean {
  return val !== null && typeof val === 'object';
}

/**
 * Shallow compare for primitive and simple object equality.
 * Used to avoid JSON.stringify for watch path comparisons.
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]
  );
}

function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `Array(${val.length})`;
  if (typeof val === 'object') {
    const keys = Object.keys(val as object);
    return `{${keys.length} keys}`;
  }
  return String(val);
}

function formatValueShort(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val.length > 30 ? `"${val.slice(0, 27)}..."` : `"${val}"`;
  if (typeof val === 'object') {
    try {
      const s = JSON.stringify(val);
      return s.length > 40 ? s.slice(0, 37) + '...' : s;
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}

// ─── END ───────────────────────────────────────────────────────────────────────
