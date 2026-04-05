# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**TagDragon v1.5.0** — Chrome DevTools extension (Manifest V3) for capturing and decoding marketing/analytics tracking requests.

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

TagDragon is a Chrome DevTools extension (Manifest V3) with six separate JS bundles compiled by Rollup from TypeScript entry points:

| Entry point | Output | Context |
|---|---|---|
| `src/devtools/index.ts` | `dist/devtools.js` | DevTools page — registers the panel, sets up DataLayer relay |
| `src/panel/index.ts` | `dist/panel.js` | Panel UI — all rendering and interaction |
| `src/background/index.ts` | `dist/background.js` | Service worker — message relay, popup bridge, badge counter, declarativeNetRequest rules, DataLayer relay, cookie clearing |
| `src/popup/index.ts` | `dist/popup.js` | Extension popup — live request stats, pause/clear controls |
| `src/content/data-layer-main.ts` | `dist/data-layer-main.js` | MAIN world content script — intercepts data layer pushes (GTM, Tealium, Adobe, Segment, digitalData) |
| `src/content/data-layer-bridge.ts` | `dist/data-layer-bridge.js` | ISOLATED world content script — relays postMessage to background |

Static files live in `public/` (HTML) and `styles/input.css` (Tailwind source). Never edit `dist/`.

### Request flow

1. `src/devtools/network-capture.ts` — listens via `chrome.devtools.network.onRequestFinished`, matches provider, parses POST body, calls `provider.parseParams()`, builds a `ParsedRequest` object
2. `src/devtools/panel-bridge.ts` — sends the request to the panel via `chrome.runtime.sendMessage`; large data (response bodies, raw headers) is stored in `heavyDataStore` keyed by request ID and fetched lazily
3. `src/panel/index.ts` — receives the message, adds to state, batches DOM updates via `requestAnimationFrame`

### DataLayer flow

1. `src/content/data-layer-main.ts` (MAIN world) — intercepts data layer pushes (GTM `.push()`, Tealium `utag.link/view`, Adobe `adobeDataLayer`, Segment `analytics.*`, W3C digitalData Proxy), sanitizes data, sends via `window.postMessage`
2. `src/content/data-layer-bridge.ts` (ISOLATED world) — receives `postMessage`, forwards to background via `chrome.runtime.sendMessage`
3. `src/background/index.ts` — relays `DATALAYER_PUSH`/`DATALAYER_SOURCES` messages to DevTools via named port (`devtools_<tabId>`)
4. `src/devtools/data-layer-relay.ts` — forwards messages from background port to panel window (buffers if panel not ready)
5. `src/panel/index.ts` — receives via `window.receiveDataLayerPush()`, adds to DataLayer state, batches DOM updates

### Provider system

68 registered providers. Each is a plain object implementing `src/types/provider.ts`:

