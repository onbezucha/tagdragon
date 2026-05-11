import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock clipboard utilities
vi.mock('../../../src/panel/utils/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
  showCopyFeedback: vi.fn(),
}));

// Mock datalayer state
vi.mock('../../../src/panel/datalayer/state', () => ({
  getAllDlPushes: vi.fn().mockReturnValue([]),
  computeCumulativeState: vi.fn().mockReturnValue({}),
  getValidationErrors: vi.fn().mockReturnValue([]),
  getCorrelationWindow: vi.fn().mockReturnValue(2000),
  setCorrelationWindow: vi.fn(),
  addWatchedPath: vi.fn().mockReturnValue(true),
}));

// Mock other dependencies
vi.mock('../../../src/panel/state', () => ({
  getConfig: vi.fn().mockReturnValue({ timestampFormat: 'relative' }),
  getAllRequests: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../src/panel/utils/dom', () => ({
  DOM: {},
}));

vi.mock('../../../src/panel/datalayer/utils/diff-renderer', () => ({
  deepDiff: vi.fn().mockReturnValue([]),
  renderDiff: vi.fn(),
}));

vi.mock('../../../src/panel/datalayer/utils/ecommerce-formatter', () => ({
  renderEcommerceTable: vi.fn(),
  detectEcommerceType: vi.fn().mockReturnValue(null),
}));

vi.mock('../../../src/panel/datalayer/utils/correlation', () => ({
  findCorrelatedRequests: vi.fn().mockReturnValue([]),
  renderCorrelation: vi.fn(),
}));

vi.mock('../../../src/panel/datalayer/components/push-list', () => ({
  getSourceColor: vi.fn().mockReturnValue('#fff'),
  getSourceBadge: vi.fn().mockReturnValue('GTM'),
}));

vi.mock('../../../src/panel/datalayer/components/live-inspector', () => ({
  renderLiveInspector: vi.fn(),
}));

vi.mock('../../../src/panel/utils/format', () => ({
  formatTimestamp: vi.fn().mockReturnValue('12:00'),
}));

import {
  categorizeData,
  renderCategoryCard,
  renderInlineTree,
} from '../../../src/panel/datalayer/components/push-detail';

