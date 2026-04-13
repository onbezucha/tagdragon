# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

**TagDragon v1.6.1** — Chrome DevTools extension (Manifest V3) for capturing and decoding marketing/analytics tracking requests. Built with TypeScript, Rollup (JS bundler) and Tailwind CSS.

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

### Code Quality

```bash
npm run lint         # ESLint — TypeScript rules, no explicit any, prefer-const
npm run format       # Prettier — auto-format all src/ files
npm run format:check # Prettier — check only (used in CI)
npm run analyze      # Build with bundle visualizer → dist/stats.html
```

No test framework is configured. All testing is manual.

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
├── src/content/data-layer-main.ts  →    dist/data-layer-main.js
├── src/content/data-layer-bridge.ts → dist/data-layer-bridge.js
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

The extension currently has **69 registered providers** across 9 UI groups (Analytics, Tag Manager, Marketing, Session Replay, A/B Testing, Visitor Identification, Customer Engagement, CDP, Adobe Stack). `Microsoft Clarity Tag` is not assigned to any group and falls into the `UNGROUPED_ID`/`UNGROUPED_LABEL` fallback in `src/shared/provider-groups.ts`. Merkury is assigned to the Visitor Identification group.

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
- `microsoftClarityTag` before `microsoftClarity` (library load before event tracking)
- Adobe order (specific → broad): `aepWebSDK` → `adobeHeartbeat` → `adobeTarget` → `adobeECID` → `adobeAAM` → `adobeDTM` → `adobeLaunchChina` → `adobeAA`
- `comscore` before `scorecard` (same domain `scorecardresearch.com`, different paths)
- `googleAds` before `doubleclick`

### State Management

**Network requests** (`src/panel/state.ts`):
- `requestState` — `all[]` array + `map` (O(1) lookup by ID) + `filteredIds` set
- `uiState` — selected ID, pause flag, active tab
- `filterState` — text, eventType, userId, status, method, hasParam
- `statsState` — visible count, size, duration accumulators
- `appConfig` — persisted to `chrome.storage.local` under key `rt_config`
- `adobeEnvState` — Adobe environment detection and configuration state (not persisted)

