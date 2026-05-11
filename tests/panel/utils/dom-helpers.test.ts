// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import only the functions we need — NOT the DOM object (lazy getters cause side effects)
import { $, qsa, flashCopyFeedback } from '@/panel/utils/dom';
import { CHECK_SVG, COPY_FLASH_MS } from '@/shared/constants';

describe('$', () => {
  it('returns element by ID', () => {
    const el = document.createElement('div');
    el.id = 'test-element';
    document.body.appendChild(el);

    const result = $('test-element');

    expect(result).toBe(el);
    expect(result?.id).toBe('test-element');
  });

  it('returns null for missing element', () => {
    const result = $('non-existent-id');

    expect(result).toBeNull();
  });

  it('returns typed element with generic parameter', () => {
    const input = document.createElement('input');
    input.id = 'typed-input';
    document.body.appendChild(input);

    const result = $<HTMLInputElement>('typed-input');

    expect(result).toBe(input);
    // Verify it's typed as HTMLInputElement (can access value property)
    expect(result?.value).toBe('');
  });
});

describe('qsa', () => {
  it('returns array of matching elements', () => {
    document.body.innerHTML = `
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
    `;

    const result = qsa('.item');

    expect(result).toHaveLength(3);
    expect(result[0].textContent).toBe('1');
    expect(result[1].textContent).toBe('2');
    expect(result[2].textContent).toBe('3');
  });

  it('returns empty array for no matches', () => {
    document.body.innerHTML = '<div class="other">content</div>';

    const result = qsa('.nonexistent');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('searches within parent element when provided', () => {
    document.body.innerHTML = `
      <div id="parent1">
        <span class="target">A</span>
        <span class="target">B</span>
      </div>
      <div id="parent2">
        <span class="target">C</span>
      </div>
    `;

    const parent1 = document.getElementById('parent1')!;
    const result = qsa<HTMLElement>('.target', parent1);

    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('A');
    expect(result[1].textContent).toBe('B');
  });

  it('returns empty array when parent has no matches', () => {
    document.body.innerHTML = '<div id="empty-parent"><span class="other">X</span></div>';

    const parent = document.getElementById('empty-parent')!;
    const result = qsa('.target', parent);

    expect(result).toHaveLength(0);
  });
});

describe('flashCopyFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('replaces innerHTML with CHECK_SVG', () => {
    const el = document.createElement('div');
    el.innerHTML = '<svg class="copy-icon">original</svg>';
    document.body.appendChild(el);

    flashCopyFeedback(el);

    // jsdom normalizes SVG serialization (self-closing → explicit closing),
    // so compare the path's d attribute instead
    expect(el.querySelector('path')?.getAttribute('d')).toBe('M3 7.5L5.5 10L11 4');
  });

  it('adds copied class', () => {
    const el = document.createElement('div');
    el.innerHTML = '<svg class="copy-icon">icon</svg>';
    document.body.appendChild(el);

    flashCopyFeedback(el);

    expect(el.classList.contains('copied')).toBe(true);
  });

  it('restores original SVG after COPY_FLASH_MS', () => {
    const el = document.createElement('div');
    const originalSvg = '<svg class="copy-icon">original content</svg>';
    el.innerHTML = originalSvg;
    document.body.appendChild(el);

    flashCopyFeedback(el);

    // Before timeout — should show check SVG path
    expect(el.querySelector('path')?.getAttribute('d')).toBe('M3 7.5L5.5 10L11 4');

    // Advance past timeout
    vi.advanceTimersByTime(COPY_FLASH_MS);

    // Restore original SVG (jsdom normalizes self-closing tags)
    expect(el.querySelector('.copy-icon')).not.toBeNull();
  });

  it('removes copied class after timeout', () => {
    const el = document.createElement('div');
    el.innerHTML = '<svg class="copy-icon">icon</svg>';
    el.classList.add('some-other-class');
    document.body.appendChild(el);

    flashCopyFeedback(el);

    // Before timeout — should have copied class
    expect(el.classList.contains('copied')).toBe(true);

    // Advance past timeout
    vi.advanceTimersByTime(COPY_FLASH_MS);

    expect(el.classList.contains('copied')).toBe(false);
    // Other classes should remain
    expect(el.classList.contains('some-other-class')).toBe(true);
  });

  it('handles element without SVG gracefully', () => {
    const el = document.createElement('div');
    el.innerHTML = 'no svg here';
    document.body.appendChild(el);

    // Should not throw
    flashCopyFeedback(el);

    // CHECK_SVG is injected
    expect(el.querySelector('path')?.getAttribute('d')).toBe('M3 7.5L5.5 10L11 4');

    vi.advanceTimersByTime(COPY_FLASH_MS);

    // Restores to empty string since no SVG was found
    expect(el.children.length).toBe(0);
    expect(el.innerHTML).toBe('');
  });
});