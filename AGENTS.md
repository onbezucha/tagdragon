# AGENTS.md

This file provides guidance for AI agents operating in this repository.

## Project Overview

**Request Tracker** is a Chrome DevTools extension (Manifest V3) that captures and decodes network requests from marketing/analytics tracking services. The project uses:
- **Rollup** for JavaScript bundling
- **Tailwind CSS** for styling
- **Vanilla JavaScript** (ES modules, no framework)

---

## Build Commands

```bash
# Install dependencies (first-time setup)
npm install

# Development - watch mode (auto-rebuild on file changes)
npm run dev

# Individual watch modes
npm run watch:css    # Tailwind CSS watch
npm run watch:js     # Rollup JS watch

# Production build
npm run build         # Full build (CSS + JS)
npm run build:css     # CSS only (minified)
npm run build:js      # JS only (minified)

# Clean build artifacts
npm run clean         # Delete dist/* contents
```

### Running a Single Component Build

```bash
# Build only CSS
npm run build:css

# Build only JS  
npm run build:js

# Rebuild specific file (manual)
npx rollup -c --input background.js
npx rollup -c --input devtools.js
npx rollup -c --input panel.js
```

### Loading the Extension

1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select project directory
5. Open DevTools (F12) → navigate to "Request Tracker" panel
6. After edits: refresh extension at `chrome://extensions/` and reopen DevTools

---

## Code Style Guidelines

### General Principles

- **Language:** English for code, Czech for UI strings and comments
- **No linter:** This project has no ESLint/Prettier configured
- **Format manually** or use VS Code's built-in formatter

### JavaScript Conventions

#### Naming Conventions
```javascript
// Variables: camelCase
const activeProviders = new Set();
const requestCount = 0;

// Constants: UPPER_SNAKE_CASE
const MAX_REQUESTS = 500;
const DEFAULT_CONFIG = {};

// Functions: camelCase (verb prefixes)
function parseParams(url, postBody) { }
function categorizeParams(decoded) { }
function renderRequestList() { }

// Classes: PascalCase (if used)
class RequestBuffer { }

// Provider configs: PascalCase with descriptive names
const PROVIDERS = [
  { name: "GA4", color: "#E8710A", pattern: /.../ }
];
```

#### Import/Export
```javascript
// This project uses IIFE format (no ES modules in root files)
// If adding ES modules, follow:
import { something } from './module.js';
export { something };
```

#### Functions
```javascript
// Prefer concise function declarations
function getParams(url, postBody) {
  // Parse URL parameters and POST body
  const params = {};
  // ... implementation
  return params;
}

// Use arrow functions for callbacks
document.querySelectorAll('.req-row').forEach((row) => {
  // handle row
});
```

#### Error Handling
```javascript
// Always use try-catch for parsing operations
function parsePostBody(postData) {
  try {
    const decoded = JSON.parse(postData);
    return decoded;
  } catch (e) {
    console.warn('[Panel] Failed to parse POST body:', e.message);
    return null;
  }
}

// Safe URL parsing
function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
```

### CSS/Styling Conventions

#### Tailwind Usage
```html
<!-- Utility classes preferred -->
<div class="flex items-center gap-2 px-4 py-2">

<!-- Custom CSS in styles/input.css for complex styles -->
<style>
  .custom-component {
    backdrop-filter: blur(8px);
  }
</style>
```

#### Custom CSS Layering (styles/input.css)
```css
/* 1. Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 2. Custom properties */
@layer base {
  :root {
    --bg-0: #1a1b1e;
    --text-0: #e4e6f0;
  }
}

/* 3. Custom components */
@layer components {
  .ppill { /* glassmorphism */ }
  .req-row { /* hover states */ }
}

/* 4. Custom utilities */
@layer utilities {
  .scrollbar-thin { /* custom scrollbar */ }
}
```

### UI String Localization

- **All UI text in Czech:** Button labels, placeholders, status messages
- **Code comments in Czech** or English (prefer Czech for consistency)

```javascript
// Good
const EMPTY_STATE = 'Žádné zachycené požadavky';
$empty.innerHTML = '<div class="empty-title">Žádné požadavky</div>';

// Avoid
const EMPTY_STATE = 'No captured requests';
```

### Provider Definition Pattern

```javascript
const PROVIDERS = [
  {
    name: "ProviderName",        // Display name
    color: "#HEXCODE",           // Brand color
    pattern: /regex\.com/,      // URL matching
    parseParams(url, postBody) { // Parameter extraction
      const p = getParams(url, postBody);
      return {
        "Key": p.value,
      };
    }
  }
];
```

### DOM Manipulation

```javascript
// Cache DOM references
const $list = document.getElementById('request-list');
const $detail = document.getElementById('detail-pane');

// Use template literals for HTML
row.innerHTML = `
  <span class="col-provider">${esc(data.provider)}</span>
  <span class="col-url">${esc(shortUrl)}</span>
`;

// Escape user content
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

## Project Structure

```
├── background.js          # Service worker (41 lines)
├── devtools.js           # DevTools integration (515 lines)
├── panel.js              # UI controller (2504 lines)
├── devtools.html         # DevTools entry
│
├── public/
│   ├── devtools.html     # Extension bootstrap
│   ├── panel.html        # Main UI template
│   └── icons/            # Extension icons
│
├── styles/
│   └── input.css         # Tailwind source
│
├── dist/                  # Build output (gitignored)
│
├── manifest.json         # Extension manifest
├── rollup.config.js      # Bundler config
├── tailwind.config.js    # CSS config
└── package.json          # Dependencies
```

---

## Key Implementation Notes

1. **Entry points:** Edit `background.js`, `devtools.js`, `panel.js` in root
2. **Never edit:** `dist/*` files (auto-generated)
3. **CSS workflow:** Edit `styles/input.css` or `public/panel.html` inline styles
4. **Build required:** Always run `npm run build` after changes
5. **Provider regex:** Test patterns against real tracking URLs before adding

---

## Testing Changes

1. Make code changes
2. Run `npm run build`
3. Go to `chrome://extensions/`
4. Click refresh on extension card
5. Close and reopen DevTools panel
6. Test the feature

There are no automated tests in this project. Manual testing is required for all changes.
