// ─── LIVE INSPECTOR COMPONENT ─────────────────────────────────────────────
// Reactive tree view of cumulative DataLayer state with change highlighting
// and watch path functionality.

import { DOM } from '../utils/dom';
import {
  getWatchedPaths,
  addWatchedPath,
  removeWatchedPath,
  clearWatchedPaths,
} from './state';

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

let pendingHighlights: Map<string, ChangeType> = new Map();
let highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;
const HIGHLIGHT_DURATION = 1500;

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
  changedPaths?: Map<string, ChangeType>,
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
export function queueHighlights(changedPaths: Map<string, ChangeType>): void {
  pendingHighlights = new Map(changedPaths);

  // If Live tab is currently visible, apply immediately
  const $content = DOM.dlDetailContent;
  if (!$content) return;

  const activeTab = document.querySelector('.dl-dtab.active') as HTMLElement | null;
  if (activeTab?.dataset['tab'] === 'live') {
    applyHighlights($content, changedPaths);
    pendingHighlights.clear();
  }
}

/**
 * Check watch paths against new cumulative state and show toasts for changes.
 */
export function checkWatchPaths(
  prevState: Record<string, unknown>,
  newState: Record<string, unknown>,
): void {
  const watched = getWatchedPaths();
  if (watched.length === 0) return;

  const toastArea = document.getElementById('dl-watch-toast-area');
  if (!toastArea) return;

  for (const path of watched) {
    const oldVal = getNestedValue(prevState, path);
    const newVal = getNestedValue(newState, path);

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      showWatchToast(toastArea, path, oldVal, newVal);
    }
  }
}

/**
 * Clear all state (called on Clear).
 */
export function clearLiveState(): void {
  pendingHighlights.clear();
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
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
    empty.textContent = 'Right-click a key to watch';
    bar.appendChild(empty);
  } else {
    for (const path of watched) {
      const chip = document.createElement('span');
      chip.className = 'dl-watch-chip';
      chip.textContent = path;

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

function rerenderWatchBar(): void {
  const bar = document.querySelector('.dl-watch-bar');
  if (bar) {
    const container = bar.parentElement;
    if (container) {
      bar.remove();
      const newBar = document.createElement('div');
      // Re-render watch bar into container (first child)
      const tempDiv = document.createElement('div');
      renderWatchBar(tempDiv);
      const newBarEl = tempDiv.querySelector('.dl-watch-bar');
      if (newBarEl && container.firstChild) {
        container.insertBefore(newBarEl, container.firstChild);
      }
    }
  }
}

// ─── TREE RENDERING ────────────────────────────────────────────────────────

function createTreeNode(
  data: TreeNodeData,
  changedPaths?: Map<string, ChangeType>,
): HTMLElement {
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
    valEl.title = typeof data.value === 'object'
      ? JSON.stringify(data.value, null, 2)
      : String(data.value);
    valEl.style.cursor = 'pointer';
    valEl.addEventListener('click', () => {
      const text = typeof data.value === 'object'
        ? JSON.stringify(data.value, null, 2)
        : String(data.value ?? '');
      navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
    });
    row.appendChild(valEl);
  } else {
    const bracket = document.createElement('span');
    bracket.className = 'dl-tree-value dl-tree-value-bracket';
    const isArray = Array.isArray(data.value);
    bracket.textContent = isArray
      ? `[${data.childCount}]`
      : `{${data.childCount}}`;
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
        childCount: isExpandable(childVal)
          ? Object.keys(childVal as object).length
          : 0,
      };
      childrenContainer.appendChild(createTreeNode(childNode, changedPaths));
    }

    node.appendChild(childrenContainer);
  }

  return node;
}

// ─── HIGHLIGHTS ────────────────────────────────────────────────────────────

function applyHighlights(
  container: HTMLElement,
  changedPaths: Map<string, ChangeType>,
): void {
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
  }

  for (const [path, type] of changedPaths) {
    // Find the tree row with matching data-path
    const keyEl = container.querySelector(
      `.dl-tree-node[data-path="${CSS.escape(path)}"] > .dl-tree-row .dl-tree-key`,
    ) as HTMLElement | null;

    if (keyEl) {
      // Remove old highlight classes
      keyEl.classList.remove(
        'dl-tree-key-changed',
        'dl-tree-key-added',
        'dl-tree-key-removed',
      );
      // Force reflow to restart animation
      void keyEl.offsetWidth;
      keyEl.classList.add(`dl-tree-key-${type}`);

      // Auto-expand parent nodes to make the changed key visible
      let parent = keyEl.closest('.dl-tree-node')?.parentElement?.closest('.dl-tree-node');
      while (parent) {
        parent.classList.add('expanded');
        const toggle = parent.querySelector(':scope > .dl-tree-row .dl-tree-toggle') as HTMLElement | null;
        if (toggle) toggle.classList.add('expanded');
        parent = parent.parentElement?.closest('.dl-tree-node');
      }
    }
  }

  // Clean up highlight classes after animation
  highlightTimeoutId = setTimeout(() => {
    for (const [path, type] of changedPaths) {
      const keyEl = container.querySelector(
        `.dl-tree-node[data-path="${CSS.escape(path)}"] > .dl-tree-row .dl-tree-key`,
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
  newVal: unknown,
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
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);

  // Limit toasts (keep max 5)
  const toasts = container.querySelectorAll('.dl-watch-toast');
  if (toasts.length > 5) {
    toasts[0].remove();
  }
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────

function isExpandable(val: unknown): boolean {
  return val !== null && typeof val === 'object';
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
    } catch { return '[Object]'; }
  }
  return String(val);
}

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