import {
  createTreeNode,
  isTreeExpandable,
  formatTreeValue,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from '../../../src/panel/datalayer/utils/tree-renderer';

// ─── categorizeData tests ─────────────────────────────────────────────────

describe('categorizeData', () => {
  it('assigns event keys to Event category', () => {
    const result = categorizeData({ event: 'purchase', eventCategory: 'ecommerce' });
    const eventCat = result.find((c) => c.label === 'Event');
    expect(eventCat).toBeDefined();
    expect(eventCat!.entries).toHaveLength(2);
    expect(eventCat!.entries.map((e) => e[0])).toContain('event');
    expect(eventCat!.entries.map((e) => e[0])).toContain('eventCategory');
  });

  it('assigns user keys to User category', () => {
    const result = categorizeData({ user_id: '123', client_id: 'abc' });
    const userCat = result.find((c) => c.label === 'User');
    expect(userCat).toBeDefined();
    expect(userCat!.entries).toHaveLength(2);
  });

  it('assigns page keys to Page category', () => {
    const result = categorizeData({ page_title: 'Home', page_location: '/home' });
    const pageCat = result.find((c) => c.label === 'Page');
    expect(pageCat).toBeDefined();
    expect(pageCat!.entries).toHaveLength(2);
  });

  it('assigns ecommerce keys to E-Commerce category', () => {
    const result = categorizeData({ ecommerce: {}, value: 99.99, currency: 'CZK' });
    const ecCat = result.find((c) => c.label === 'E-Commerce');
    expect(ecCat).toBeDefined();
    expect(ecCat!.entries).toHaveLength(3);
  });

  it('assigns unknown keys to Other category', () => {
    const result = categorizeData({ custom_param: 'test', gtm_custom_id: 'abc' });
    const otherCat = result.find((c) => c.label === 'Other');
    expect(otherCat).toBeDefined();
    expect(otherCat!.entries).toHaveLength(2);
  });

  it('correctly splits mixed keys across categories', () => {
    const result = categorizeData({
      event: 'click',
      user_id: '123',
      page_title: 'Home',
      ecommerce: {},
      custom_key: 'value',
    });

    expect(result.find((c) => c.label === 'Event')!.entries).toHaveLength(1);
    expect(result.find((c) => c.label === 'User')!.entries).toHaveLength(1);
    expect(result.find((c) => c.label === 'Page')!.entries).toHaveLength(1);
    expect(result.find((c) => c.label === 'E-Commerce')!.entries).toHaveLength(1);
    expect(result.find((c) => c.label === 'Other')!.entries).toHaveLength(1);
  });

  it('returns all categories even with empty data', () => {
    const result = categorizeData({});
    expect(result).toHaveLength(5); // Event, User, Page, E-Commerce, Other
    for (const cat of result) {
      expect(cat.entries).toHaveLength(0);
    }
  });
});

// ─── renderCategoryCard tests ────────────────────────────────────────────

describe('renderCategoryCard', () => {
  const emptyErrorMap = new Map<string, string>();

  it('renders a dl-category-card with correct data-category', () => {
    const card = renderCategoryCard('Event', [['event', 'click']], emptyErrorMap, {});
    expect(card).not.toBeNull();
    expect(card!.className).toContain('dl-category-card');
    expect(card!.dataset['category']).toBe('event');
  });

  it('renders header with icon, label, count badge, and toggle', () => {
    const card = renderCategoryCard('E-Commerce', [['value', 99]], emptyErrorMap, {});
    const header = card!.querySelector('.dl-category-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('.dl-category-icon')).not.toBeNull();
    expect(header!.querySelector('.dl-category-label')!.textContent).toBe('E-COMMERCE');
    expect(header!.querySelector('.dl-category-count')!.textContent).toBe('1 keys');
    expect(header!.querySelector('.dl-category-toggle')).not.toBeNull();
  });

  it('toggles collapsed class on header click', () => {
    const card = renderCategoryCard('Event', [['event', 'click']], emptyErrorMap, {});
    const header = card!.querySelector('.dl-category-header') as HTMLElement;
    expect(card!.classList.contains('collapsed')).toBe(false);
    header.click();
    expect(card!.classList.contains('collapsed')).toBe(true);
    header.click();
    expect(card!.classList.contains('collapsed')).toBe(false);
  });

  it('renders key-value rows for simple values in body', () => {
    const card = renderCategoryCard('Event', [['event', 'purchase']], emptyErrorMap, {});
    const body = card!.querySelector('.dl-category-body');
    expect(body!.querySelectorAll('.dl-kv-row')).toHaveLength(1);
  });

  it('returns null for empty entries', () => {
    const card = renderCategoryCard('Event', [], emptyErrorMap, {});
    expect(card).toBeNull();
  });

  it('renders inline tree for nested object values', () => {
    const card = renderCategoryCard('Other', [['nested', { a: 1, b: 2 }]], emptyErrorMap, {});
    const body = card!.querySelector('.dl-category-body');
    const treeNode = body!.querySelector('.dl-tree-node');
    expect(treeNode).not.toBeNull();
  });

  it('applies correct category color as CSS variable', () => {
    const card = renderCategoryCard('Event', [['event', 'click']], emptyErrorMap, {});
    const header = card!.querySelector('.dl-category-header') as HTMLElement;
    expect(header.style.getPropertyValue('--card-color')).toBe(CATEGORY_COLORS['event']);
  });
});

// ─── renderInlineTree tests ──────────────────────────────────────────────

describe('renderInlineTree', () => {
  it('renders a collapsible .dl-tree-node for objects', () => {
    const node = renderInlineTree('data', { key1: 'val1', key2: 'val2' });
    expect(node.classList.contains('dl-tree-node')).toBe(true);
    // Should be expanded by default (startExpanded: true)
    expect(node.classList.contains('expanded')).toBe(true);
  });

  it('shows correct key count in bracket notation', () => {
    const node = renderInlineTree('data', { a: 1, b: 2, c: 3 });
    const bracket = node.querySelector('.dl-tree-value-bracket');
    expect(bracket).not.toBeNull();
    expect(bracket!.textContent).toBe('{3}');
  });

  it('shows correct array count in bracket notation', () => {
    const node = renderInlineTree('items', [1, 2, 3]);
    const bracket = node.querySelector('.dl-tree-value-bracket');
    expect(bracket).not.toBeNull();
    expect(bracket!.textContent).toBe('[3]');
  });

  it('starts expanded by default', () => {
    const node = renderInlineTree('data', { a: 1 });
    expect(node.classList.contains('expanded')).toBe(true);
    const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
    expect(toggle).not.toBeNull();
    expect(toggle.classList.contains('expanded')).toBe(true);
  });

  it('collapses on toggle click (starts expanded)', () => {
    const node = renderInlineTree('data', { a: 1 });
    const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
    toggle.click();
    expect(node.classList.contains('expanded')).toBe(false);
    expect(toggle.classList.contains('expanded')).toBe(false);
  });

  it('renders children with correct keys', () => {
    const node = renderInlineTree('data', { name: 'test', count: 5 });
    const children = node.querySelectorAll(':scope > .dl-tree-children > .dl-tree-node');
    expect(children.length).toBe(2);
  });
});

// ─── tree-renderer shared tests ──────────────────────────────────────────

describe('tree-renderer utilities', () => {
  describe('isTreeExpandable', () => {
    it('returns true for objects', () => {
      expect(isTreeExpandable({ a: 1 })).toBe(true);
    });
    it('returns true for arrays', () => {
      expect(isTreeExpandable([1, 2])).toBe(true);
    });
    it('returns false for null', () => {
      expect(isTreeExpandable(null)).toBe(false);
    });
    it('returns false for strings', () => {
      expect(isTreeExpandable('hello')).toBe(false);
    });
    it('returns false for numbers', () => {
      expect(isTreeExpandable(42)).toBe(false);
    });
  });

  describe('formatTreeValue', () => {
    it('formats null', () => expect(formatTreeValue(null)).toBe('null'));
    it('formats undefined', () => expect(formatTreeValue(undefined)).toBe('undefined'));
    it('formats strings with quotes', () => expect(formatTreeValue('hello')).toBe('"hello"'));
    it('formats numbers', () => expect(formatTreeValue(42)).toBe('42'));
    it('formats booleans', () => expect(formatTreeValue(true)).toBe('true'));
    it('formats arrays', () => expect(formatTreeValue([1, 2])).toBe('Array(2)'));
    it('formats objects', () => expect(formatTreeValue({ a: 1, b: 2 })).toBe('{2 keys}'));
  });

  describe('CATEGORY_ICONS', () => {
    it('has icons for all 5 categories', () => {
      expect(Object.keys(CATEGORY_ICONS)).toHaveLength(5);
      expect(CATEGORY_ICONS['event']).toContain('<svg');
      expect(CATEGORY_ICONS['user']).toContain('<svg');
      expect(CATEGORY_ICONS['page']).toContain('<svg');
      expect(CATEGORY_ICONS['ecommerce']).toContain('<svg');
      expect(CATEGORY_ICONS['other']).toContain('<svg');
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('has colors for all 5 categories', () => {
      expect(Object.keys(CATEGORY_COLORS)).toHaveLength(5);
      expect(CATEGORY_COLORS['event']).toBe('var(--accent)');
      expect(CATEGORY_COLORS['ecommerce']).toBe('#48bb78');
    });
  });
});

// ─── renderInlineTree — clipboard ─────────────────────────────────────────

describe('renderInlineTree — clipboard', () => {
  it('copies value to clipboard on click', async () => {
    const node = renderInlineTree('data', { a: 'hello' });
    // Expand the node to reveal children
    const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
    toggle.click();
    const valEl = node.querySelector('.dl-tree-children .dl-tree-value') as HTMLElement;
    expect(valEl).not.toBeNull();
    valEl.click();
    const { copyToClipboard } = await import('../../../src/panel/utils/clipboard');
    await vi.waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('hello');
    });
  });
});

// ─── renderInlineTree — watch integration ──────────────────────────────────

describe('renderInlineTree — watch integration', () => {
  it('adds contextmenu handler and calls addWatchedPath on right-click', async () => {
    const node = renderInlineTree('data', { a: 1 });
    // Expand to reveal children
    const toggle = node.querySelector('.dl-tree-toggle') as HTMLElement;
    toggle.click();
    const keyEl = node.querySelector('.dl-tree-children .dl-tree-key') as HTMLElement;
    expect(keyEl).not.toBeNull();
    expect(keyEl.classList.contains('dl-tree-key-watch')).toBe(true);
    keyEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const { addWatchedPath } = await import('../../../src/panel/datalayer/state');
    expect(addWatchedPath).toHaveBeenCalledWith('data.a');
  });
});

// ─── createTreeNode — enableWatch: false ───────────────────────────────────

describe('createTreeNode — enableWatch: false', () => {
  it('does not attach contextmenu handler when watch disabled', () => {
    const node = createTreeNode(
      { key: 'test', value: { a: 1 }, depth: 0, path: 'test', changeType: undefined, isLeaf: false, childCount: 1 },
      { enableWatch: false, enableHighlights: false, startExpanded: false }
    );
    const keyEl = node.querySelector('.dl-tree-key') as HTMLElement;
    expect(keyEl.classList.contains('dl-tree-key-watch')).toBe(false);
  });
});

// ─── createTreeNode — enableHighlights: false ──────────────────────────────

describe('createTreeNode — enableHighlights: false', () => {
  it('does not apply change CSS classes when highlights disabled', () => {
    const changedPaths = new Map<string, 'added' | 'changed' | 'removed' | undefined>();
    changedPaths.set('test', 'added');
    const node = createTreeNode(
      { key: 'test', value: 42, depth: 0, path: 'test', changeType: 'added', isLeaf: true, childCount: 0 },
      { enableWatch: false, enableHighlights: false, startExpanded: false },
      changedPaths
    );
    const keyEl = node.querySelector('.dl-tree-key') as HTMLElement;
    expect(keyEl.classList.contains('dl-tree-key-added')).toBe(false);
  });
});

// ─── renderInlineTree — deep nesting ──────────────────────────────────────

describe('renderInlineTree — deep nesting', () => {
  it('renders 3+ levels of nesting correctly', () => {
    const deep = { level1: { level2: { level3: 'deep_value' } } };
    const node = renderInlineTree('root', deep);
    // Expand all levels progressively
    const expandAll = (el: HTMLElement) => {
      const toggles = el.querySelectorAll('.dl-tree-toggle');
      toggles.forEach((t) => (t as HTMLElement).click());
    };
    // First expansion shows level1 children
    expandAll(node);
    // Second expansion shows level2 children
    expandAll(node);
    // Third expansion shows level3 value
    expandAll(node);
    const allValues = node.querySelectorAll('.dl-tree-value');
    const texts = Array.from(allValues).map((v) => v.textContent);
    expect(texts).toContain('"deep_value"');
  });
});
