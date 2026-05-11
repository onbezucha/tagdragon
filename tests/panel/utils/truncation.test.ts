// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { setupTruncationTooltips } from '@//panel/utils/truncation';

describe('setupTruncationTooltips', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds data-tooltip to truncated elements (scrollWidth > clientWidth)', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="param-value">Some long text</span>';
    document.body.appendChild(container);

    const el = container.querySelector('.param-value') as HTMLElement;
    Object.defineProperty(el, 'scrollWidth', { value: 200, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });

    setupTruncationTooltips(container);

    expect(el.getAttribute('data-tooltip')).toBe('Some long text');
    expect(el.style.cursor).toBe('help');
  });

  it('removes data-tooltip from non-truncated elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="param-value" data-tooltip="old">Short text</span>';
    document.body.appendChild(container);

    const el = container.querySelector('.param-value') as HTMLElement;
    Object.defineProperty(el, 'scrollWidth', { value: 100, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });

    setupTruncationTooltips(container);

    expect(el.hasAttribute('data-tooltip')).toBe(false);
  });

  it('sets cursor to \'help\' for truncated elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="param-value">Truncated content</span>';
    document.body.appendChild(container);

    const el = container.querySelector('.param-value') as HTMLElement;
    Object.defineProperty(el, 'scrollWidth', { value: 150, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 50, configurable: true });

    setupTruncationTooltips(container);

    expect(el.style.cursor).toBe('help');
  });

  it('clears cursor for non-truncated elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="param-value" style="cursor: help">Short text</span>';
    document.body.appendChild(container);

    const el = container.querySelector('.param-value') as HTMLElement;
    Object.defineProperty(el, 'scrollWidth', { value: 80, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });

    setupTruncationTooltips(container);

    expect(el.style.cursor).toBe('');
  });

  it('handles empty container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    expect(() => setupTruncationTooltips(container)).not.toThrow();
  });
});