**DataLayer pushes** (`src/panel/datalayer/state.ts`):
- `all[]` array + `map` (O(1) lookup by push ID) + `filteredIds` set
- `selectedId`, `isPaused`, `sources` (Set), `sourceLabels` (Map)
- `dlFilterState` — text, source, eventName, hasKey, ecommerceOnly
- `dlPending` batch queue + `requestAnimationFrame` batching
- `watchedPaths` — pinned dot-notation paths for Live Inspector (max 10)
- `validationErrors` / `validationRules` — rule-based push validation state
- `correlationWindowMs` / `correlationLookbackMs` — configurable correlation time windows
- `dlSortField` / `dlSortOrder` — sort state (persisted via AppConfig)
- `dlGroupBySource` — group push list by source flag (persisted via AppConfig)
- `sharedCumulativeState` — single mutable cumulative state with `structuredClone` snapshots
- `MAX_DL_PUSHES = 1000` — auto-prune threshold (prunes to 75%)

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
  dlSortField: 'time',         // DataLayer sort field: 'time' | 'keycount' | 'source'
  dlSortOrder: 'asc',          // DataLayer sort order: 'asc' | 'desc'
  dlGroupBySource: false,      // Group DataLayer push list by source
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
- Cached SVG icon fragments (`getCachedIcon()` in `src/panel/utils/icon-builder.ts`)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests (network or datalayer based on active view) |
| `Ctrl+F` | Focus search input (network or datalayer based on active view) |
| `↑ / ↓` | Navigate list |
| `Home` / `Cmd+↑` | Jump to first item |
| `End` / `Cmd+↓` | Jump to last item |
| `Esc` | Clear search / close detail panel / close popovers |

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
| `src/panel/index.ts` | Panel controller — toolbar handlers, request rendering, popover logic, DataLayer handlers |
| `src/panel/keyboard-shortcuts.ts` | Keyboard shortcut handlers — extracted from panel/index.ts; accepts `KeyboardContext` |
| `src/panel/splitter.ts` | Resizable list/detail splitter drag logic — extracted from panel/index.ts |
| `src/panel/theme.ts` | Dark/light theme management with CSS custom properties |
| `src/panel/state.ts` | Single source of truth — request state, filter state, AppConfig persistence |
| `src/panel/components/provider-bar.ts` | Provider filter popover — pills, groups, toggle, counts, filter bar visibility |
| `src/panel/components/filter-bar.ts` | Active filter chips bar — shows removable chips for active filters |
| `src/panel/components/detail-pane.ts` | Detail pane tabs — decoded, query, POST, headers, response |
| `src/panel/components/request-list.ts` | Request list rendering and row templates |
| `src/panel/components/status-bar.ts` | Status bar — request count, size, duration stats |
| `src/panel/components/adobe-env-switcher.ts` | Adobe environment switcher UI |
| `src/panel/components/consent-panel.ts` | Consent/cookie state inspector |
| `src/panel/components/info-popover.ts` | About/Help popover |
| `src/panel/detail-tabs/decoded.ts` | Decoded tab — categorized parameter display |
| `src/panel/detail-tabs/query.ts` | Query tab — raw URL query params |
| `src/panel/detail-tabs/post.ts` | POST tab — POST body display |
| `src/panel/detail-tabs/headers.ts` | Headers tab — request/response headers |
| `src/panel/detail-tabs/response.ts` | Response tab — lazy-loaded response body |
| `src/panel/utils/dom.ts` | Cached DOM references (`DOM.*`) and query helpers |
| `src/panel/utils/format.ts` | Value formatting helpers |
| `src/panel/utils/filter.ts` | Filter logic — applies filterState to requests |
| `src/panel/utils/categorize.ts` | Request categorization logic for the Decoded tab |
| `src/panel/utils/export.ts` | CSV and JSON download utilities |
| `src/panel/utils/persistence.ts` | Panel setting persistence (chrome.storage.local + localStorage fallback) |
| `src/panel/utils/platform.ts` | Platform detection — `isMac` constant for Mac keyboard shortcuts |
| `src/panel/utils/group-icons.ts` | Inline SVG icons for provider groups (analytics, tagmanager, marketing, etc.) |
| `src/panel/utils/icon-registry.ts` | Brand SVG icons for individual providers (GA4, GTM, Meta Pixel, etc.) |
| `src/panel/utils/icon-builder.ts` | Provider icon cache — `buildGroupIcon()` and `getCachedIcon()` for fast SVG rendering |
| `src/panel/utils/tooltip.ts` | Shared tooltip system — event delegation, data-tooltip attributes |
| `src/devtools/index.ts` | DevTools page — registers panel, sets up network capture |
| `src/devtools/network-capture.ts` | HAR network request capture — provider matching, POST body parsing, request building |
| `src/devtools/panel-bridge.ts` | Panel communication — request buffering, heavy data store, lazy loading |
| `src/devtools/data-layer-relay.ts` | DataLayer relay — forwards pushes/sources/snapshots from background port to panel |
| `src/background/index.ts` | Service worker — message relay, declarativeNetRequest rules, cookie clearing |
| `src/background/badge.ts` | Badge counter — updates extension icon with request count |
| `src/background/popup-bridge.ts` | Popup bridge — handles popup ↔ background messaging, DevTools status tracking |
| `src/providers/index.ts` | PROVIDERS array — ordered list of all provider matchers, domain index, matchProvider() |
| `src/providers/url-parser.ts` | URL and POST body parameter parser — `getParams()` utility used by all providers |
| `src/providers/adform.ts` | Adform provider |
| `src/providers/amazon-ads.ts` | Amazon Ads provider |
| `src/providers/at-internet.ts` | AT Internet provider |
| `src/providers/demandbase.ts` | Demandbase provider |
| `src/providers/ensighten.ts` | Ensighten provider |
| `src/providers/hubspot.ts` | HubSpot provider |
| `src/providers/indicative.ts` | Indicative provider |
| `src/providers/invoca.ts` | Invoca provider |
| `src/providers/lytics.ts` | Lytics provider |
| `src/providers/medallia.ts` | Medallia DXA provider |
| `src/providers/omniconvert.ts` | Omniconvert provider |
| `src/providers/optimizely.ts` | Optimizely provider |
| `src/providers/piwik-pro-tm.ts` | Piwik PRO TM provider |
| `src/providers/reddit-pixel.ts` | Reddit Pixel provider |
| `src/providers/rtb-house.ts` | RTB House provider |
| `src/providers/seznam-sklik.ts` | Seznam Sklik provider |
| `src/providers/sojern.ts` | Sojern provider |
| `src/providers/split-io.ts` | Split.io provider |
| `src/providers/microsoft/clarity-event-types.ts` | Clarity event type constants |
| `src/providers/microsoft/clarity-tag.ts` | Microsoft Clarity library load provider (detection only) |
| `src/shared/provider-groups.ts` | PROVIDER_GROUPS — grouping/categorization of providers in the popover |
| `src/shared/categories.ts` | Per-provider parameter display categories |
| `src/shared/cmp-detection.ts` | CMP detection scripts — OneTrust, UserCentrics, Cookiebot, CookieYes, Didomi, iubenda, TCF |
| `src/types/index.ts` | Barrel re-export of all type modules |
| `src/types/provider.ts` | Provider and ProviderRegistry type definitions |
| `src/types/request.ts` | TypeScript types — ParsedRequest, TabName, etc. |
| `src/types/datalayer.ts` | DataLayer types — DataLayerPush, DataLayerState, DiffEntry, ValidationRule, ValidationResult, message types |
| `src/types/har.ts` | HAR post data interface type |
| `src/types/consent.ts` | Consent types — ConsentCategory, GoogleConsentMode, TCFData, CMPInfo, ConsentData |
| `src/types/popup.ts` | Popup types — ProviderStats, TabPopupStats, PopupStatsResponse |
| `src/types/categories.ts` | Category types — CategoryConfig, ProviderCategories |
| `src/shared/constants.ts` | AppConfig interface, DEFAULT_CONFIG, and shared constants |
| `src/shared/datalayer-constants.ts` | DataLayer source labels and descriptions |
| `src/shared/ecommerce.ts` | Unified e-commerce event type detection (purchase, checkout, impression, promo, refund) |
| `src/shared/http-utils.ts` | HTTP header parsing utilities |
| `src/shared/id-gen.ts` | Unique ID generation with timestamp + counter |
| `src/content/data-layer-main.ts` | MAIN world script — intercepts data layer pushes from GTM, Tealium, Adobe, Segment, digitalData |
| `src/content/data-layer-bridge.ts` | ISOLATED world bridge — relays postMessage to background service worker |
| `src/panel/datalayer/state.ts` | DataLayer state — push array, filtered IDs, sources, filter state, validation, sort, correlation config, watch paths, shared cumulative state |
| `src/panel/datalayer/components/push-list.ts` | DataLayer push list rendering — source colors, badges, event names, group by source |
| `src/panel/datalayer/components/push-detail.ts` | DataLayer detail pane — 4 sub-tabs (push data, diff, current state, correlation) |
| `src/panel/datalayer/components/live-inspector.ts` | Reactive tree view of cumulative DataLayer state with change highlighting and watch paths |
| `src/panel/datalayer/utils/diff-renderer.ts` | Deep diff algorithm and rendering for DataLayer push comparisons |
| `src/panel/datalayer/utils/ecommerce-formatter.ts` | E-commerce detection and product table rendering |
| `src/panel/datalayer/utils/correlation.ts` | Correlation engine — finds network requests correlated with DataLayer pushes (configurable window) |
| `src/panel/datalayer/utils/reverse-correlation.ts` | Reverse correlation — finds DataLayer push that triggered a network request |
| `src/panel/datalayer/utils/validator.ts` | Rule-based validation engine for DataLayer pushes with preset and custom rules |
| `public/panel.html` | Panel DOM + inline CSS |

