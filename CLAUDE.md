# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Request Tracker v2.0.0** is a Chrome DevTools extension (Manifest V3) that captures and decodes network requests from marketing/analytics tracking services. It displays decoded tracking data in a DevTools panel.

The project uses **Rollup** to bundle three monolithic root-level entry points (`background.js`, `devtools.js`, `panel.js`) into the `dist/` directory. CSS is built using Tailwind CSS with a hybrid approach combining utility classes, inline styles from `public/panel.html`, and custom CSS from `styles/input.css`.

Supported providers (15 total): Google Analytics 4, Universal Analytics, Google Tag Manager, Meta Pixel, Hotjar, Tealium, Adobe Analytics, Adobe Launch, Adobe Experience Platform Web SDK, LinkedIn Insight, Seznam Sklik, Bing Ads, Doubleclick/DV360, Criteo, Scorecard Research.

## Development

**First-time setup:**
1. Run `npm install` to install dependencies
2. Run `npm run dev` in a separate terminal (runs CSS and JS build in watch mode)

**To load the extension:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this directory
4. Open DevTools (F12) → navigate to "Request Tracker" panel

After editing any JS/HTML files, go to `chrome://extensions/` and click the refresh icon on the extension card, then close and reopen DevTools. CSS changes rebuild automatically if watch mode is running.

## NPM Scripts

```bash
npm install              # First-time setup: installs dependencies
npm run dev              # Development: concurrently runs watch:css and watch:js
npm run watch:css        # Tailwind: watch mode, rebuilds dist/panel.css on changes
npm run watch:js         # Rollup: watch mode, rebuilds bundled JS files on changes
npm run build            # Production: runs build:css then build:js
npm run build:css        # Tailwind: minified build to dist/panel.css
npm run build:js         # Rollup: minified builds to dist/
npm run clean            # Deletes dist/* contents (rm -rf dist/*)
```

## CSS Build Process

The project uses **Tailwind CSS** with a hybrid approach combining utility classes, inline CSS, and custom CSS.

### File Structure

- **Inline CSS Source:** `public/panel.html` — contains ~880 lines of static CSS in `<style>` block for layout and structure
- **Tailwind CSS Source:** `styles/input.css` — 771 lines of custom CSS and @layer directives for dynamically-created elements
- **Config:** `tailwind.config.js` — Tailwind theme customization and content paths
- **Output:** `dist/panel.css` — generated file (auto-generated, never edit directly)

### How It Works

1. Tailwind CLI scans content paths: `./public/**/*.html`, `./panel.js`
2. Generates optimized CSS with used classes only
3. Includes custom CSS from `styles/input.css` (@layer directives for components and utilities)
4. Outputs final compiled CSS to `dist/panel.css`

### Theme Customization

`tailwind.config.js` extends Tailwind with project-specific values:
- **Colors:** Dark theme palette (bg-0/1/2/3, text-0/1/2/3, accent, provider brand colors)
- **Spacing:** sp-1 (4px), sp-2 (8px), sp-3 (12px), sp-4 (16px), sp-5 (20px), sp-6 (24px)
- **Font sizes:** 2xs (10px), xs (11px), sm (12px), base (13px), lg (14px)
- **Fonts:** IBM Plex Mono (monospace), IBM Plex Sans (default)
- **Line heights:** tight (1.5), base (1.6), relaxed (1.7)
- **Border radius:** sm (3px), DEFAULT (6px), lg (8px), full (999px)
- **Backdrop blur:** Extended values for glassmorphism effects
- **CSS custom properties:** --font-mono, --font-sans, --radius-sm, --radius, --radius-lg, --ease

## Build Architecture

**Rollup Configuration** (`rollup.config.js`):

```
Input (Root) → Output (dist/)
background.js → dist/background.js
devtools.js → dist/devtools.js
panel.js → dist/panel.js
```

- Format: IIFE (Immediately Invoked Function Expression)
- Plugins: `@rollup/plugin-node-resolve`, `@rollup/plugin-commonjs`
- Sourcemaps: enabled in dev mode, disabled in production
- Watch mode: `npm run watch:js` or `npm run dev`

The root-level `background.js`, `devtools.js`, and `panel.js` are the **entry points** bundled into the `dist/` directory by Rollup.

## Project Structure

```
request-tracker/
├── manifest.json                 # Chrome extension manifest (V3)
├── package.json                  # v2.0.0, type: module
├── rollup.config.js              # Rollup bundler configuration
├── tailwind.config.js            # Tailwind CSS configuration
│
├── public/
│   ├── devtools.html             # DevTools bootstrap page (loads dist/devtools.js)
│   ├── panel.html                # Main panel UI (1120 lines, includes inline CSS)
│   ├── icons/                    # Extension icons (16x16, 48x48, 128x128)
│   └── fonts/                    # IBM Plex Mono & Sans (woff2)
│
├── background.js                 # ⭐ Entry point — Service Worker (41 lines)
├── devtools.js                   # ⭐ Entry point — DevTools layer (491 lines)
├── panel.js                      # ⭐ Entry point — UI Controller (1848 lines)
│
├── styles/
│   └── input.css                 # Tailwind CSS source (771 lines)
│
└── dist/                         # Generated build output (in .gitignore)
    ├── background.js
    ├── devtools.js
    ├── panel.js
    └── panel.css
```

