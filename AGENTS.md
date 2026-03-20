# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

**TagDragon v1.3.1** — Chrome DevTools extension (Manifest V3) for capturing and decoding marketing/analytics tracking requests. Built with TypeScript, Rollup (JS bundler) and Tailwind CSS.

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
  maxRequests: 500,         // Max requests to keep in memory
  autoPrune: true,          // Auto-prune oldest when limit reached
  pruneRatio: 0.8,          // Keep 80% when pruning
  sortOrder: 'asc',         // 'asc' = oldest first, 'desc' = newest first
  wrapValues: false,        // Wrap long parameter values
  autoExpand: false,        // Auto-expand detail sections on select
  hiddenProviders: [],      // Provider names hidden in the request list (persisted)
};
```

### Quick-Actions Toolbar

Compact icon buttons in the toolbar for quick settings toggles:
- **⇅ Sort Order** - Toggle newest/oldest first
- **↩ Wrap Values** - Toggle long value wrapping
- **📑 Auto-expand** - Toggle auto-expand sections
- **Provider Filter** (`#btn-providers`) - Opens `#provider-popover` with grouped provider pills; button gets `active` class when any providers are hidden
- **Settings** (`#btn-settings`) - Opens `#settings-popover`

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

**All UI strings are in Czech (cs-CZ).** Maintain this when adding/modifying UI text.

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/panel/index.ts` | Panel controller — toolbar handlers, request rendering, popover logic |
| `src/panel/state.ts` | Single source of truth — request state, filter state, AppConfig persistence |
| `src/panel/components/provider-bar.ts` | Provider filter popover — pills, groups, toggle, counts, filter bar visibility |
| `src/panel/components/adobe-env-switcher.ts` | Adobe environment switcher UI |
| `src/panel/components/detail-pane.ts` | Detail pane tabs — decoded, query, POST, headers, response |
| `src/panel/utils/dom.ts` | Cached DOM references (`DOM.*`) and query helpers |
| `src/panel/utils/format.ts` | Value formatting helpers |
| `src/devtools/index.ts` | DevTools page — registers panel, sets up network capture |
| `src/background/index.ts` | Service worker — message relay, declarativeNetRequest rules |
| `src/providers/index.ts` | PROVIDERS array — ordered list of all provider matchers |
| `src/shared/provider-groups.ts` | PROVIDER_GROUPS — grouping/categorization of providers in the popover |
| `src/shared/categories.ts` | Per-provider parameter display categories |
| `src/types/request.ts` | TypeScript types — ParsedRequest, AppConfig, etc. |
| `src/shared/constants.ts` | DEFAULT_CONFIG and shared constants |
| `public/panel.html` | Panel DOM + inline CSS |

## Chrome Extension Notes

- Manifest V3 with permissions: `webRequest`, `storage`, `declarativeNetRequest`
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
