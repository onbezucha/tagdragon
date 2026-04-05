// ─── PLATFORM DETECTION ─────────────────────────────────────────────────────

const isMac = navigator.platform.includes('Mac');

function modLabel(): string {
  return isMac ? '⌘' : 'Ctrl';
}

export { isMac, modLabel };