## Chrome Extension Notes

- Manifest V3 with permissions: `webRequest`, `storage`, `declarativeNetRequest`, `cookies`, `scripting`
- Content scripts: `dist/data-layer-bridge.js` injected on all URLs at `document_idle`
- Web accessible resources: `dist/data-layer-main.js` (injected dynamically via `chrome.scripting.executeScript`)
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
5. **Persistence**: Redirect rules persist across page navigations via `declarativeNetRequest` dynamic rules; config is stored per hostname

### Message types (panel ↔ background)

- `SET_ADOBE_REDIRECT` - Create redirect rule
- `CLEAR_ADOBE_REDIRECT` - Remove redirect rule
- `GET_ADOBE_REDIRECT` - Query active rule

## DataLayer Tab

The extension includes a **DataLayer tab** that intercepts and displays data layer pushes from multiple tag management and analytics platforms.

### Supported Sources

- **GTM** (`window.dataLayer`) — intercepts `.push()` calls and replays existing items
- **Tealium** (`window.utag.data`) — intercepts `utag.link` and `utag.view` calls
- **Adobe** (`window.adobeDataLayer`, `_satellite.track`) — intercepts ACDL pushes and satellite track calls
- **Segment** (`window.analytics`) — intercepts `track`, `page`, `identify`, `group` methods
- **W3C digitalData** (`window.digitalData`) — wraps with Proxy to detect mutations

### Architecture

The DataLayer feature uses a three-layer architecture:

1. **MAIN world** (`src/content/data-layer-main.ts`) — Runs in the page context. Intercepts data layer pushes and sends them to the ISOLATED world via `window.postMessage`. Sanitizes data (strips functions, DOM nodes, circular refs) before structured clone. Includes retry logic for late-initialized globals (up to 10s).

