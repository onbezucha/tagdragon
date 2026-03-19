# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

**Request Tracker v2.0.0** — Chrome DevTools extension (Manifest V3) for capturing and decoding marketing/analytics tracking requests. Built with Rollup (JS bundler) and Tailwind CSS.

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
Entry Points (edit these):     Build Output (never edit):
├── background.js         →    dist/background.js
├── devtools.js           →    dist/devtools.js
├── panel.js              →    dist/panel.js
├── styles/input.css      →    dist/panel.css
└── public/panel.html          (static, includes inline CSS)
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

**Root JS files:** No imports (monolithic, use Chrome APIs directly)

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
let isPaused = false;
```

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

| File | Purpose | Lines |
|------|---------|-------|
| `panel.js` | UI controller, state, rendering, Adobe env switcher UI | ~2900 |
| `devtools.js` | Network interception, provider matching | ~500 |
| `background.js` | Service worker, extension requests, Adobe redirect rules | ~180 |
| `public/panel.html` | Panel DOM + inline CSS | ~1100 |
| `styles/input.css` | Tailwind source + custom CSS | ~770 |

## Chrome Extension Notes

- Manifest V3 with permissions: `webRequest`, `storage`, `declarativeNetRequest`
- Host permissions: `<all_urls>`
- DevTools page: `public/devtools.html`
- After JS changes, extension must be reloaded at `chrome://extensions/`

## Adobe Environment Switcher

The extension includes functionality to switch Adobe Launch/Tags environments (DEV/ACC/PROD) using network-level redirects.

### How it works

1. **Detection** (`panel.js`): Scans DOM for Adobe Launch script tags
2. **Configuration** (`panel.js`): User sets staging/dev URLs per hostname
3. **Storage**: Config saved to `chrome.storage.local` under key `rt_adobe_env`
4. **Redirect rules** (`background.js`): Uses `chrome.declarativeNetRequest.updateSessionRules()` to redirect PROD URLs to configured environment
5. **Persistence**: Rules restore automatically on service worker startup via `restoreAdobeRedirectRules()`

### Key functions in background.js

| Function | Purpose |
|----------|---------|
| `setAdobeRedirectRule(fromUrl, toUrl)` | Creates session redirect rule |
| `clearAdobeRedirectRule()` | Removes redirect rule |
| `getAdobeRedirectRule()` | Returns active redirect rule |
| `restoreAdobeRedirectRules()` | Restores rules from storage on startup |

### Message types (panel ↔ background)

- `SET_ADOBE_REDIRECT` - Create redirect rule
- `CLEAR_ADOBE_REDIRECT` - Remove redirect rule  
- `GET_ADOBE_REDIRECT` - Query active rule