## Active Component Architecture

### 1. `background.js` (41 lines) — Service Worker

Minimal service worker that intercepts requests from other extensions via the `chrome.webRequest` API and forwards them to the DevTools layer.

### 2. `devtools.js` (491 lines) — DevTools Integration Layer

Registers the DevTools panel and manages network request interception and decoding:

- Listens to `chrome.devtools.network.onRequestFinished` for network requests
- Matches URLs against provider regex patterns (15 providers defined inline)
- Parses request/response data using provider-specific `parseParams()` methods
- Forwards decoded results to panel via `panelWindow.receiveRequest()`
- Buffers early-arriving requests if panel hasn't opened yet

**Provider System:** 15 providers with `name`, `color`, `pattern` (RegExp), and `parseParams(url, postBody)` method.

### 3. `panel.js` (1848 lines) — UI Controller

Main UI controller managing state and rendering the DevTools panel:

- **State:** `allRequests`, `filters` (search, eventType, userId, status, method, hasParameter), `selectedRequest`, `paused`
- **Request List:** Two-line flex layout — primary line (provider dot + name + EXT badge + event + timestamp), secondary line (status + method + size + duration)
- **Detail Pane:** 5 horizontal tabs (Decoded, Query, POST, Headers, Response) with lazy rendering and auto-hidden empty tabs
- **Filtering:** Search (debounced 180ms), event type, HTTP status, HTTP method, user ID, has parameter (via popover with submenus)
- **Provider Bar:** Pills with request counts + "All" / "None" buttons
- **Features:** Draggable splitter, status bar (count/size/avg response time), parameter categorization, copy-to-clipboard, provider brand colors, special Adobe renderers
- **Keyboard Shortcuts:**
  - `Ctrl+L` — Clear all requests
  - `Ctrl+F` — Focus search
  - `Ctrl+Shift+F` — Add filter
  - `↑/↓` or `j/k` — Navigate request list
  - `Esc` — Close detail pane

**Parameter Categorization:**
- Universal categories: Page Info, Campaign, Technical, Event, User, Ecommerce, etc.
- Provider-specific categories with brand colors
- Adobe Events rendered as bullet lists, Adobe Products as tables

### 4. `public/panel.html` (1120 lines)

Main UI template with ~880 lines of inline CSS defining static layout and structure. Contains the DevTools panel DOM skeleton that is populated dynamically by `panel.js`.

## Data Flow

```
1. Extension Requests
   → chrome.webRequest.onBeforeSendHeaders (background.js)
   → chrome.runtime.sendMessage → devtools listener

2. Network Requests
   → chrome.devtools.network.onRequestFinished (devtools.js)
   → matchProvider() + parseParams()
   → categorizeParams()
   → panelWindow.receiveRequest()

3. Panel Processing (panel.js)
   → State update: allRequests.push(request)
   → applyFilters() → renderRequestList()
   → renderDetailPane() with 5 tabs
   → UI rendered in DevTools panel
```

## UI & Localization

- All UI strings and code comments are in **Czech (cs-CZ)**
- Dark theme using CSS custom properties (--bg-0, --text-1, etc.)
- Glassmorphism effects on category sections and filter pills
- Radar animation in empty state
- Status bar at bottom with request count, total size, average response time

## Filter System

Advanced filter popover with submenu system:
- **Event Type** filter (dropdown submenu)
- **HTTP Status** filter (dropdown submenu)
- **HTTP Method** filter (dropdown submenu)
- **User ID** filter (with submenu)
- **Has Parameter** filter (with submenu)
- **Settings popover** with "Reset all filters" button

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "permissions": ["webRequest", "storage"],
  "host_permissions": ["<all_urls>"],
  "devtools_page": "public/devtools.html"
}
```

## Dependencies

```json
{
  "@rollup/plugin-commonjs": "^25.0.7",
  "@rollup/plugin-node-resolve": "^15.2.3",
  "concurrently": "^8.2.2",
  "rollup": "^4.9.6",
  "tailwindcss": "^3.4.1"
}
```

## Key Notes for Development

1. **Active files to edit:** `background.js`, `devtools.js`, `panel.js` (root), `public/panel.html`, `styles/input.css`
2. **CSS workflow:** Edit `styles/input.css` or `public/panel.html` inline styles, never edit `dist/panel.css` directly
3. **Build must run:** Tailwind CSS compilation is mandatory; the extension will not work without compiled CSS
4. **Watch mode:** Keep `npm run dev` running during development for automatic rebuilds
5. **Extension reload:** After JS/HTML changes, refresh extension at `chrome://extensions/` and reopen DevTools
6. **Localization:** All UI strings are in Czech; maintain this consistency when modifying UI text
