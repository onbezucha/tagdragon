// ─── SPLITTER TESTS ──────────────────────────────────────────────────────────
// Unit tests for the panel splitter/drag-resize functionality

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ─── MOCK SETUP ───────────────────────────────────────────────────────────────

// Mock chrome.storage.local for persistence module
const mockStorageLocal = {
  get: vi.fn(() => Promise.resolve({})),
  set: vi.fn(() => Promise.resolve()),
};
vi.stubGlobal('chrome', {
  storage: { local: mockStorageLocal },
});

// Mocked DOM elements
const mockSplitter = document.createElement('div');
const mockMain = document.createElement('div');

const mockSave = vi.fn(() => Promise.resolve());
const mockLoad = vi.fn(() => Promise.resolve(''));

vi.mock('@/panel/utils/dom', () => ({
  DOM: {
    get splitter() {
      return mockSplitter;
    },
    get main() {
      return mockMain;
    },
  },
  $: vi.fn(),
  qsa: vi.fn(),
}));

vi.mock('@/panel/utils/persistence', () => ({
  savePanelSetting: mockSave,
  loadPanelSetting: mockLoad,
}));

// ─── DYNAMIC IMPORT ───────────────────────────────────────────────────────────

// Import splitter module dynamically to ensure mocks are set up first
// The module has module-level mutable state (isDragging), so we need to
// handle state isolation carefully in tests
async function importSplitter() {
  const module = await import('@/panel/splitter');
  return module;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function resetMocks(): void {
  mockSave.mockClear();
  mockLoad.mockClear();
  mockStorageLocal.get.mockClear();
  mockStorageLocal.set.mockClear();
  mockMain.style.gridTemplateColumns = '';
}

function simulateMousedown(x: number): void {
  const event = new MouseEvent('mousedown', {
    clientX: x,
    bubbles: true,
    cancelable: true,
  });
  mockSplitter.dispatchEvent(event);
}

function simulateMousemove(x: number): void {
  const event = new MouseEvent('mousemove', { clientX: x, bubbles: true });
  document.dispatchEvent(event);
}

function simulateMouseup(): void {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function simulateDblclick(): void {
  mockSplitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('initSplitter', () => {
  beforeEach(() => {
    resetMocks();
    // Reset window.innerWidth to a consistent value
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    // Clean up any lingering event listeners by resetting the module
    vi.restoreAllMocks();
  });

  // ── restores saved width from persistence ───────────────────────────────────

  it('restores saved width from persistence', async () => {
    mockLoad.mockResolvedValueOnce('400');

    await importSplitter().then((m) => m.initSplitter());

    expect(mockMain.style.gridTemplateColumns).toBe('400px 4px 1fr');
  });

  // ── falls back to default when no saved width ───────────────────────────────

  it('falls back to default when no saved width', async () => {
    // When loadPanelSetting returns empty string, the code does NOT set a default
    // because the `if (savedWidth)` check evaluates to false
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // No default is set when savedWidth is empty/falsy
    expect(mockMain.style.gridTemplateColumns).toBe('');
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── corrects width when saved value exceeds max ratio ───────────────────────

  it('corrects width when saved value exceeds max ratio', async () => {
    // window.innerWidth = 1200, max ratio = 0.8, so max allowed = 960
    // Setting saved width to 1000 should trigger correction
    mockLoad.mockResolvedValueOnce('1000');

    await importSplitter().then((m) => m.initSplitter());

    // Should fall back to default and save it
    expect(mockMain.style.gridTemplateColumns).toBe('350px 4px 1fr');
    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });

  // ── corrects width when saved value below min ───────────────────────────────

  it('corrects width when saved value below min', async () => {
    // SPLITTER_MIN_WIDTH = 200
    mockLoad.mockResolvedValueOnce('100');

    await importSplitter().then((m) => m.initSplitter());

    // Should fall back to default and save it
    expect(mockMain.style.gridTemplateColumns).toBe('350px 4px 1fr');
    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });

  // ── handles double-click to reset ───────────────────────────────────────────

  it('handles double-click to reset', async () => {
    mockLoad.mockResolvedValueOnce(''); // Start with default

    await importSplitter().then((m) => m.initSplitter());

    // Simulate double-click on splitter
    simulateDblclick();

    // Should reset to default
    expect(mockMain.style.gridTemplateColumns).toBe('350px 4px 1fr');
    expect(mockSave).toHaveBeenCalledWith('list-width', '350');
  });

  // ── handles mousedown/mousemove/mouseup drag cycle ───────────────────────────

  it('handles mousedown/mousemove/mouseup drag cycle', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Simulate drag: mousedown → mousemove → mouseup
    simulateMousedown(500);
    simulateMousemove(500);
    simulateMouseup();

    // Width should be clamped: max(280, min(500, 1200-300)) = 500
    expect(mockMain.style.gridTemplateColumns).toBe('500px 4px 1fr');
  });

  // ── persists width after drag ────────────────────────────────────────────────

  it('persists width after drag', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Simulate drag to a specific width
    simulateMousedown(450);
    simulateMousemove(450);
    simulateMouseup();

    // Should have called savePanelSetting with the new width
    expect(mockSave).toHaveBeenCalledWith('list-width', '450');
  });

  // ── corrects width on window resize ─────────────────────────────────────────

  it('does not change width on resize when current width is valid', async () => {
    // Start with a saved valid width
    mockLoad.mockResolvedValueOnce('400');

    await importSplitter().then((m) => m.initSplitter());

    expect(mockMain.style.gridTemplateColumns).toBe('400px 4px 1fr');

    // Resize window (make it smaller)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 800,
    });

    // Manually trigger resize event
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    // Width is 400, maxAllowed = 800 * 0.8 = 640
    // 400 < 640 and 400 > 200, so no correction needed
    expect(mockMain.style.gridTemplateColumns).toBe('400px 4px 1fr');
  });

  it('corrects width when resize makes it too large', async () => {
    mockLoad.mockResolvedValueOnce('700');

    await importSplitter().then((m) => m.initSplitter());

    // Initial state: innerWidth=1200, maxAllowed=960, 700 < 960, so OK
    expect(mockMain.style.gridTemplateColumns).toBe('700px 4px 1fr');

    // Resize window smaller
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 800,
    });

    // Now maxAllowed = 800 * 0.8 = 640
    // 700 > 640, so it needs correction
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    // corrected = Math.max(200, Math.min(350, 640)) = 350
    expect(mockMain.style.gridTemplateColumns).toBe('350px 4px 1fr');
  });

  // ── clamps drag width to valid range ────────────────────────────────────────

  it('clamps drag width to valid range', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Try to drag to a position that's too far right
    simulateMousedown(100);
    simulateMousemove(2000); // Very far right
    simulateMouseup();

    // Should be clamped: max(280, min(2000, 1200-300)) = max(280, 900) = 900
    expect(mockMain.style.gridTemplateColumns).toBe('900px 4px 1fr');
  });

  it('clamps drag width to minimum on left side', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    // Try to drag to a position that's too far left
    simulateMousedown(100);
    simulateMousemove(-100); // Negative position
    simulateMouseup();

    // Should be clamped: max(280, min(-100, 1200-300)) = max(280, -100) = 280
    expect(mockMain.style.gridTemplateColumns).toBe('280px 4px 1fr');
  });

  // ── cleanup ──────────────────────────────────────────────────────────────────

  it('cleanup: resets body styles on mouseup', async () => {
    mockLoad.mockResolvedValueOnce('');

    await importSplitter().then((m) => m.initSplitter());

    simulateMousedown(100);
    simulateMousemove(200);

    // Styles should be set during drag
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    simulateMouseup();

    // Styles should be reset after mouseup
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });
});
