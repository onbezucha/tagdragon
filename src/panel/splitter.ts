// ─── SPLITTER DRAG ────────────────────────────────────────────────────────────

import { DOM } from './utils/dom';
import { savePanelSetting, loadPanelSetting } from './utils/persistence';

const DEFAULT_LIST_WIDTH = 350;
const SPLITTER_MIN_WIDTH = 200;
const SPLITTER_MAX_RATIO = 0.8;

let isDragging = false;

export async function initSplitter(): Promise<void> {
  const $splitter = DOM.splitter;
  const $main = DOM.main;
  if (!$splitter || !$main) return;

  $splitter.addEventListener('mousedown', (e: Event) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    (e as MouseEvent).preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const width = Math.max(280, Math.min(e.clientX, window.innerWidth - 300));
    $main.style.gridTemplateColumns = `${width}px 4px 1fr`;
    void savePanelSetting('list-width', String(width));
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // ── D2: Double-click reset ────────────────────────────────────────────────
  $splitter.addEventListener('dblclick', () => {
    $main.style.gridTemplateColumns = `${DEFAULT_LIST_WIDTH}px 4px 1fr`;
    void savePanelSetting('list-width', String(DEFAULT_LIST_WIDTH));
  });

  // ── D3: Width validation after resize ────────────────────────────────────
  // Restore saved width with validation
  const savedWidth = await loadPanelSetting('list-width');
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    const maxAllowed = window.innerWidth * SPLITTER_MAX_RATIO;
    if (width >= SPLITTER_MIN_WIDTH && width <= maxAllowed) {
      $main.style.gridTemplateColumns = `${width}px 4px 1fr`;
    } else {
      // Use default and save corrected value
      $main.style.gridTemplateColumns = `${DEFAULT_LIST_WIDTH}px 4px 1fr`;
      void savePanelSetting('list-width', String(DEFAULT_LIST_WIDTH));
    }
  }

  // Window resize listener to correct width if window shrinks
  window.addEventListener('resize', () => {
    const currentWidth = parseInt(
      $main.style.gridTemplateColumns || String(DEFAULT_LIST_WIDTH),
      10
    );
    const maxAllowed = window.innerWidth * SPLITTER_MAX_RATIO;
    if (currentWidth > maxAllowed || currentWidth < SPLITTER_MIN_WIDTH) {
      const corrected = Math.max(SPLITTER_MIN_WIDTH, Math.min(DEFAULT_LIST_WIDTH, maxAllowed));
      $main.style.gridTemplateColumns = `${corrected}px 4px 1fr`;
    }
  });
}
