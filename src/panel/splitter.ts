// ─── SPLITTER DRAG ────────────────────────────────────────────────────────────

import { DOM } from './utils/dom';
import { savePanelSetting, loadPanelSetting } from './utils/persistence';

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

  // Restore saved width
  const savedWidth = await loadPanelSetting('list-width');
  if (savedWidth) {
    $main.style.gridTemplateColumns = `${savedWidth}px 4px 1fr`;
  }
}
