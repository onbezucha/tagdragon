// ═══════════════════════════════════════════════════════════════════════════════
// Clipboard Utils Tests
// Unit tests for copyToClipboard and showCopyFeedback
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @vitest-environment jsdom
 * jsdom is required for DOM manipulation (document.createElement, etc.)
 * and setTimeout handling in node environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, showCopyFeedback } from '@/panel/utils/clipboard';
import { CHECK_SVG, COPY_FLASH_MS } from '@/shared/constants';

// jsdom does not implement document.execCommand, so we polyfill it
const mockExecCommand = vi.fn();

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom doesn't implement execCommand, so add a mock
    Object.defineProperty(document, 'execCommand', {
      value: mockExecCommand,
      writable: true,
      configurable: true,
    });
    mockExecCommand.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns true when navigator.clipboard.writeText succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    const promise = copyToClipboard('hello world');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('falls back to textarea when clipboard API throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    mockExecCommand.mockReturnValue(true);

    const promise = copyToClipboard('fallback text');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('fallback text');
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when both methods fail', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    // Make execCommand throw to trigger the inner catch
    mockExecCommand.mockImplementation(() => {
      throw new Error('execCommand not supported');
    });

    const promise = copyToClipboard('will fail');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result).toBe(false);
  });
});

describe('showCopyFeedback', () => {
  let button: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create a fresh button element for each test
    button = document.createElement('button');
    button.innerHTML = 'Copy';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('adds copied class and sets innerHTML on success', () => {
    showCopyFeedback(button, true);

    expect(button.classList.contains('copied')).toBe(true);
    // jsdom may serialize SVG differently (expands self-closing tags),
    // so check that the button contains the expected text
    expect(button.innerHTML).toContain('Copied!');
    expect(button.innerHTML).toContain('svg');
  });

  it('restores original innerHTML after COPY_FLASH_MS timeout', () => {
    const originalHTML = button.innerHTML;
    showCopyFeedback(button, true);

    vi.advanceTimersByTime(COPY_FLASH_MS);

    expect(button.innerHTML).toBe(originalHTML);
  });

  it('removes copied class after timeout', () => {
    showCopyFeedback(button, true);

    expect(button.classList.contains('copied')).toBe(true);

    vi.advanceTimersByTime(COPY_FLASH_MS);

    expect(button.classList.contains('copied')).toBe(false);
  });

  it('adds copy-fail class on failure', () => {
    showCopyFeedback(button, false);

    expect(button.classList.contains('copy-fail')).toBe(true);
  });

  it('removes copy-fail class after 1500ms', () => {
    showCopyFeedback(button, false);

    expect(button.classList.contains('copy-fail')).toBe(true);

    vi.advanceTimersByTime(1500);

    expect(button.classList.contains('copy-fail')).toBe(false);
  });

  it('updates status-stats text on failure', () => {
    const statusEl = document.createElement('div');
    statusEl.id = 'status-stats';
    statusEl.textContent = 'Ready';
    document.body.appendChild(statusEl);

    showCopyFeedback(button, false);

    expect(statusEl.textContent).toBe('Copy failed — clipboard access denied');

    document.body.removeChild(statusEl);
  });
});