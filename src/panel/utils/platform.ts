// ─── PLATFORM DETECTION ─────────────────────────────────────────────────────

const isMac =
  (navigator as unknown as { userAgentData?: { platform?: string } })?.userAgentData?.platform ===
    'macOS' || navigator.platform.includes('Mac');

export { isMac };
