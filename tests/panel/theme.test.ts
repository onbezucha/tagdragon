// ─── THEME TESTS ────────────────────────────────────────────────────────────────
// Unit tests for the panel theme management module

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// @vitest-environment jsdom

// ─── MOCKS ─────────────────────────────────────────────────────────────────────

const mockStorageLocal = {
  get: vi.fn(() => Promise.resolve({})),
  set: vi.fn(() => Promise.resolve()),
};

vi.stubGlobal('chrome', {
  storage: { local: mockStorageLocal },
});

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

// ─── TEST SETUP ───────────────────────────────────────────────────────────────

/**
 * Setup DOM elements required by theme module.
 * Creates: theme-dark, theme-light, btn-theme-toggle buttons
 */
function setupThemeButtons(): void {
  // Create theme toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'btn-theme-toggle';
  document.body.appendChild(toggleBtn);

  // Create theme selection buttons
  const darkBtn = document.createElement('button');
  darkBtn.id = 'theme-dark';
  document.body.appendChild(darkBtn);

  const lightBtn = document.createElement('button');
  lightBtn.id = 'theme-light';
  document.body.appendChild(lightBtn);
}

/**
 * Cleanup DOM and reset module state between tests.
 * Uses vi.resetModules() to fully reset the theme module state.
 */
async function cleanup(): Promise<void> {
  // Remove all theme-related elements
  document.getElementById('btn-theme-toggle')?.remove();
  document.getElementById('theme-dark')?.remove();
  document.getElementById('theme-light')?.remove();

  // Remove any data-theme attributes
  document.documentElement.removeAttribute('data-theme');
  document.body.classList.remove('no-transition');

  // Clear mock call history
  mockStorageLocal.get.mockClear();
  mockStorageLocal.set.mockClear();

  // Reset the module to clear module-level state
  await vi.resetModules();
}

// ─── TESTS ─────────────────────────────────────────────────────────────────────

describe('initTheme / applyTheme', () => {
  beforeEach(() => {
    // Setup DOM elements
    setupThemeButtons();
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── Default dark theme ─────────────────────────────────────────────────────

  it('loads dark theme from storage (default)', async () => {
    // Mock empty storage (no saved theme)
    mockStorageLocal.get.mockResolvedValueOnce({});

    // Import and init
    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Dark theme = no data-theme attribute
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  // ── Light theme from storage ──────────────────────────────────────────────

  it('loads light theme from storage', async () => {
    // Mock light theme in storage
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'light' });

    // Import and init
    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Light theme = data-theme="light" attribute
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // ── Light theme attribute ─────────────────────────────────────────────────

  it('sets data-theme="light" on documentElement for light', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'light' });

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Verify attribute is set
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // ── Dark theme attribute ──────────────────────────────────────────────────

  it('removes data-theme for dark', async () => {
    // First, set light theme
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'light' });
    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Reset modules to test dark button
    await vi.resetModules();
    mockStorageLocal.set.mockClear();

    // Re-setup DOM
    setupThemeButtons();

    // Mock dark theme
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'dark' });

    // Import fresh and init
    const { initTheme: initTheme2 } = await import('@/panel/theme');
    await initTheme2();

    // Dark theme should not have the attribute
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  // ── No-transition class ───────────────────────────────────────────────────

  it('adds no-transition class when animate=false', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // After initTheme (animate=false), no-transition should be removed
    // (removed after double requestAnimationFrame)
    expect(document.body.classList.contains('no-transition')).toBe(false);
  });

  // ── Toggle via button click ───────────────────────────────────────────────

  it('toggles between dark and light (via btn-theme-toggle click)', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Initially dark (no attribute)
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    // Click the toggle button
    const toggleBtn = document.getElementById('btn-theme-toggle')!;
    toggleBtn.click();

    // Now should be light (has attribute)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click again to toggle back to dark
    toggleBtn.click();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  // ── Active class on theme buttons ────────────────────────────────────────

  it('updates active class on theme buttons', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'light' });

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    const darkBtn = document.getElementById('theme-dark')!;
    const lightBtn = document.getElementById('theme-light')!;

    // Light theme → dark button inactive, light button active
    expect(darkBtn.classList.contains('active')).toBe(false);
    expect(lightBtn.classList.contains('active')).toBe(true);

    // Reset for dark theme test
    await vi.resetModules();
    setupThemeButtons();
    mockStorageLocal.get.mockClear();

    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'dark' });
    const { initTheme: initDark } = await import('@/panel/theme');
    await initDark();

    const darkBtn2 = document.getElementById('theme-dark')!;
    const lightBtn2 = document.getElementById('theme-light')!;

    // Dark theme → dark button active, light button inactive
    expect(darkBtn2.classList.contains('active')).toBe(true);
    expect(lightBtn2.classList.contains('active')).toBe(false);
  });

  // ── Direct theme button clicks ───────────────────────────────────────────

  it('handles direct theme-dark and theme-light button clicks', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Start with dark (no attribute)
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    // Click light button directly
    const lightBtn = document.getElementById('theme-light')!;
    lightBtn.click();

    // Should be light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click dark button directly
    const darkBtn = document.getElementById('theme-dark')!;
    darkBtn.click();

    // Should be dark again
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

// ─── STORAGE BEHAVIOR ──────────────────────────────────────────────────────────

describe('Storage', () => {
  beforeEach(() => {
    setupThemeButtons();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('saves theme to chrome.storage.local on toggle', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});
    mockStorageLocal.set.mockResolvedValueOnce(undefined);

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Toggle to light
    const toggleBtn = document.getElementById('btn-theme-toggle')!;
    toggleBtn.click();

    // Should have called storage.set
    expect(mockStorageLocal.set).toHaveBeenCalledWith({ rt_theme: 'light' });
  });

  it('loads theme from chrome.storage.local on init', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'light' });

    const { initTheme } = await import('@/panel/theme');
    await initTheme();

    // Should have called storage.get
    expect(mockStorageLocal.get).toHaveBeenCalledWith('rt_theme');
  });
});