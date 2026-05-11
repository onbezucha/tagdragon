// ═══════════════════════════════════════════════════════════════════════════════
// Persistence Utils Tests
// Unit tests for chrome.storage.local with localStorage fallback
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @vitest-environment jsdom
 * jsdom is required for localStorage support in node environment.
 * Without it, localStorage calls would throw ReferenceError.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savePanelSetting, loadPanelSetting } from '@/panel/utils/persistence';

describe('savePanelSetting', () => {
  let mockStorageLocal: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStorageLocal = {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    };
    vi.stubGlobal('chrome', {
      storage: { local: mockStorageLocal },
    });
    localStorage.clear();
  });

  it('calls chrome.storage.local.set with rt_ prefixed key', async () => {
    await savePanelSetting('theme', 'dark');

    expect(mockStorageLocal.set).toHaveBeenCalledWith({ rt_theme: 'dark' });
    expect(mockStorageLocal.set).toHaveBeenCalledTimes(1);
  });

  it('does not touch localStorage when chrome.storage succeeds', async () => {
    const localStorageSpy = vi.spyOn(localStorage, 'setItem');

    await savePanelSetting('theme', 'dark');

    expect(localStorageSpy).not.toHaveBeenCalled();
  });

  it('falls back to localStorage when chrome.storage throws', async () => {
    mockStorageLocal.set.mockRejectedValueOnce(new Error('Storage unavailable'));

    await savePanelSetting('theme', 'dark');

    expect(localStorage.getItem('rt_theme')).toBe('dark');
    expect(mockStorageLocal.set).toHaveBeenCalled();
  });

  it('silently catches localStorage errors', async () => {
    mockStorageLocal.set.mockRejectedValueOnce(new Error('Storage unavailable'));

    // Mock localStorage.setItem to throw
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('localStorage not available');
    });

    // Should not throw
    await expect(savePanelSetting('theme', 'dark')).resolves.not.toThrow();
  });

  it('prefers chrome.storage over localStorage', async () => {
    // Set a value in localStorage first
    localStorage.setItem('rt_theme', 'light');

    await savePanelSetting('theme', 'dark');

    // chrome.storage should be called, localStorage should be unchanged
    expect(mockStorageLocal.set).toHaveBeenCalledWith({ rt_theme: 'dark' });
    expect(localStorage.getItem('rt_theme')).toBe('light');
  });
});

describe('loadPanelSetting', () => {
  let mockStorageLocal: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStorageLocal = {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    };
    vi.stubGlobal('chrome', {
      storage: { local: mockStorageLocal },
    });
    localStorage.clear();
  });

  it('returns stored value from chrome.storage.local', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'dark' });

    const result = await loadPanelSetting('theme');

    expect(result).toBe('dark');
    expect(mockStorageLocal.get).toHaveBeenCalledWith('rt_theme');
  });

  it('returns empty string fallback by default when key not found', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});

    const result = await loadPanelSetting('nonexistent');

    expect(result).toBe('');
  });

  it('returns provided fallback when key not found', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({});

    const result = await loadPanelSetting('nonexistent', 'default-value');

    expect(result).toBe('default-value');
  });

  it('falls back to localStorage when chrome.storage throws', async () => {
    mockStorageLocal.get.mockRejectedValueOnce(new Error('Storage unavailable'));
    localStorage.setItem('rt_theme', 'dark');

    const result = await loadPanelSetting('theme');

    expect(result).toBe('dark');
  });

  it('returns fallback when neither storage has the key', async () => {
    mockStorageLocal.get.mockRejectedValueOnce(new Error('Storage unavailable'));

    const result = await loadPanelSetting('nonexistent', 'fallback');

    expect(result).toBe('fallback');
  });

  it('correctly prefixes key with rt_', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_maxRequests: '500' });

    const result = await loadPanelSetting('maxRequests');

    expect(result).toBe('500');
    expect(mockStorageLocal.get).toHaveBeenCalledWith('rt_maxRequests');
  });

  it('returns chrome.storage value even if localStorage has a different value', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'chrome-value' });
    localStorage.setItem('rt_theme', 'local-value');

    const result = await loadPanelSetting('theme');

    expect(result).toBe('chrome-value');
  });

  it('does not call localStorage when chrome.storage returns value', async () => {
    mockStorageLocal.get.mockResolvedValueOnce({ rt_theme: 'dark' });
    localStorage.setItem('rt_theme', 'local-value');

    const localStorageSpy = vi.spyOn(localStorage, 'getItem');
    await loadPanelSetting('theme');

    expect(localStorageSpy).not.toHaveBeenCalled();
  });
});