// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP SYSTEM
// Single shared tooltip element, event delegation on document.
// Reads data-tooltip attributes and positions the tooltip instantly.
// ═══════════════════════════════════════════════════════════════════════════

let tooltipEl: HTMLElement | null = null;
let currentTarget: HTMLElement | null = null;

/**
 * Initialize the tooltip system.
 * Creates the shared tooltip DOM element and attaches delegated event listeners.
 */
export function init(): void {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip-popup';
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);

  // Capture phase for early interception before child handlers
  document.addEventListener('pointerenter', handleEnter, true);
  document.addEventListener('pointerleave', handleLeave, true);
  document.addEventListener('pointerdown', handleDismiss, true);
}

function handleEnter(e: Event): void {
  if (!(e.target instanceof Element)) return;
  const target = e.target.closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;

  const text = target.dataset.tooltip;
  if (!text) return;

  currentTarget = target;
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  positionTooltip(target);
}

function handleLeave(e: Event): void {
  if (!(e.target instanceof Element)) return;
  const target = e.target.closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;

  // Only hide if we're leaving the current tooltip target
  if (target === currentTarget) {
    hideTooltip();
  }
}

function handleDismiss(_e: Event): void {
  hideTooltip();
}

function hideTooltip(): void {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
  currentTarget = null;
}

function positionTooltip(target: HTMLElement): void {
  if (!tooltipEl) return;

  const rect = target.getBoundingClientRect();
  const tRect = tooltipEl.getBoundingClientRect();

  // Default: below the element, horizontally centered
  let top = rect.bottom + 6;
  let left = rect.left + (rect.width - tRect.width) / 2;

  // Horizontal overflow protection
  if (left < 4) left = 4;
  if (left + tRect.width > window.innerWidth - 4) {
    left = window.innerWidth - tRect.width - 4;
  }

  // Vertical flip if tooltip would overflow bottom
  if (top + tRect.height > window.innerHeight - 4) {
    top = rect.top - tRect.height - 6;
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}
