# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

**TagDragon v1.4.0** — Chrome DevTools extension (Manifest V3) for capturing and decoding marketing/analytics tracking requests. Built with TypeScript, Rollup (JS bundler) and Tailwind CSS.

## Build Commands

```bash
npm install              # First-time setup
npm run dev              # Development: watches CSS + JS concurrently
npm run build            # Production: minified CSS + JS to dist/
npm run clean            # Delete dist/* contents
```

### Individual Build Commands

```bash
npm run watch:css        # Tailwind CSS watch mode → dist/panel.css
npm run watch:js         # Rollup watch mode → dist/*.js
npm run build:css        # Tailwind CSS minified build
npm run build:js         # Rollup minified build
```

### Testing

**No test framework configured.** This project has no lint or test commands.

### After Code Changes

1. Ensure `npm run dev` is running (or run `npm run build`)
2. Go to `chrome://extensions/` and click refresh on the extension card
3. Close and reopen DevTools panel

## Project Structure

```
Entry Points (edit these):          Build Output (never edit):
├── src/background/index.ts    →    dist/background.js
├── src/devtools/index.ts      →    dist/devtools.js
├── src/panel/index.ts         →    dist/panel.js
├── src/popup/index.ts         →    dist/popup.js
├── styles/input.css           →    dist/panel.css
└── public/panel.html               (static, includes inline CSS)
```

## Code Style Guidelines

### Formatting

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Always use
- **Trailing commas:** Yes, in arrays and objects
- **Line length:** No strict limit (some lines exceed 100 chars)

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `allRequests`, `selectedId`, `filterText` |
| Constants | SCREAMING_SNAKE_CASE | `PROVIDERS`, `DEFAULT_CONFIG`, `COPY_SVG` |
| Functions | camelCase, verb prefix | `getParams()`, `renderList()`, `applyFilters()` |
| DOM elements | $ prefix | `$list`, `$detail`, `$filterInput` |
| Private/internal | _ prefix | `_searchIndex`, `_rafId`, `_pendingRequests` |
| Types (TS) | PascalCase | `ParsedRequest`, `HttpMethod`, `UIState` |

### Import Style

**TypeScript (src/):**
```typescript
// Type imports use 'type' keyword
import type { Provider } from '../../types/provider';
import type { ParsedRequest } from '@/types/request';

// Value imports
import { getParams } from '../url-parser';
import { DEFAULT_CONFIG } from '@/shared/constants';
```

**Path aliases (tsconfig.json):**
- `@/*` → `src/*`
- `@types/*` → `src/types/*`
- `@providers/*` → `src/providers/*`
- `@components/*` → `src/panel/components/*`

### Error Handling Patterns

**Silent catch for optional operations:**
```javascript
try {
  const stored = await chrome.storage.local.get('rt_config');
  if (stored.rt_config) config = { ...DEFAULT_CONFIG, ...stored.rt_config };
} catch {
  // fallback to defaults (storage may not be available)
}
```

**Console.warn for non-critical failures:**
```javascript
try {
  await chrome.storage.local.set({ rt_config: config });
} catch {
  console.warn('Request Tracker: Config save failed');
}
```

**Silent promise rejection:**
```javascript
chrome.runtime.sendMessage({ type: "EXT_REQUEST", data }).catch(() => {});
```

### Comment Style

**Section headers with ASCII art:**
```javascript
// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v2.0 - PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

// ─── STATE ────────────────────────────────────────────────────────────────
let allRequests = [];
```

**JSDoc for TypeScript:**
```typescript
/**
 * Add a new request to the state.
 * Inserts into both allRequests array and requestMap for fast lookup.
 */
export function addRequest(data: ParsedRequest): void {
```

### TypeScript Configuration

Strict mode enabled with these checks:
- `noImplicitAny`, `strictNullChecks`
- `noUnusedLocals`, `noUnusedParameters`
- `noFallthroughCasesInSwitch`

## Architecture Patterns

### Provider System

The extension currently has **68 registered providers** across 9 UI groups (Analytics, Tag Manager, Marketing, Session Replay, A/B Testing, Visitor Identification, Customer Engagement, CDP, Adobe Stack), plus an "Other" fallback group for ungrouped providers (e.g. Merkury).

Providers are defined as objects with `name`, `color`, `pattern` (RegExp), and `parseParams()`:

