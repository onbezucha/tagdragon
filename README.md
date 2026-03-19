# 🐉 TagDragon

<div align="center">

**The dragon that sees every tag. Chrome DevTools extension for capturing and decoding marketing/analytics tracking requests.**

[![Chrome Extension Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](https://github.com/yourusername/TagDragon)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-88+-brightgreen.svg)](https://www.google.com/chrome/)

*Manifest V3 • Built with Rollup & Tailwind CSS*

</div>

---

## 📋 Overview

**TagDragon v1.2.1** is a powerful Chrome DevTools extension that helps developers, marketers, and analysts debug and analyze web tracking implementations. It captures network requests from popular analytics and marketing platforms, decodes them into human-readable format, and provides advanced filtering and search capabilities.

### ✨ Key Features

- **Real-time Request Capture** - Monitor tracking requests as they happen
- **Multi-Provider Support** - Decode requests from 16+ tracking platforms
- **Advanced Filtering** - Filter by provider, event type, HTTP status, method, and custom parameters
- **Detailed Analysis** - View decoded parameters, query strings, POST bodies, headers, and responses
- **Export Functionality** - Export captured requests as JSON
- **Adobe Environment Switcher** - Switch between DEV/ACC/PROD Adobe Launch environments
- **Performance Optimized** - Efficient handling of large request volumes with auto-pruning
- **Keyboard Shortcuts** - Power-user friendly navigation and controls

## 🚀 Installation

### Development Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TagDragon.git
   cd TagDragon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `TagDragon` directory
    - Open DevTools on any page to see the "TagDragon" tab

### Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

This runs both CSS and JS watchers concurrently. After code changes, reload the extension at `chrome://extensions/` and reopen DevTools panel.

## 🛠️ Build Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development mode (watch CSS + JS) |
| `npm run build` | Production build (minified CSS + JS) |
| `npm run watch:css` | Watch CSS files only |
| `npm run watch:js` | Watch JavaScript files only |
| `npm run build:css` | Build CSS only |
| `npm run build:js` | Build JavaScript only |
| `npm run clean` | Delete dist/* contents |

## 📁 Project Structure

```
TagDragon/
├── src/                          # TypeScript source files
│   ├── providers/                # Tracking provider implementations
│   │   ├── google/              # GA4, UA, GTM
│   │   ├── adobe/               # AA, Launch, AEP WebSDK
│   │   ├── meta/                # Meta Pixel
│   │   ├── microsoft/           # Bing Ads
│   │   └── ...                  # Other providers
│   ├── panel/                    # DevTools panel logic
│   │   ├── components/          # UI components
│   │   ├── tabs/                # Detail tabs (decoded, query, etc.)
│   │   ├── utils/               # Helper functions
│   │   ├── state.ts             # State management
│   │   └── index.ts             # Panel controller
│   ├── devtools/                 # DevTools integration
│   │   ├── network-capture.ts   # Request interception
│   │   └── panel-bridge.ts      # Panel communication
│   ├── background/               # Service worker
│   ├── types/                    # TypeScript type definitions
│   └── shared/                   # Shared utilities
├── public/                       # Static assets
│   ├── icons/                   # Extension icons
│   ├── panel.html               # DevTools panel UI
│   └── devtools.html            # DevTools page
├── styles/
│   └── input.css                # Tailwind CSS source
├── dist/                         # Build output (auto-generated)
│   ├── panel.js                 # Panel bundle
│   ├── devtools.js              # DevTools bundle
│   ├── background.js            # Service worker bundle
│   └── panel.css                # CSS bundle
├── manifest.json                 # Chrome extension manifest
├── package.json                  # Project configuration
├── rollup.config.js             # Rollup bundler config
├── tailwind.config.js           # Tailwind CSS config
└── README.md                     # This file
```

## 🔌 Supported Providers

TagDragon supports the following tracking platforms:

| Provider | Pattern | Capabilities |
|----------|---------|--------------|
| **Google Analytics 4** | `google-analytics.com/g/collect` | Events, parameters, client ID |
| **Google Analytics UA** | `google-analytics.com/collect` | Events, custom dimensions |
| **Google Tag Manager** | `googletagmanager.com/gtag/js` | Container info |
| **Google Ads** | `google.com/conversion` | Conversion ID, label, event tracking |
| **Adobe Analytics** | `sc.omtrdc.net`, `metrics.*.com` | Events, eVars, props |
| **Adobe AEP WebSDK** | `*.adobe.io/*` | Experience Cloud events |
| **Meta Pixel** | `connect.facebook.net` | Pixel events, custom data |
| **Hotjar** | `static.hotjar.com` | Heatmap, session recording |
| **Tealium** | `tags.tiqcdn.com` | UDO data layer |
| **LinkedIn** | `linkedin.com/insight` | Conversion events |
| **Seznam Sklik** | `*.seznam.cz` | Campaign tracking, retargeting |
| **Microsoft Bing Ads** | `bat.bing.com` | Conversion tracking |
| **AdForm** | `adform.io` | Tracking, retargeting, order tracking |
| **DoubleClick** | `doubleclick.net` | Ad serving |
| **DV360** | `dv360.eyeota.net` | Programmatic advertising |
| **Criteo** | `*.criteo.com` | Retargeting events |
| **Scorecard** | `scorecardresearch.com` | Audience measurement |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests |
| `Ctrl+F` | Focus search input |
| `Ctrl+Shift+F` | Add new filter |
| `↑ / ↓` or `j / k` | Navigate request list |
| `Esc` | Close detail panel |

## 🎨 UI Features

### Main Interface

- **Request List** - Scrollable list of captured requests with provider badges
- **Detail Pane** - Detailed view of selected request with tabbed interface
- **Provider Bar** - Quick filter by provider type
- **Filter Bar** - Advanced filtering capabilities
- **Status Bar** - Request count, total size, and average duration

### Detail Tabs

1. **Decoded** - Human-readable parsed parameters
2. **Query** - URL query string parameters
3. **POST** - POST body data
4. **Headers** - Request/response headers
5. **Response** - Response body (if available)

### Advanced Filtering

- Filter by provider (GA4, Adobe, Meta, etc.)
- Filter by event type
- Filter by HTTP status code
- Filter by HTTP method
- Filter by presence of specific parameters
- Custom parameter filters with quick-pick suggestions

### Adobe Environment Switcher

Special feature for Adobe Launch/Tags implementations:
- Detect current environment (DEV/ACC/PROD) from loaded library
- Switch between environments using network-level redirects
- Uses Chrome's `declarativeNetRequest` API for reliable URL replacement
- Redirects persist across page navigations and browser restarts
- Per-hostname configuration storage
- Supports Adobe Tags (Launch) libraries

## 🏗️ Architecture

### Adobe Environment Redirect System

The Adobe Environment Switcher uses Chrome's `declarativeNetRequest` API to redirect requests at the network level:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User configures staging URL in panel                        │
│  2. Panel stores config in chrome.storage.local                 │
│  3. Background worker creates declarativeNetRequest rule        │
│  4. Chrome redirects ALL matching requests (network-level)      │
│  5. Rules persist and restore on browser/extension restart      │
└─────────────────────────────────────────────────────────────────┘
```

Key files:
- `background.js` - Service worker managing redirect rules
- `panel.js` - UI for environment configuration (lines ~1958-2300)

### Provider System

Providers are defined as objects with:
- `name` - Display name
- `color` - UI badge color
- `pattern` - RegExp for URL matching
- `parseParams()` - Function to extract and decode parameters

```typescript
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

Centralized state with efficient lookups:
- `allRequests` - Array of all requests
- `requestMap` - Map for O(1) lookup by ID
- `selectedId` - Currently selected request
- `isPaused` - Capture pause state
- Filters and UI preferences

### Performance Optimizations

- `requestAnimationFrame` for batched DOM updates
- Template cloning for fast row rendering
- Pre-computed search indexes
- Lazy loading for heavy data (response bodies, headers)
- Configurable max request limit with auto-pruning

## 🌐 Localization

All UI strings are currently in **Czech (cs-CZ)**. Future versions may include multi-language support.

## 🤝 Contributing

Contributions are welcome! To add a new provider:

1. Create a new file in `src/providers/` (or appropriate subdirectory)
2. Implement the `Provider` interface
3. Import and add to `PROVIDERS` array in `src/providers/index.ts`
4. Test with actual tracking requests
5. Submit a pull request

### Development Guidelines

- **Code Style**: 2-space indentation, single quotes, semicolons, trailing commas
- **TypeScript**: Strict mode enabled, no implicit any
- **Naming**: camelCase for variables/functions, PascalCase for types
- **Comments**: JSDoc for TypeScript, ASCII art section headers for JS

### Testing

Currently no automated tests are configured. Manual testing is required:
1. Build the extension: `npm run build`
2. Reload extension at `chrome://extensions/`
3. Test with pages using tracking implementations
4. Verify request capture, decoding, and UI functionality

## 📝 Code Style

This project follows strict code style guidelines:

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always used
- **Trailing commas**: Yes, in arrays and objects
- **Variables**: camelCase (`allRequests`, `selectedId`)
- **Constants**: SCREAMING_SNAKE_CASE (`PROVIDERS`, `DEFAULT_CONFIG`)
- **DOM elements**: `$` prefix (`$list`, `$detail`)
- **Private/internal**: `_` prefix (`_searchIndex`, `_rafId`)

## 📄 License

This project is licensed under the ISC License.

## 🔗 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

## 🙏 Acknowledgments

Built with:
- [Rollup](https://rollupjs.org/) - Module bundler
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

<div align="center">

**Made with ❤️ for web analytics professionals**

*Debug tracking tags like a dragon tamer*

</div>
