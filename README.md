# 🐉 TagDragon

<div align="center">

**The dragon that sees every tag. Chrome DevTools extension for capturing and decoding marketing/analytics tracking requests.**

[![Chrome Extension Version](https://img.shields.io/badge/version-1.3.1-blue.svg)](https://github.com/yourusername/TagDragon)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-88+-brightgreen.svg)](https://www.google.com/chrome/)

*Manifest V3 • TypeScript • Rollup • Tailwind CSS*

</div>

---

## Overview

**TagDragon v1.3.1** is a Chrome DevTools extension that captures network requests from analytics and marketing platforms, decodes them into human-readable format, and provides advanced filtering and search capabilities.

### Key Features

- **Real-time Request Capture** — Monitor tracking requests as they happen
- **Multi-Provider Support** — Decode requests from 15 tracking platforms
- **Provider Filter Popover** — Filter by provider via a toolbar icon; hidden providers persist across restarts
- **Search Filtering** — Filter requests by URL, parameter name/value, or provider name
- **Active Filter Chips** — Visual chips for active filters (hidden providers, search text, etc.) with one-click removal
- **Detailed Analysis** — View decoded parameters, query strings, POST bodies, headers, and responses
- **Export** — Export captured requests as JSON
- **Adobe Environment Switcher** — Switch between DEV/ACC/PROD Adobe Launch environments using network-level redirects
- **Performance Optimized** — Efficient handling of large request volumes with auto-pruning
- **Keyboard Shortcuts** — Power-user friendly navigation

## Installation

### Development

```bash
git clone https://github.com/yourusername/TagDragon.git
cd TagDragon
npm install
npm run build
```

Then open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `TagDragon` directory. Open DevTools on any page to see the **TagDragon** tab.

### Development Mode

```bash
npm run dev
```

Runs CSS and JS watchers concurrently. After code changes, reload the extension at `chrome://extensions/` and reopen the DevTools panel.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch CSS + JS |
| `npm run build` | Production build (minified CSS + JS) |
| `npm run build:css` | CSS only |
| `npm run build:js` | JS only |
| `npm run clean` | Delete `dist/*` |

## Project Structure

```
TagDragon/
├── src/                        # TypeScript source
│   ├── background/             # Service worker (declarativeNetRequest rules)
│   ├── devtools/               # DevTools registration + network capture
│   ├── panel/                  # Panel UI
│   │   ├── components/         # UI components (provider-bar, filter-bar, detail-pane, adobe-env-switcher, …)
│   │   ├── tabs/               # Detail tabs (decoded, query, POST, headers, response)
│   │   ├── utils/              # DOM helpers, formatting, filtering, categorization
│   │   ├── state.ts            # Centralized state
│   │   ├── theme.ts            # Dark/light theme
│   │   └── index.ts            # Panel controller
│   ├── providers/              # Tracking provider implementations
│   │   ├── google/             # GA4, UA, GTM, Google Ads
│   │   ├── adobe/              # Adobe Analytics, AEP WebSDK
│   │   ├── meta/               # Meta Pixel
│   │   ├── microsoft/          # Bing Ads
│   │   └── …                   # Hotjar, Tealium, LinkedIn, Sklik, DV360, Criteo, Scorecard
│   ├── shared/                 # Constants, parameter categories, provider groups
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets (HTML, icons)
├── styles/input.css            # Tailwind CSS source
├── dist/                       # Build output — never edit manually
├── manifest.json
├── rollup.config.js
└── tailwind.config.js
```

## Supported Providers

| Provider | URL Pattern |
|----------|-------------|
| **Google Analytics 4** | `google-analytics.com/g/collect` |
| **Google Analytics UA** | `google-analytics.com/collect` |
| **Google Tag Manager** | `googletagmanager.com/gtm.js`, `gtag/js` |
| **Google Ads** | `googleads.g.doubleclick.net/pagead/…` |
| **Adobe Analytics** | `sc.omtrdc.net`, `metrics.*.com` |
| **Adobe AEP WebSDK** | `*.adobe.io/*` |
| **Meta Pixel** | `connect.facebook.net` |
| **Hotjar** | `static.hotjar.com` |
| **Tealium** | `tags.tiqcdn.com` |
| **LinkedIn** | `linkedin.com/insight` |
| **Seznam Sklik** | `c.seznam.cz/retargeting`, `h.seznam.cz` (excl. `/sid`) |
| **Microsoft Bing Ads** | `bat.bing.com` |
| **DV360** | `doubleclick.net` (excl. Google Ads paths) |
| **Criteo** | `*.criteo.com` |
| **Scorecard** | `scorecardresearch.com` |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests |
| `Ctrl+F` | Focus search input |
| `↑ / ↓` or `j / k` | Navigate request list |
| `Home / End` | Jump to first / last request |
| `Esc` | Close detail panel |

## UI Overview

### Toolbar

- **⏸ Pause/Resume** — temporarily stop capturing
- **⇅ Sort Order** — toggle oldest/newest first
- **↩ Wrap Values** — wrap long parameter values
- **📑 Auto-expand** — auto-expand detail sections on select
- **⚙ Provider Filter** — opens a popover to show/hide individual providers grouped by category; hidden providers persist across DevTools restarts
- **⚙ Settings** — performance settings, keyboard shortcuts, theme

All toolbar settings are persisted to `chrome.storage.local`.

### Filter Bar

Appears below the toolbar when active filters are in effect. Shows removable chips for:
- Text search (`"sklik"`)
- Hidden providers (`GA4 hidden`)

### Detail Tabs

1. **Decoded** — human-readable parsed parameters, grouped into collapsible categories
2. **Query** — raw URL query string parameters
3. **POST** — POST body data
4. **Headers** — request/response headers
5. **Response** — response body (lazy-loaded)

### Adobe Environment Switcher

Detects the Adobe Launch/Tags library loaded on the inspected page and lets you switch between DEV/ACC/PROD environments. Uses Chrome's `declarativeNetRequest` API for network-level URL redirection — the redirect persists across page navigations and browser restarts. Configuration is stored per hostname.

## Architecture

### Request Flow

```
chrome.devtools.network.onRequestFinished
  └─ network-capture.ts — match provider, parse POST body, call parseParams()
       └─ panel-bridge.ts — sendMessage to panel (heavy data stored by ID, fetched lazily)
            └─ panel/index.ts — add to state, batch DOM update via requestAnimationFrame
```

### Provider Interface

```typescript
interface Provider {
  name: string;
  color: `#${string}`;
  pattern: RegExp;
  parseParams(url: string, postBody: unknown): Record<string, string | undefined>;
}
```

`getParams(url, postBody)` in `src/providers/url-parser.ts` merges URL query params and POST body (URLencoded or JSON) into one flat object for use inside `parseParams`.

Provider order in `src/providers/index.ts` matters — first match wins.

### Adobe Environment Redirect

```
Panel (adobe-env-switcher.ts)
  └─ chrome.runtime.sendMessage SET_ADOBE_REDIRECT
       └─ background/index.ts — declarativeNetRequest.updateDynamicRules (rule ID 1001)
            └─ chrome redirects all matching script requests at network level
```

## Contributing

To add a new provider:

1. Create a file in `src/providers/` (or a subdirectory)
2. Implement the `Provider` interface
3. Import and add to `PROVIDERS` in `src/providers/index.ts` — place more specific patterns before broader ones
4. Optionally assign the provider to a group in `src/shared/provider-groups.ts`
5. Build and test with real tracking requests

### Code Style

- 2-space indentation, single quotes, semicolons, trailing commas
- DOM variables: `$` prefix (`$list`, `$envApply`)
- Constants: `SCREAMING_SNAKE_CASE`
- Section headers: `// ─── SECTION NAME ─────`
- All UI strings in **Czech (cs-CZ)**

## License

ISC