```javascript
{
  name: "GA4",
  color: "#E8710A",
  pattern: /google-analytics\.com\/g\/collect/,
  parseParams(url, postBody) {
    const p = getParams(url, postBody);
    return { "Event": p.en, "Client ID": p.cid };
  }
}
```

**File locations:**
- `src/providers/<name>.ts` — standalone providers (most)
- `src/providers/google/`, `src/providers/adobe/`, `src/providers/meta/`, `src/providers/microsoft/` — vendor subfolders; use relative imports (`../../types/provider`, `../url-parser`)

**To add a provider:** create the file → import in `src/providers/index.ts` → add to `PROVIDERS` array → add name to the correct group in `src/shared/provider-groups.ts`.

**Ordering rules in `PROVIDERS` (first match wins):**
- More specific patterns always before broader ones on the same domain
- `tealiumEventstream` before `tealium` (`collect.tealiumiq.com/event` vs `collect.tealiumiq.com`)
- `piwikProTm` before `piwikPro`
- Adobe order (specific → broad): `adobeHeartbeat` → `adobeTarget` → `adobeECID` → `adobeAAM` → `adobeDTM` → `adobeLaunchChina` → `adobeAA`
- `comscore` before `scorecard` (same domain `scorecardresearch.com`, different paths)
- `googleAds` before `doubleclick`

### State Management

Centralized state objects with getter/setter functions:
```javascript
let allRequests = [];
const requestMap = new Map();  // id → request (O(1) lookup)
let selectedId = null;
let isPaused = false;  // pause/resume request capture
```

### Configuration (persisted settings)

Default configuration object stored in `chrome.storage.local` under key `rt_config`:
```typescript
const DEFAULT_CONFIG: AppConfig = {
  maxRequests: 500,            // Max requests to keep in memory
  autoPrune: true,             // Auto-prune oldest when limit reached
  pruneRatio: 0.75,            // Prune down to 75% when limit reached
  sortOrder: 'asc',            // 'asc' = oldest first, 'desc' = newest first
  wrapValues: false,           // Wrap long parameter values
  autoExpand: false,           // Auto-expand detail sections on select
  collapsedGroups: [],         // Session-only collapsed group IDs (not persisted meaningfully)
  hiddenProviders: [],         // Provider names hidden in the request list (persisted)
  defaultTab: 'decoded',       // Default detail tab on request select
  compactRows: false,          // Compact row display in request list
  timestampFormat: 'absolute', // 'absolute' | 'relative' | 'elapsed'
  exportFormat: 'json',        // 'json' | 'csv'
};
```

### Quick-Actions Toolbar

Compact icon buttons in the toolbar for quick settings toggles:
- **⏸ Pause/Resume** (`#chk-pause`) - Stop/resume request capture
- **Clear** (`#btn-clear`) - Clear all captured requests (Ctrl+L)
- **Clear Cookies** (`#btn-clear-cookies`) - Delete all cookies for the inspected page
- **Consent** (`#btn-consent`) - Open consent/cookie state inspector
- **⇅ Sort Order** (`#btn-quick-sort`) - Toggle newest/oldest first
- **↩ Wrap Values** (`#btn-quick-wrap`) - Toggle long value wrapping
- **📑 Auto-expand** (`#btn-quick-expand`) - Toggle auto-expand sections
- **Compact Rows** (`#btn-quick-compact`) - Toggle compact row display
- **Provider Filter** (`#btn-providers`) - Opens `#provider-popover` with grouped provider pills; button gets `active` class when any providers are hidden
- **Export** (`#btn-export`) - Export captured requests (JSON or CSV per config)
- **Theme** (`#btn-theme-toggle`) - Toggle dark/light mode
- **Settings** (`#btn-settings`) - Opens `#settings-popover`
- **Info** (`#btn-info`) - Opens `#info-popover` (About/Help)

All toggle settings also available in Settings popover. Quick buttons sync bidirectionally with Settings popover.

### Provider Filter Popover

`#provider-popover` is an absolutely-positioned popover (like Settings) opened via `#btn-providers` in the toolbar. It contains:
- Search input (`#provider-search-input`) to filter pills by name
- Global All / None buttons
- `#provider-group-list` — provider pills grouped by category (from `src/shared/provider-groups.ts`)

Pills are grouped via `PROVIDER_GROUPS`. Each group has its own All/None buttons and a session-only collapse toggle.