2. **ISOLATED world bridge** (`src/content/data-layer-bridge.ts`) — Content script that relays `postMessage` events from MAIN world to the background service worker via `chrome.runtime.sendMessage`. Also performs initial source detection and requests snapshots when DevTools opens.

3. **DevTools relay** (`src/devtools/data-layer-relay.ts`) — Forwards DataLayer messages from background port to the panel window. Buffers pushes that arrive before the panel is ready.

4. **Background relay** (`src/background/index.ts`) — Routes `DATALAYER_PUSH`, `DATALAYER_SOURCES`, and `DATALAYER_SNAPSHOT_REQUEST/RESPONSE` messages between content scripts and DevTools via named ports (`devtools_<tabId>`).

5. **Panel UI** (`src/panel/datalayer/`) — Renders the DataLayer tab with push list, detail pane, and correlation view.

### Content Script Injection

Content scripts are injected both via the manifest `content_scripts` entry (bridge only, as a fallback for initial page loads) and dynamically via `chrome.scripting.executeScript()` (both scripts, triggered on panel show and page navigation). Guards (`__tagdragon_bridge__`, `__tagdragon_main__`) prevent double execution:
- Bridge (ISOLATED world): injected as a file
- Main (MAIN world): injected with `world: 'MAIN'` to bypass page CSP
- On panel shown and page navigation, background sends `INJECT_DATALAYER` message which clears guards and re-injects both scripts

### DataLayer Panel Components

| File | Purpose |
|------|---------|
| `src/panel/datalayer/state.ts` | DataLayer push state — all pushes, filtered IDs, selected ID, sources, filter state, validation, sort, correlation config, watch paths |
| `src/panel/datalayer/components/push-list.ts` | Push list rendering — source colors, badges, event names, group by source |
| `src/panel/datalayer/components/push-detail.ts` | Detail pane with 4 sub-tabs: Push Data, Diff, Current State, Correlation |
| `src/panel/datalayer/components/live-inspector.ts` | Reactive tree view of cumulative state with change highlighting and watch paths |
| `src/panel/datalayer/utils/diff-renderer.ts` | Deep diff algorithm and visual rendering between consecutive pushes |
| `src/panel/datalayer/utils/ecommerce-formatter.ts` | E-commerce detection (purchase, checkout, impression, promo, refund) and product table rendering |
| `src/panel/datalayer/utils/correlation.ts` | Correlation engine — finds network requests within a configurable time window of a DataLayer push |
| `src/panel/datalayer/utils/reverse-correlation.ts` | Reverse correlation — finds DataLayer push that triggered a network request |
| `src/panel/datalayer/utils/validator.ts` | Rule-based validation engine — preset rules (required keys, key types, forbidden keys) and custom rules |

### DataLayer Filter State

```typescript
interface DlFilterState {
  text: string;           // Text search across push data
  source: DataLayerSource | '';  // Filter by source (gtm, tealium, adobe, segment, digitalData)
  eventName: string;      // Filter by event name
  hasKey: string;         // Filter by key existence
  ecommerceOnly: boolean; // Show only e-commerce pushes
}
```

### DataLayer Detail Sub-Tabs

1. **Push Data** — raw data object of the selected push
2. **Diff** — deep diff from previous push (added/removed/changed keys with dot-notation paths)
3. **Current State** — cumulative merged state up to the selected push
4. **Correlation** — network requests that occurred within the configurable correlation window of the push, sorted by delay

## Extension Popup

The extension includes a popup (`src/popup/index.ts`, `public/popup.html`, `public/popup.css`) that shows live request statistics when clicking the extension icon. No need to open DevTools to see basic stats.

### Features

- **Live stats** — total requests, total size, average duration, success rate
- **Provider breakdown** — top 5 providers by count with color-coded pills
- **Pause/Resume** — toggle recording from the popup
- **Clear** — clear all captured requests
- **DevTools warning** — shown when DevTools is not open (requests not captured)
- **Badge counter** — extension icon shows request count (via `src/background/badge.ts`)

### Popup ↔ Background Communication

- `GET_POPUP_STATS` — request current stats for the active tab
- `UPDATE_POPUP_STATS` — sent by DevTools after each captured request (increments counters)
- `PAUSE_RECORDING` / `RESUME_RECORDING` — toggle pause state
- `CLEAR_REQUESTS` — clear stats for the active tab

Stats are stored in `chrome.storage.session` (key: `popup_stats`) — per-tab, cleared on browser restart.
DevTools open/closed state is tracked via named ports (`devtools_<tabId>`).
