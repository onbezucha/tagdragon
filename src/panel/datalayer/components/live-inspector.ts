// ─── LIVE INSPECTOR COMPONENT ─────────────────────────────────────────────
// Reactive tree view of cumulative DataLayer state with change highlighting
// and watch path functionality.

import { DOM } from '../../utils/dom';
import { debounce } from '../../utils/debounce';
import { getWatchedPaths, addWatchedPath, removeWatchedPath, clearWatchedPaths } from '../state';
import { shallowEqual } from '../utils/shallow-equal';
import { getNestedValue } from '../utils/nested-value';
import {
  createTreeNode as createSharedTreeNode,
  formatTreeValue,
  isTreeExpandable,
  type ChangeType,
  type TreeNodeData,
  type TreeRendererOptions,
} from '../utils/tree-renderer';

// ─── STATE ─────────────────────────────────────────────────────────────────

const _toastTimers = new Set<ReturnType<typeof setTimeout>>();
let pendingHighlights: Map<string, ChangeType> = new Map();
const highlightTimers = new Map<string, ReturnType<typeof setTimeout>>();
const HIGHLIGHT_DURATION = 1500;
let liveTabRendered = false;
// Stores cumulative state for watch bar re-renders (avoids DOM rebuild via extractStateFromTree)
let _currentCumulativeState: Record<string, unknown> = {};

// ─── TREE OPTIONS ──────────────────────────────────────────────────────────

// Live Inspector tree options — watch enabled with addWatchedPath callback
const liveTreeOptions: TreeRendererOptions = {
  enableWatch: true,
  enableHighlights: true,
  startExpanded: false,
  onWatch: (path: string) => {
    const added = addWatchedPath(path);
    if (!added) return;
    rerenderWatchBar();
  },
};

/**
 * Live Inspector wrapper around shared createTreeNode.
 * Pre-configures watch and highlight options for the Live tab.
 */
function createTreeNode(data: TreeNodeData, changedPaths?: Map<string, ChangeType>): HTMLElement {
  return createSharedTreeNode(data, liveTreeOptions, changedPaths);
}

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
  // Store for watch bar re-renders (avoids DOM rebuild)
  _currentCumulativeState = cumulativeState;

  const wrapper = document.createElement('div');
  wrapper.className = 'dl-live-container';

  // Watch bar
  renderWatchBar(wrapper, cumulativeState);

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
        isLeaf: !isTreeExpandable(cumulativeState[key]),
        childCount: isTreeExpandable(cumulativeState[key])
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
  highlightTimers.forEach((t) => clearTimeout(t));
  highlightTimers.clear();
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
        isLeaf: !isTreeExpandable(curr[key]),
        childCount: isTreeExpandable(curr[key]) ? Object.keys(curr[key] as object).length : 0,
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
  const isLeaf = !isTreeExpandable(newValue);

  if (isLeaf) {
    const valEl = node.querySelector(':scope > .dl-tree-row .dl-tree-value') as HTMLElement | null;
    if (valEl) {
      valEl.textContent = formatTreeValue(newValue);
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
      bracket.textContent = isArray ? `[${childCount}]` : `{${childCount}}`;
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
        isLeaf: !isTreeExpandable(childVal),
        childCount: isTreeExpandable(childVal) ? Object.keys(childVal as object).length : 0,
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

/**
 * Create autocomplete input for watch path entry.
 * Shared between renderWatchBar and renderWatchBarWithState.
 */
function createAutocompleteInput(
  empty: HTMLElement,
  cumulativeState: Record<string, unknown>
): void {
  empty.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dl-watch-input';
  input.placeholder = 'Enter path (e.g. ecommerce.purchase.actionField.id)';
  empty.appendChild(input);
  input.focus();

  // Autocomplete dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'dl-watch-autocomplete';
  dropdown.style.display = 'none';
  empty.appendChild(dropdown);

  const allPaths = extractAllPaths(cumulativeState);
  const watched = getWatchedPaths();

  input.addEventListener(
    'input',
    debounce(() => {
      const query = input.value.toLowerCase().trim();
      dropdown.innerHTML = '';
      if (!query) {
        dropdown.style.display = 'none';
        return;
      }
      const matches = allPaths
        .filter((p) => p.toLowerCase().includes(query) && !watched.includes(p))
        .slice(0, 10);
      if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
      }
      for (const match of matches) {
        const item = document.createElement('div');
        item.className = 'dl-watch-autocomplete-item';
        item.textContent = match;
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          addWatchedPath(match);
          rerenderWatchBar();
        });
        dropdown.appendChild(item);
      }
      dropdown.style.display = 'block';
    }, 300)
  );

  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter' && input.value.trim()) {
      addWatchedPath(input.value.trim());
      rerenderWatchBar();
    } else if (ke.key === 'Escape') {
      rerenderWatchBar();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => rerenderWatchBar(), 150);
  });
}