Hidden providers are persisted in `AppConfig.hiddenProviders` (restored on load by `loadConfig()` in `src/panel/state.ts`). After every visibility change, call `syncHiddenProviders()` which writes the current Set back to config.

### DOM Performance

- Use `requestAnimationFrame` for batched DOM updates
- Template cloning for row rendering
- Pre-computed search indexes (`_searchIndex`)
- Lazy loading for heavy data (response bodies, headers)

## CSS Workflow

1. **Edit:** `styles/input.css` or inline styles in `public/panel.html`
2. **Never edit:** `dist/panel.css` (auto-generated)
3. **Theme:** Dark theme via CSS custom properties (`--bg-0`, `--text-1`, etc.)
4. **Tailwind config:** Custom spacing (`sp-1` to `sp-6`), font sizes (`2xs` to `lg`)

## Localization

**All UI strings are in English (en-US).** Maintain this when adding/modifying UI text.

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/panel/index.ts` | Panel controller — toolbar handlers, request rendering, popover logic |
| `src/panel/state.ts` | Single source of truth — request state, filter state, AppConfig persistence |
| `src/panel/components/provider-bar.ts` | Provider filter popover — pills, groups, toggle, counts, filter bar visibility |
| `src/panel/components/filter-bar.ts` | Active filter chips bar — shows removable chips for active filters |
| `src/panel/components/detail-pane.ts` | Detail pane tabs — decoded, query, POST, headers, response |
| `src/panel/components/request-list.ts` | Request list rendering and row templates |
| `src/panel/components/status-bar.ts` | Status bar — request count, size, duration stats |
| `src/panel/components/adobe-env-switcher.ts` | Adobe environment switcher UI |
| `src/panel/components/consent-panel.ts` | Consent/cookie state inspector |
| `src/panel/components/info-popover.ts` | About/Help popover |
| `src/panel/tabs/decoded.ts` | Decoded tab — categorized parameter display |
| `src/panel/tabs/query.ts` | Query tab — raw URL query params |
| `src/panel/tabs/post.ts` | POST tab — POST body display |
| `src/panel/tabs/headers.ts` | Headers tab — request/response headers |
| `src/panel/tabs/response.ts` | Response tab — lazy-loaded response body |
| `src/panel/utils/dom.ts` | Cached DOM references (`DOM.*`) and query helpers |
| `src/panel/utils/format.ts` | Value formatting helpers |
| `src/panel/utils/filter.ts` | Filter logic — applies filterState to requests |
| `src/devtools/index.ts` | DevTools page — registers panel, sets up network capture |
| `src/background/index.ts` | Service worker — message relay, declarativeNetRequest rules, cookie clearing |
| `src/providers/index.ts` | PROVIDERS array — ordered list of all provider matchers |
| `src/shared/provider-groups.ts` | PROVIDER_GROUPS — grouping/categorization of providers in the popover |
| `src/shared/categories.ts` | Per-provider parameter display categories |
| `src/types/request.ts` | TypeScript types — ParsedRequest, TabName, etc. |
| `src/shared/constants.ts` | AppConfig interface, DEFAULT_CONFIG, and shared constants |
| `public/panel.html` | Panel DOM + inline CSS |

## Chrome Extension Notes

- Manifest V3 with permissions: `webRequest`, `storage`, `declarativeNetRequest`, `cookies`, `tabs`, `activeTab`
- Host permissions: `<all_urls>`
- DevTools page: `public/devtools.html`
- After JS changes, extension must be reloaded at `chrome://extensions/`

## Adobe Environment Switcher

The extension includes functionality to switch Adobe Launch/Tags environments (DEV/ACC/PROD) using network-level redirects.

### How it works

1. **Detection** (`src/panel/components/adobe-env-switcher.ts`): Scans DOM for Adobe Launch script tags
2. **Configuration**: User sets staging/dev URLs per hostname
3. **Storage**: Config saved to `chrome.storage.local` under key `rt_adobe_env`
4. **Redirect rules** (`src/background/index.ts`): Uses `chrome.declarativeNetRequest.updateDynamicRules()` to redirect PROD URLs to configured environment (rule ID `1001`)
5. **Persistence**: Rules restore automatically on service worker startup via `restoreAdobeRedirectRules()`

### Message types (panel ↔ background)

- `SET_ADOBE_REDIRECT` - Create redirect rule
- `CLEAR_ADOBE_REDIRECT` - Remove redirect rule  
- `GET_ADOBE_REDIRECT` - Query active rule