```typescript
{
  name: string;
  color: `#${string}`;
  pattern: RegExp;
  parseParams(url: string, postBody: unknown): Record<string, string | undefined>;
}
```

To add a provider: create a file in `src/providers/` (or a vendor subfolder), implement the interface, import and add to `PROVIDERS` array in `src/providers/index.ts`, add the name to the correct group in `src/shared/provider-groups.ts`.

**Order in `PROVIDERS` matters** — first match wins. Keep more specific patterns before broader ones. Critical ordering constraints:
- `tealiumEventstream` before `tealium`
- `piwikProTm` before `piwikPro`
- Adobe stack (specific → broad): `aepWebSDK` → `adobeHeartbeat` → `adobeTarget` → `adobeECID` → `adobeAAM` → `adobeDTM` → `adobeLaunchChina` → `adobeAA`
- `comscore` before `scorecard`
- `googleAds` before `doubleclick`

Providers in vendor subfolders (`google/`, `adobe/`, `meta/`, `microsoft/`) use relative imports (`../../types/provider`, `../url-parser`) instead of path aliases.

`getParams(url, postBody)` in `src/providers/url-parser.ts` merges URL query params and POST body (supports URLencoded and JSON) into one flat object. Use it in all `parseParams` implementations.

### DataLayer tab

Separate panel tab that intercepts and displays data layer pushes from 5 sources:
- **GTM** — `window.dataLayer.push()` interception + existing item replay
- **Tealium** — `utag.link()` / `utag.view()` wrapping
- **Adobe** — `adobeDataLayer.push()` + `_satellite.track()` wrapping
- **Segment** — `analytics.track/page/identify/group()` wrapping
- **W3C digitalData** — `Proxy`-based mutation detection with debouncing

Panel has 4 detail sub-tabs: Push Data, Diff (deep diff between pushes), Current State (cumulative merge), Correlation (network requests within 2s window).

Key files: `src/panel/datalayer/` (state, push-list, push-detail, diff-renderer, ecommerce-formatter, correlation), `src/types/datalayer.ts`.

Content scripts are injected via `chrome.scripting.executeScript({ world: 'MAIN' })` to bypass CSP. Injection triggered by `INJECT_DATALAYER` message from DevTools on panel shown + page navigation. The bridge script is also registered as a manifest `content_scripts` entry for initial page-load coverage; guards prevent double execution.

### Extension popup

`src/popup/index.ts` renders `public/popup.html` when the extension icon is clicked. Shows:
- Live request count, size, avg duration, success rate
- Top 5 providers by count (expandable)
- Pause/resume and clear buttons
- Warning when DevTools is not open

Stats stored in `chrome.storage.session` (per-tab, cleared on restart). Badge counter (`src/background/badge.ts`) shows request count on the extension icon.

### Parameter categorization

`src/shared/categories.ts` defines per-provider display categories with grouping rules (prefix match or regex). `src/panel/utils/categorize.ts` applies these rules when rendering the Decoded tab. The `_other` bucket catches any uncategorized params.

### Provider icons

`src/panel/utils/provider-icons.ts` contains brand SVG icons for individual providers (GA4, GTM, Meta Pixel, etc.) sourced from Simple Icons (CC0). `src/panel/utils/group-icons.ts` has generic SVG icons for provider groups. Both use `currentColor` for theme adaptation.

### Shared utilities

- `src/shared/datalayer-constants.ts` — `SOURCE_LABELS` and `SOURCE_DESCRIPTIONS` for DataLayer sources
- `src/shared/ecommerce.ts` — Unified e-commerce event type detection (purchase, checkout, impression, promo, refund)
- `src/shared/http-utils.ts` — HTTP header parsing utilities
- `src/shared/id-gen.ts` — Unique ID generation with timestamp + counter

### Panel utilities

- `src/panel/utils/categorize.ts` — Applies provider-specific category rules from `src/shared/categories.ts` for the Decoded tab
- `src/panel/utils/export.ts` — CSV and JSON download utilities
- `src/panel/utils/persistence.ts` — Panel setting persistence using `chrome.storage.local` with `localStorage` fallback (used for splitter widths etc.)
- `src/panel/utils/platform.ts` — `isMac` constant for Mac-specific keyboard shortcuts (Cmd+↑/↓ as Home/End)

### State management

`src/panel/state.ts` — network request state:
- `requestState` — `all[]` array + `map` (O(1) lookup by ID) + `filteredIds` set
- `uiState` — selected ID, pause flag, active tab
- `filterState` — text, eventType, userId, status, method, hasParam
- `statsState` — visible count, size, duration accumulators
- `appConfig` — persisted to `chrome.storage.local` under key `rt_config`; includes `hiddenProviders: string[]` (mirrored into a runtime `Set<string>` on load), `defaultTab`, `compactRows`, `timestampFormat` (`'absolute'|'relative'|'elapsed'`), `exportFormat` (`'json'|'csv'`), and `collapsedGroups`
- `adobeEnvState` — Adobe environment detection and configuration state (`detected`, `config`, `selectedEnv`)

`src/panel/datalayer/state.ts` — DataLayer push state (parallel structure):
- `all[]` + `map` (O(1) lookup) + `filteredIds` set + `selectedId` + `isPaused`
- `sources` (Set<DataLayerSource>) + `sourceLabels` (Map)
- `dlFilterState` — text, source, eventName, hasKey, ecommerceOnly

`syncHiddenProviders()` must be called after every provider visibility toggle — it writes the current `hiddenProviders` Set back to `AppConfig` via `updateConfig()`.

### Provider Filter Popover

`#provider-popover` is an absolutely-positioned popover opened by `#btn-providers` in the toolbar (similar pattern to `#settings-popover`). It contains `#provider-group-list` with grouped provider pills from `src/panel/components/provider-bar.ts`.

Provider groups are defined in `src/shared/provider-groups.ts` (9 groups: Analytics, Tag Manager, Marketing, Session Replay, A/B Testing, Visitor Identification, Customer Engagement, CDP, Adobe Stack). Each group has session-only collapse and per-group All/None buttons. Hidden provider state persists across DevTools restarts via `AppConfig.hiddenProviders`.

### Adobe Environment Switcher

`src/panel/components/adobe-env-switcher.ts` detects Adobe Launch/Tags on the inspected page, lets the user configure DEV/ACC/PROD URLs per hostname, and switches environments via network-level redirects:
- Panel sends `SET_ADOBE_REDIRECT` / `CLEAR_ADOBE_REDIRECT` / `GET_ADOBE_REDIRECT` to background; background also handles `CLEAR_COOKIES` for cookie deletion
- Background uses `chrome.declarativeNetRequest.updateDynamicRules` (rule ID `1001`)
- Config stored in `chrome.storage.local` under key `rt_adobe_env`
- On init, if config shows non-prod but no active rule exists (e.g. after browser restart), the rule is automatically re-applied

### CMP detection

`src/shared/cmp-detection.ts` contains scripts evaluated in the inspected page's main world via `chrome.devtools.inspectedWindow.eval()`. Detects and reads consent state from OneTrust, UserCentrics, Cookiebot, CookieYes, Didomi, iubenda, and generic TCF. Also provides `ACCEPT_ALL_SCRIPT` and `REJECT_ALL_SCRIPT` for consent override.

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


## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests (network or datalayer based on active view) |
| `Ctrl+F` | Focus search input (network or datalayer based on active view) |
| `↑ / ↓` | Navigate list |
| `Home` / `Cmd+↑` | Jump to first item |
| `End` / `Cmd+↓` | Jump to last item |
| `Esc` | Clear search / close detail panel / close popovers |

## Localization

All UI strings are in **English (en-US)**. Keep this consistent when adding UI text.
