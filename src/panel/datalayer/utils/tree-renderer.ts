/** ═══════════════════════════════════════════════════════════════════════════
 * SHARED TREE RENDERER
 * Reactive tree view renderer for DataLayer state.
 * Used by both the Live Inspector and Push Data tabs.
 *
 * Provides:
 * - TreeNodeData type and ChangeType
 * - TreeRendererOptions for configuring renderer behavior
 * - createTreeNode() for rendering tree nodes with optional watch/highlight support
 * - Utility functions: isTreeExpandable, formatTreeValue
 * - Category icons and colors for display
 * ═══════════════════════════════════════════════════════════════════════════ */

import { copyToClipboard, showCopyFeedback } from '../../utils/clipboard';

// ─── TYPES ─────────────────────────────────────────────────────────────────

export type ChangeType = 'added' | 'changed' | 'removed' | undefined;

export interface TreeNodeData {
  key: string;
  value: unknown;
  depth: number;
  path: string;
  changeType: ChangeType;
  isLeaf: boolean;
  childCount: number;
}

// ─── OPTIONS ────────────────────────────────────────────────────────────────

export interface TreeRendererOptions {
  /** Enable right-click → watch functionality (adds contextmenu listener) */
  enableWatch: boolean;
  /** Enable change highlighting (applied when both this AND changeType are set) */
  enableHighlights: boolean;
  /** Default expansion state for nodes (false = collapsed) */
  startExpanded: boolean;
  /** Optional callback invoked when user right-clicks a key to watch a path */
  onWatch?: (path: string) => void;
}

// ─── CATEGORY DISPLAY ───────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  event:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  page: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  ecommerce:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
  other:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
};

export const CATEGORY_COLORS: Record<string, string> = {
  event: 'var(--accent)',
  user: '#a78bfa',
  page: '#38bdf8',
  ecommerce: '#48bb78',
  other: 'var(--text-2)',
};

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Check if a value is expandable (object or array).
 * Returns false for null and non-object types.
 */
export function isTreeExpandable(val: unknown): boolean {
  return val !== null && typeof val === 'object';
}

/**
 * Format a value for display in tree view.
 * Returns human-readable strings for primitives, arrays, and objects.
 */
export function formatTreeValue(val: unknown): string {
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

// ─── TREE NODE CREATION ──────────────────────────────────────────────────────

/**
 * Create a single tree node element with optional watch and highlight support.
 *
 * @param data The tree node data
 * @param options Configuration for renderer behavior (watch, highlights, expansion)
 * @param changedPaths Map of path -> change type for optional highlight lookup
 * @returns The constructed HTMLElement for the tree node
 */
export function createTreeNode(
  data: TreeNodeData,
  options: TreeRendererOptions = {
    enableWatch: true,
    enableHighlights: true,
    startExpanded: false,
  },
  changedPaths?: Map<string, ChangeType>
): HTMLElement {
  const node = document.createElement('div');
  node.className = 'dl-tree-node';
  node.dataset['path'] = data.path;

  // Apply initial expanded class if startExpanded is true
  if (options.startExpanded) {
    node.classList.add('expanded');
  }

  const row = document.createElement('div');
  row.className = 'dl-tree-row';
  row.style.paddingLeft = `${data.depth * 16}px`;

  // Toggle or placeholder
  if (!data.isLeaf) {
    const toggle = document.createElement('span');
    toggle.className = 'dl-tree-toggle';
    toggle.textContent = '▶';

    // Apply initial expanded state to toggle
    if (options.startExpanded) {
      toggle.classList.add('expanded');
    }

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

  // Apply change highlight only if enabled AND changeType is set
  if (options.enableHighlights && data.changeType) {
    keyEl.classList.add(`dl-tree-key-${data.changeType}`);
  }

  keyEl.textContent = data.key;

  // Add watch functionality only if enabled
  if (options.enableWatch) {
    keyEl.classList.add('dl-tree-key-watch');
    keyEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      options.onWatch?.(data.path);
    });
  }

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
    valEl.textContent = formatTreeValue(data.value);
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
        isLeaf: !isTreeExpandable(childVal),
        childCount: isTreeExpandable(childVal) ? Object.keys(childVal as object).length : 0,
      };
      childrenContainer.appendChild(createTreeNode(childNode, options, changedPaths));
    }

    node.appendChild(childrenContainer);
  }

  return node;
}
