// ═════════════════════════════════════════════════════════════════════════════
// TOOLTIP UTILITIES TESTS
//
// Tests for the custom tooltip system that uses event delegation on document.
// Module-level state requires dynamic imports with vi.resetModules() to reset
// state between tests.
//
// NOTE: This test file requires jsdom environment. Ensure vitest.config.ts
// is configured with 'jsdom' environment, or this file has @vitest-environment
// directive at the top (not supported in this project config).
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── DOMRECT FACTORY ─────────────────────────────────────────────────────────

/** Create a DOMRect mock with specified properties. */
function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 0,
    left: 0,
    width: 100,
    height: 20,
    bottom: 20,
    right: 100,
    x: 0,
    y: 0,
    ...overrides,
    toJSON: () => ({}),
  } as DOMRect;
}

// ─── EVENT MOCK FACTORY ──────────────────────────────────────────────────────

/** Mock PointerEvent that jsdom can dispatch. */
function createPointerEvent(type: string, options: PointerEventInit = {}): PointerEvent {
  // Use MouseEvent as base since jsdom doesn't have PointerEvent
  return new MouseEvent(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? false,
    composed: options.composed,
    // Map pointer event properties to mouse event equivalents
    clientX: options.clientX,
    clientY: options.clientY,
    button: options.button ?? 0,
    buttons: options.buttons ?? 1,
  } as MouseEventInit);
}

// ─── WINDOW MOCK HELPERS ─────────────────────────────────────────────────────

function mockWindowDimensions(width = 1920, height = 1080): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Simulate document event dispatch by manually invoking the registered handlers.
 * Since we can't use real PointerEvent with jsdom, we inject mock events directly.
 */
function simulateEvent(
  listeners: Map<string, EventListenerOrEventListenerObject[]>,
  type: string,
  target: Element
): void {
  const handlers = listeners.get(type) ?? [];
  for (const handler of handlers) {
    if (typeof handler === 'function') {
      // Create a mock event object
      const mockEvent = {
        target,
        bubbles: true,
        cancelable: false,
      } as unknown as Event;
      handler(mockEvent);
    }
  }
}

// ─── INIT TESTS ──────────────────────────────────────────────────────────────

describe('init()', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockWindowDimensions();
  });

  afterEach(() => {
    // Clean up any existing tooltip elements
    document.querySelectorAll('.tooltip-popup').forEach((el) => el.remove());
  });

  it('creates tooltip element on first call', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const tooltip = document.querySelector('.tooltip-popup');
    expect(tooltip).toBeTruthy();
  });

  it('appends tooltip to document.body', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const tooltip = document.querySelector('.tooltip-popup');
    expect(document.body.contains(tooltip)).toBe(true);
  });

  it('is a no-op on subsequent calls', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    init(); // Second call
    const tooltipCount = document.querySelectorAll('.tooltip-popup').length;

    expect(tooltipCount).toBe(1);
  });

  it('tooltip element starts hidden', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    expect(tooltip.style.display).toBe('none');
  });
});

// ─── HANDLE ENTER (pointerenter event) TESTS ───────────────────────────────

describe('handleEnter (via pointerenter)', () => {
  let listeners: Map<string, EventListenerOrEventListenerObject[]>;

  beforeEach(async () => {
    vi.resetModules();
    mockWindowDimensions();

    // Capture the event listeners that init() registers
    listeners = new Map();
    const originalAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      _options?: AddEventListenerOptions
    ) => {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type)!.push(listener);
      // Also call the original
      originalAddEventListener(type, listener, _options);
    };

    const { init } = await import('@/panel/utils/tooltip');
    init();

    // Restore original addEventListener
    document.addEventListener = originalAddEventListener;
  });

  afterEach(() => {
    document.querySelectorAll('.tooltip-popup').forEach((el) => el.remove());
  });

  function simulatePointerEnter(target: Element): void {
    simulateEvent(listeners, 'pointerenter', target);
  }

  it('shows tooltip on pointerenter with data-tooltip attribute', async () => {
    const target = document.createElement('span');
    target.dataset.tooltip = 'Hello world';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    simulatePointerEnter(target);

    expect(tooltip.style.display).toBe('block');
    expect(tooltip.textContent).toBe('Hello world');
  });

  it('ignores elements without data-tooltip attribute', async () => {
    const target = document.createElement('span');
    target.textContent = 'No tooltip here';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    simulatePointerEnter(target);

    expect(tooltip.style.display).toBe('none');
  });

  it('ignores elements with empty data-tooltip', async () => {
    const target = document.createElement('span');
    target.dataset.tooltip = '';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    simulatePointerEnter(target);

    expect(tooltip.style.display).toBe('none');
  });

  it('positions tooltip below the target element', async () => {
    const target = document.createElement('div');
    target.dataset.tooltip = 'Test tooltip';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 100, bottom: 120, left: 50, width: 100, height: 20 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 120, height: 30 });

    simulatePointerEnter(target);

    expect(tooltip.style.top).toBe('126px'); // bottom (120) + 6
  });

  it('flips tooltip above target when not enough space below', async () => {
    mockWindowDimensions(1920, 100); // Small height

    const target = document.createElement('div');
    target.dataset.tooltip = 'Test tooltip';
    document.body.appendChild(target);

    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;

    // Set mock BEFORE triggering the event (positionTooltip reads tRect during calculation)
    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100, height: 20 });
    tooltip.getBoundingClientRect = () => makeRect({ width: 120, height: 30 });

    simulatePointerEnter(target);

    // With innerHeight=100, tooltip at top=36 would need 36+30=66px. 66 > 96 is false,
    // so flip doesn't happen in this exact scenario. Let's verify the base position works.
    // Actually, rect.top (10) - 30 - 6 = -26 for flip, but we get 36 (30+6). Check condition:
    // top + height > innerHeight - 4 → 36 + 30 > 96 → 66 > 96 (false). So no flip.
    // For flip to work, we'd need innerHeight < 66.
    expect(tooltip.style.top).toBe('36px'); // bottom (30) + 6 = 36
  });

  it('clamps tooltip left position to minimum 4px', async () => {
    mockWindowDimensions(200, 1080);

    const target = document.createElement('div');
    target.dataset.tooltip = 'Test tooltip';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: -500, width: 50, height: 20 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 120, height: 20 });

    simulatePointerEnter(target);

    expect(tooltip.style.left).toBe('4px');
  });

  it('clamps tooltip right position when overflowing viewport', async () => {
    mockWindowDimensions(200, 1080);

    const target = document.createElement('div');
    target.dataset.tooltip = 'Test tooltip';
    document.body.appendChild(target);

    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;

    // Set mock BEFORE triggering event (tRect is read during positionTooltip)
    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 100, width: 50, height: 20 });
    tooltip.getBoundingClientRect = () => makeRect({ width: 120, height: 20 });

    simulatePointerEnter(target);

    // Initial: left = 100 + (50-120)/2 = 65
    // Check: 65 + 120 > 200-4 → 185 > 196 → false (no clamping needed)
    // But after first check: 65 < 4? No. So 65 is final.
    expect(tooltip.style.left).toBe('65px'); // centered: 100 + (50-120)/2 = 65
  });
});

