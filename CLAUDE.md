# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Production build (CSS + JS)
npm run dev            # Watch mode (CSS + JS concurrently)
npm run build:css      # Tailwind only → dist/panel.css
npm run build:js       # Rollup only → dist/*.js
npm run clean          # Delete dist/*
```

No test or lint commands exist. After every change, run `npm run build` and reload the extension at `chrome://extensions/`.

## Architecture

TagDragon is a Chrome DevTools extension (Manifest V3) with three separate JS bundles compiled by Rollup from TypeScript entry points:

| Entry point | Output | Context |
|---|---|---|
| `src/devtools/index.ts` | `dist/devtools.js` | DevTools page — registers the panel |
| `src/panel/index.ts` | `dist/panel.js` | Panel UI — all rendering and interaction |
| `src/background/index.ts` | `dist/background.js` | Service worker — relays extension requests + manages `declarativeNetRequest` rules |

Static files live in `public/` (HTML) and `styles/input.css` (Tailwind source). Never edit `dist/`.

### Request flow

1. `src/devtools/network-capture.ts` — listens via `chrome.devtools.network.onRequestFinished`, matches provider, parses POST body, calls `provider.parseParams()`, builds a `ParsedRequest` object
2. `src/devtools/panel-bridge.ts` — sends the request to the panel via `chrome.runtime.sendMessage`; large data (response bodies, raw headers) is stored in `heavyDataStore` keyed by request ID and fetched lazily
3. `src/panel/index.ts` — receives the message, adds to state, batches DOM updates via `requestAnimationFrame`

### Provider system

Each provider is a plain object implementing `src/types/provider.ts`:

```typescript
{
  name: string;
  color: `#${string}`;
  pattern: RegExp;
  parseParams(url: string, postBody: unknown): Record<string, string | undefined>;
}
```

To add a provider: create a file in `src/providers/`, implement the interface, import and add to `PROVIDERS` array in `src/providers/index.ts`. **Order in the array matters** — first match wins. More specific patterns must come before broader ones (e.g. `googleAds` before `doubleclick`).

`getParams(url, postBody)` in `src/providers/url-parser.ts` merges URL query params and POST body (supports URLencoded and JSON) into one flat object. Use it in all `parseParams` implementations.

### Parameter categorization

`src/shared/categories.ts` defines per-provider display categories with grouping rules (prefix match or regex). `src/panel/utils/categorize.ts` applies these rules when rendering the Decoded tab. The `_other` bucket catches any uncategorized params.

### State management

`src/panel/state.ts` is the single source of truth for the panel:
- `requestState` — `all[]` array + `map` (O(1) lookup by ID) + `filteredIds` set
- `uiState` — selected ID, pause flag, active tab
- `filterState` — text, eventType, userId, status, method, hasParam
- `statsState` — visible count, size, duration accumulators
- `appConfig` — persisted to `chrome.storage.local` under key `rt_config`; includes `hiddenProviders: string[]` which is mirrored into a runtime `Set<string>` on load

`syncHiddenProviders()` must be called after every provider visibility toggle — it writes the current `hiddenProviders` Set back to `AppConfig` via `updateConfig()`.

### Provider Filter Popover

`#provider-popover` is an absolutely-positioned popover opened by `#btn-providers` in the toolbar (similar pattern to `#settings-popover`). It contains `#provider-group-list` with grouped provider pills from `src/panel/components/provider-bar.ts`.

Provider groups are defined in `src/shared/provider-groups.ts`. Each group has session-only collapse and per-group All/None buttons. Hidden provider state persists across DevTools restarts via `AppConfig.hiddenProviders`.

### Adobe Environment Switcher

`src/panel/components/adobe-env-switcher.ts` detects Adobe Launch/Tags on the inspected page, lets the user configure DEV/ACC/PROD URLs per hostname, and switches environments via network-level redirects:
- Panel sends `SET_ADOBE_REDIRECT` / `CLEAR_ADOBE_REDIRECT` / `GET_ADOBE_REDIRECT` to background
- Background uses `chrome.declarativeNetRequest.updateDynamicRules` (rule ID `1001`)
- Config stored in `chrome.storage.local` under key `rt_adobe_env`
- On init, if config shows non-prod but no active rule exists (e.g. after browser restart), the rule is automatically re-applied

### Theme

`src/panel/theme.ts` manages dark/light mode. Dark is the CSS default (no attribute). Light mode sets `data-theme="light"` on `<html>`. Theme is persisted under key `rt_theme`.

## Code style

- 2-space indentation, single quotes, semicolons, trailing commas
- DOM element variables prefixed with `$` (e.g. `$list`, `$envApply`)
- Section headers: `// ─── SECTION NAME ─────`
- Silent catch for optional Chrome storage operations; `console.warn` for non-critical failures
- `@types/chrome` is not installed — Chrome API type errors are warnings only and do not block the build

## Path aliases (tsconfig.json)

- `@/*` → `src/*`
- `@types/*` → `src/types/*`
- `@providers/*` → `src/providers/*`
- `@components/*` → `src/panel/components/*`

## Localization

All UI strings are in **Czech (cs-CZ)**. Keep this consistent when adding UI text.
