# Request Tracker

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=flat-square&logo=google-chrome)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=flat-square)](https://github.com/your-username/TagDragon/releases)
[![License](https://img.shields.io/badge/license-ISC-purple.svg?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro)

> **Chrome DevTools extension that captures and decodes network requests from marketing and analytics tracking services.**

---

## 📖 Description

Request Tracker is a powerful Chrome DevTools extension designed for developers, marketers, and analytics specialists. It captures network requests from tracking and analytics services in real-time and decodes them into a human-readable format, making it easy to understand what data is being collected without diving into raw network requests.

### Target Users
- **Developers** debugging tracking implementations
- **Marketers** verifying tag firing
- **Analytics specialists** validating data collection

### Key Benefits
- Visualize tracking data in a structured, readable format
- No more hunting through raw network requests
- Support for 15+ major analytics and marketing providers
- Filter and export captured requests for analysis

---

## ✨ Features

- **Real-time capture** of tracking requests as they happen
- **15+ provider support** including GA4, UA, GTM, Meta Pixel, Adobe Analytics, and more
- **Decoded parameters** with intelligent categorization per provider
- **Advanced filtering** by search term, event type, HTTP status, and method
- **Lazy loading** for optimal performance with large request volumes
- **Export to JSON** for further analysis
- **Memory management** with configurable request limits
- **Keyboard shortcuts** for efficient navigation

---

## 🖼️ Usage

### Main UI Components

The Request Tracker panel consists of three main sections:

1. **Request List** (left panel)
   - Lists all captured tracking requests
   - Color-coded by provider
   - Shows timestamp, method, and URL
   - Click any request to view details

2. **Detail Pane** (right panel)
   - Displays decoded parameters for selected request
   - Parameters grouped into logical categories
   - Copy individual values with one click

3. **Filter Bar** (top)
   - Search across all parameters
   - Filter by event type, HTTP status, method
   - Toggle request capture on/off

> **Note:** The UI is currently in Czech language. English localization is planned for future releases.

---

## 🚀 Installation

### Prerequisites
- Google Chrome (version 88 or higher)
- Node.js and npm installed

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-username/TagDragon.git
cd TagDragon

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked** button
4. Select the project directory
5. The extension is now installed!

### Using the Extension

1. Navigate to any website with analytics tracking
2. Open Chrome DevTools (F12 or Cmd+Option+I)
3. Click the **Request Tracker** tab in the DevTools sidebar
4. Interact with the page to capture tracking requests
5. Review decoded parameters in the detail pane

---

## 🛠️ Development

### Available Scripts

```bash
# Development mode with watch (auto-rebuild on file changes)
npm run dev

# Production build
npm run build

# Build CSS only
npm run build:css

# Build JavaScript only
npm run build:js

# Clean build artifacts
npm run clean
```

### File Structure

```
TagDragon/
├── background.js          # Service worker - handles webRequest API
├── devtools.js            # DevTools integration - bridges panel with page
├── panel.js               # Main UI controller - manages state & rendering
├── devtools.html          # DevTools entry point
├── public/
│   ├── panel.html         # Main UI template
│   ├── devtools.html      # Extension bootstrap
│   └── icons/             # Extension icons (16, 48, 128px)
├── styles/
│   └── input.css          # Tailwind CSS source
├── dist/                  # Build output (gitignored)
├── manifest.json          # Extension manifest (V3)
├── rollup.config.js       # Rollup bundler configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── package.json           # Dependencies & scripts
└── AGENTS.md              # AI agent guidelines (detailed docs)
```

### Making Changes

1. Edit source files in root directory (`background.js`, `devtools.js`, `panel.js`)
2. Edit styles in `styles/input.css` or `public/panel.html`
3. Run `npm run build` to rebuild
4. Go to `chrome://extensions/` and refresh the extension
5. Close and reopen DevTools panel to see changes

---

## 🏢 Supported Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Google Analytics 4 | ✅ | Full parameter categorization |
| Universal Analytics | ✅ | Legacy GA support |
| Google Tag Manager | ✅ | GTM container events |
| Meta Pixel (Facebook) | ✅ | Facebook tracking events |
| Adobe Analytics (Omniture) | ✅ | Classic tracking |
| Adobe Launch | ✅ | DTM/Launch events |
| Adobe Experience Platform Web SDK | ✅ | Alloy (edge domain) |
| Hotjar | ✅ | Heatmap & session recordings |
| Tealium | ✅ | Universal Tag (UT) events |
| LinkedIn Insight | ✅ | Conversion tracking |
| Seznam Sklik | ✅ | Czech advertising platform |
| Bing Ads (UET) | ✅ | Microsoft Advertising |
| Doubleclick / DV360 | ✅ | Google Campaign Manager |
| Criteo | ✅ | Retargeting events |
| Scorecard Research | ✅ | Audience measurement |

---

## 🛠️ Tech Stack

- **JavaScript:** Vanilla ES6+ (no framework dependencies)
- **Bundler:** Rollup for modular JavaScript
- **Styling:** Tailwind CSS for utility-first design
- **Extension:** Chrome Manifest V3 (service worker based)
- **Icons:** Custom SVG icons

---

## 🏗️ Build System

### Rollup Configuration

The build system uses Rollup to bundle three entry points:

- `background.js` → `dist/background.js` (service worker)
- `devtools.js` → `dist/devtools.js` (DevTools integration)
- `panel.js` → `dist/panel.js` (main UI)

All bundles output as IIFE format with source maps in development.

### Tailwind CSS Build

- Development: `tailwindcss -i styles/input.css -o dist/panel.css --watch`
- Production: `tailwindcss -i styles/input.css -o dist/panel.css --minify`

### Build Output

```bash
# After running npm run build:
dist/
├── background.js      # Minified service worker
├── devtools.js        # Minified DevTools bridge
├── panel.js           # Minified UI controller
└── panel.css          # Minified styles
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style**
   - Use English for code and Czech for UI strings
   - Follow existing naming conventions (camelCase, UPPER_SNAKE_CASE)
   - No linter configured - format manually or use VS Code formatter
   - See `AGENTS.md` for detailed style guidelines

2. **Testing**
   - Manual testing required - no automated tests yet
   - Test provider regex patterns against real tracking URLs
   - Verify changes across multiple Chrome versions

3. **Submission**
   - Fork the repository
   - Create a feature branch
   - Make your changes with clear commit messages
   - Submit a pull request with description

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

Built with ❤️ for the web analytics community.

Special thanks to all analytics providers whose documentation made this project possible.

---

<div align="center">

**[⬆ Back to Top](#request-tracker)**

Made with ❤️ by the Request Tracker team

</div>
