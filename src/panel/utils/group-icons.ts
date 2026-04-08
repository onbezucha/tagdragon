// ─── GROUP ICONS ──────────────────────────────────────────────────────────────
// Inline SVG icons for provider groups.
// Using currentColor so they adapt to dark/light theme via CSS.

export const GROUP_ICONS: Record<string, string> = {
  analytics: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="9" width="3" height="6" rx="0.5"/>
    <rect x="6.5" y="5" width="3" height="10" rx="0.5"/>
    <rect x="12" y="2" width="3" height="13" rx="0.5"/>
  </svg>`,

  tagmanager: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"/>
    <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  marketing: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="8" cy="8" r="6.5"/>
    <circle cx="8" cy="8" r="3.5"/>
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/>
  </svg>`,

  replay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="4" width="9" height="8" rx="1"/>
    <path d="M10 7.5l4.5-2.5v6L10 8.5" fill="currentColor" stroke="none"/>
  </svg>`,

  abtesting: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.5 1v5.5L1.5 13a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L10.5 6.5V1"/>
    <line x1="4.5" y1="1" x2="11.5" y2="1"/>
  </svg>`,

  visitorid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="6.5" cy="6.5" r="5"/>
    <line x1="10.5" y1="10.5" x2="14.5" y2="14.5"/>
  </svg>`,

  engagement: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v7a1.5 1.5 0 01-1.5 1.5H5l-3 3V2.5z"/>
  </svg>`,

  cdp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <ellipse cx="8" cy="4" rx="6" ry="2"/>
    <path d="M2 4v4c0 1.1 2.7 2 6 2s6-.9 6-2V4"/>
    <path d="M2 8v4c0 1.1 2.7 2 6 2s6-.9 6-2V8"/>
  </svg>`,

  adobe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1L1 15h4.2l.9-2.5h3.8L10.8 15H15L8 1zm0 4.2l1.4 4.3H6.6L8 5.2z"/>
  </svg>`,
};