function renderWatchBar(container: HTMLElement, cumulativeState: Record<string, unknown>): void {
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
        createAutocompleteInput(empty, _currentCumulativeState);
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
    resolveWatchPathValues(bar, container, cumulativeState);

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
function resolveWatchPathValues(
  bar: HTMLElement,
  _wrapper: HTMLElement,
  cumulativeState: Record<string, unknown>
): void {
  const chips = bar.querySelectorAll('.dl-watch-chip');
  for (const chip of chips) {
    const path = (chip as HTMLElement).dataset['watchPath'];
    if (!path) continue;

    const valueSpan = chip.querySelector('.dl-watch-chip-value') as HTMLElement;
    if (!valueSpan) continue;

    // Use cumulativeState directly instead of rebuilding from DOM
    const value = getNestedValue(cumulativeState, path);

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
  // Pass stored cumulative state to avoid DOM rebuild via extractStateFromTree
  renderWatchBarWithState(container, _currentCumulativeState);
}

/**
 * Re-render watch bar with a specific state object (avoids extractStateFromTree DOM traversal).
 */
function renderWatchBarWithState(
  container: HTMLElement,
  cumulativeState: Record<string, unknown>
): void {
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

    const addBtn = empty.querySelector('.dl-watch-add-btn') as HTMLButtonElement;
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        createAutocompleteInput(empty, cumulativeState);
      });
    }
  } else {
    for (const path of watched) {
      const chip = document.createElement('span');
      chip.className = 'dl-watch-chip';

      const pathLabel = document.createElement('span');
      pathLabel.className = 'dl-watch-chip-path';
      pathLabel.textContent = path;
      chip.appendChild(pathLabel);

      const valueSpan = document.createElement('span');
      valueSpan.className = 'dl-watch-chip-value';

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

    // Resolve watch path values using passed cumulativeState (no DOM rebuild)
    resolveWatchPathValues(bar, container, cumulativeState);

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

// ─── HIGHLIGHTS ────────────────────────────────────────────────────────────

function applyHighlights(container: HTMLElement, changedPaths: Map<string, ChangeType>): void {
  for (const [path, type] of changedPaths) {
    // Clear any existing timer for this path to avoid stale callbacks
    const existingTimer = highlightTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

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

    // Set per-path timer for cleanup
    highlightTimers.set(
      path,
      setTimeout(() => {
        const keyEl = container.querySelector(
          `.dl-tree-node[data-path="${CSS.escape(path)}"] > .dl-tree-row .dl-tree-key`
        ) as HTMLElement | null;
        if (keyEl) {
          keyEl.classList.remove(`dl-tree-key-${type}`);
        }
        highlightTimers.delete(path);
      }, HIGHLIGHT_DURATION)
    );
  }
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

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Extract all dot-notation paths from a state object (up to maxDepth).
 */
function extractAllPaths(obj: Record<string, unknown>, prefix = '', maxDepth = 4): string[] {
  const paths: string[] = [];
  if (maxDepth <= 0) return paths;

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...extractAllPaths(value as Record<string, unknown>, path, maxDepth - 1));
    }
  }
  return paths;
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────

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