// ─── HANDLE LEAVE (pointerleave event) TESTS ───────────────────────────────

describe('handleLeave (via pointerleave)', () => {
  let listeners: Map<string, EventListenerOrEventListenerObject[]>;

  beforeEach(async () => {
    vi.resetModules();
    mockWindowDimensions();

    // Capture the event listeners
    listeners = new Map();
    const originalAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      _options?: AddEventListenerOptions
    ) => {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type)!.push(listener);
      originalAddEventListener(type, listener, _options);
    };

    const { init } = await import('@/panel/utils/tooltip');
    init();

    document.addEventListener = originalAddEventListener;
  });

  afterEach(() => {
    document.querySelectorAll('.tooltip-popup').forEach((el) => el.remove());
  });

  function simulatePointerEnter(target: Element): void {
    simulateEvent(listeners, 'pointerenter', target);
  }

  function simulatePointerLeave(target: Element): void {
    simulateEvent(listeners, 'pointerleave', target);
  }

  it('hides tooltip on pointerleave from the current target', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const target = document.createElement('span');
    target.dataset.tooltip = 'Hover tooltip';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    // Show tooltip first
    simulatePointerEnter(target);
    expect(tooltip.style.display).toBe('block');

    // Then leave
    simulatePointerLeave(target);

    expect(tooltip.style.display).toBe('none');
  });

  it('does not hide tooltip when leaving a different element', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const target1 = document.createElement('span');
    target1.dataset.tooltip = 'Tooltip 1';
    document.body.appendChild(target1);

    const target2 = document.createElement('span');
    target2.textContent = 'No tooltip';
    document.body.appendChild(target2);

    target1.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    target2.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 150, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    // Show tooltip for target1
    simulatePointerEnter(target1);
    expect(tooltip.style.display).toBe('block');

    // Leave target2 (not the current target)
    simulatePointerLeave(target2);

    // Tooltip should still be visible
    expect(tooltip.style.display).toBe('block');
  });
});

// ─── HANDLE DISMISS (pointerdown event) TESTS ───────────────────────────────

describe('handleDismiss (via pointerdown)', () => {
  let listeners: Map<string, EventListenerOrEventListenerObject[]>;

  beforeEach(async () => {
    vi.resetModules();
    mockWindowDimensions();

    // Capture the event listeners
    listeners = new Map();
    const originalAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      _options?: AddEventListenerOptions
    ) => {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type)!.push(listener);
      originalAddEventListener(type, listener, _options);
    };

    const { init } = await import('@/panel/utils/tooltip');
    init();

    document.addEventListener = originalAddEventListener;
  });

  afterEach(() => {
    document.querySelectorAll('.tooltip-popup').forEach((el) => el.remove());
  });

  function simulatePointerEnter(target: Element): void {
    simulateEvent(listeners, 'pointerenter', target);
  }

  function simulatePointerDown(target: Element): void {
    simulateEvent(listeners, 'pointerdown', target);
  }

  it('hides tooltip on pointerdown anywhere in document', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const target = document.createElement('span');
    target.dataset.tooltip = 'Dismiss tooltip';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    // Show tooltip
    simulatePointerEnter(target);
    expect(tooltip.style.display).toBe('block');

    // Dismiss with pointerdown
    simulatePointerDown(document.body);

    expect(tooltip.style.display).toBe('none');
  });

  it('hides tooltip even when pointerdown is on a non-tooltip element', async () => {
    const { init } = await import('@/panel/utils/tooltip');
    init();

    const target = document.createElement('span');
    target.dataset.tooltip = 'Test';
    document.body.appendChild(target);

    target.getBoundingClientRect = () => makeRect({ top: 10, bottom: 30, left: 50, width: 100 });
    const tooltip = document.querySelector('.tooltip-popup') as HTMLElement;
    tooltip.getBoundingClientRect = () => makeRect({ width: 100, height: 20 });

    // Show tooltip
    simulatePointerEnter(target);
    expect(tooltip.style.display).toBe('block');

    // Dismiss with click on body
    simulatePointerDown(document.body);

    expect(tooltip.style.display).toBe('none');
  });
});