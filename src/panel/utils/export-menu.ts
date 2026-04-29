import { closeAllPopovers, registerPopover } from './popover-manager';

/**
 * Initialize an export format split button with dropdown menu.
 * Eliminates duplicated menu logic between Network and DataLayer export buttons.
 */
export function initExportFormatMenu(
  triggerBtnId: string,
  menuId: string,
  popoverName: string,
  onFormatChange: (format: 'json' | 'csv') => void
): void {
  const btn = document.getElementById(triggerBtnId);
  const menu = document.getElementById(menuId) as HTMLElement | null;
  if (!btn || !menu) return;

  const closeMenu = (): void => {
    menu.classList.remove('visible');
  };

  registerPopover(popoverName, closeMenu);

  btn.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    const opening = !menu.classList.contains('visible');
    closeAllPopovers();
    if (opening) menu.classList.add('visible');
  });

  menu.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.export-format-option') as HTMLElement;
    if (!target) return;
    const format = target.dataset.format as 'json' | 'csv';
    if (format) onFormatChange(format);
    closeMenu();
  });
}
