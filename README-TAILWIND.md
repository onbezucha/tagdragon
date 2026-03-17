# Tailwind CSS - Dokumentace

> **TL;DR:** Používáme **hybridní přístup** – Tailwind utility pro layout/spacing/barvy, custom komponenty pro glassmorphism efekty a animace.

---

## 📋 Obsah

1. [Přehled](#přehled)
2. [Instalace](#instalace)
3. [Development Workflow](#development-workflow)
4. [Architektura](#architektura)
5. [Tailwind Konfigurace](#tailwind-konfigurace)
6. [Kdy použít co?](#kdy-použít-co)
7. [Struktura souborů](#struktura-souborů)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Přehled

Request Tracker používá **hybridní Tailwind + Custom CSS přístup** pro optimální výkon a udržovatelnost:

### ✅ Tailwind se používá pro:
- **Layout:** `flex`, `grid`, `items-center`, `justify-between`
- **Spacing:** `px-4`, `py-2`, `gap-2`, `mb-3`
- **Colors:** `bg-bg-1`, `text-text-0`, `border-border`
- **Typography:** `text-xs`, `font-medium`, `whitespace-nowrap`
- **Základní utility:** `rounded`, `cursor-pointer`, `select-none`

### 🎨 Custom CSS se používá pro:
- **Glassmorphism efekty:** `backdrop-filter: blur()`
- **Animace:** `@keyframes` + `animation` pravidla
- **Komplexní komponenty:** `.ppill`, `.req-row`, `.category-section`
- **Browser fallbacks:** `@supports not (backdrop-filter: ...)`
- **Hover/active stavy s custom logikou**

---

## 📦 Instalace

### Poprvé:

```bash
npm install
```

To nainstaluje `tailwindcss` jako dev dependency (viz `package.json`).

---

## ⚡ Development Workflow

### Watch mode (doporučeno pro vývoj):

```bash
npm run dev
```

Toto spustí Tailwind v **watch mode** – automaticky přegeneruje `panel.css` při každé změně HTML/JS souborů.

### Production build:

```bash
npm run build:css
```

Generuje minifikovaný `panel.css` pro produkci.

### Workflow při editaci:

1. **Změň HTML/JS** → přidej Tailwind utility classes (např. `class="flex gap-2 px-4"`)
2. Tailwind automaticky přegeneruje `panel.css` (pokud běží watch mode)
3. **Refresh extension** v `chrome://extensions/` + reload DevTools
4. Pro custom CSS změny edituj `src/input.css` → stejný proces

---

## 🏗️ Architektura

### Co je v `src/input.css`:

```css
/* 1. TAILWIND DIRECTIVES */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 2. BASE LAYER - CSS Custom Properties + Reset */
@layer base {
  :root {
    --bg0: #1a1b1e;
    --text0: #e4e6f0;
    /* ... */
  }
  
  html, body {
    @apply h-full w-full overflow-hidden;
    /* ... */
  }
}

/* 3. COMPONENTS LAYER - Custom komponenty */
@layer components {
  .ppill { /* glassmorphism + animations */ }
  .req-row { /* hover states + backdrop-filter */ }
  .category-section { /* provider-specific borders */ }
  /* ... */
}

/* 4. UTILITIES LAYER - Custom utility classes */
@layer utilities {
  .scrollbar-thin::-webkit-scrollbar { /* ... */ }
}
```

### Co se stane při build:

1. **Base layer:** Tailwind reset + naše custom properties → `panel.css`
2. **Components layer:** Vygenerované Tailwind komponenty + naše custom `.ppill`, `.req-row`, atd.
3. **Utilities layer:** Tailwind utility classes (`flex`, `px-4`, ...) + custom utilities
4. **Unused classes se PURGUJÍ** – Tailwind skenuje `*.html` a `*.js` soubory a zahrnuje pouze použité classes

### Content configuration (co Tailwind skenuje):

```js
// tailwind.config.js
content: [
  "./**/*.{html,js}"  // všechny HTML a JS soubory v projektu
]
```

---

## ⚙️ Tailwind Konfigurace

### `tailwind.config.js` - Highlights:

```js
theme: {
  extend: {
    // Barvy mapují CSS custom properties
    colors: {
      bg: {
        0: '#1a1b1e',
        1: '#22242a',
        2: '#2a2d35',
        // ...
      },
      text: {
        0: '#e4e6f0',  // primary text
        1: '#a8abbe',  // secondary text
        2: '#6b7090',  // tertiary text
        // ...
      },
      accent: {
        DEFAULT: '#4f8ef7',
        2: '#3d73e0',
      },
    },

    // Spacing scale (4px base)
    spacing: {
      1: '6px',   // space-1
      2: '10px',  // space-2
      3: '14px',  // space-3
      4: '18px',  // space-4
    },

    // Typography
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      lg: '14px',
    },

    fontFamily: {
      mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
      sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
    },
  },
}
```

### Použití v HTML:

```html
<div class="bg-bg-1 text-text-0 px-3 py-2 rounded">
  <span class="text-sm font-mono">Hello</span>
</div>
```

---

## 🤔 Kdy použít co?

### ✅ USE TAILWIND když:

```html
<!-- ✓ Layout & spacing -->
<div class="flex items-center gap-2 px-4 py-2">

<!-- ✓ Typography -->
<span class="text-xs font-medium font-mono">

<!-- ✓ Colors -->
<div class="bg-bg-2 text-text-1 border-border">

<!-- ✓ Základní stavy -->
<button class="rounded cursor-pointer select-none opacity-50">
```

### ⚠️ USE CUSTOM CSS když:

```css
/* ✗ Glassmorphism (backdrop-filter není v base Tailwind) */
.my-component {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ✗ Složité animace */
@keyframes myAnimation {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

/* ✗ Browser fallbacks */
@supports not (backdrop-filter: blur(10px)) {
  .my-component { background: var(--bg1) !important; }
}

/* ✗ Pseudo-elementy s custom logikou */
.my-component::after {
  content: '';
  background: radial-gradient(...);
}
```

### 🎯 Hybridní přístup:

```html
<!-- Tailwind pro base layout + custom class pro efekty -->
<div class="flex items-center gap-2 px-4 py-2 rounded ppill">
  <span class="text-xs font-medium">Provider</span>
</div>
```

```css
/* Custom component s Tailwind utilities */
.ppill {
  @apply flex items-center gap-1 px-2 py-1 rounded-full;
  @apply text-xs font-medium whitespace-nowrap;
  
  /* Custom glassmorphism */
  background: rgba(42, 45, 53, 0.6);
  backdrop-filter: blur(8px);
  transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 📁 Struktura souborů

```
/
├── src/
│   └── input.css          # ← SOURCE SOUBOR (edituj tento!)
│                          #   Tailwind directives + custom CSS
│
├── panel.css              # ← GENEROVANÝ SOUBOR (NEDITOVAT!)
│                          #   Výstup z Tailwind build
│
├── tailwind.config.js     # ← Konfigurace Tailwind theme
│                          #   Barvy, spacing, fonts, atd.
│
├── panel.html             # ← HTML používá classes z panel.css
├── devtools.js            # ← JS logika
└── package.json           # ← npm scripts (dev, build:css)
```

### ⚠️ DŮLEŽITÉ:
- **NIKDY nedituj `panel.css` ručně!** – bude přepsán při každém build
- **Všechny změny dělej v `src/input.css`** a nech Tailwind vygenerovat output
- **Custom komponenty píš do `@layer components { ... }`** pro správné ordering

---

## 🔧 Troubleshooting

### ❌ Moje Tailwind classes nefungují

**Příčina:** Classes nejsou v `content` scope nebo nejsou použity v HTML/JS.

**Řešení:**
1. Zkontroluj `tailwind.config.js` → `content: ["./**/*.{html,js}"]`
2. Ujisti se, že class je použita v `panel.html` nebo `panel.js`
3. Spusť `npm run build:css` znovu
4. Zkontroluj `panel.css` – je tam ta class?

### ❌ Změny v `src/input.css` se neprojevují

**Příčina:** Watch mode neběží nebo extension není refreshnutý.

**Řešení:**
1. Běží `npm run dev`? Zkontroluj terminál
2. Po build refreshni extension: `chrome://extensions/` → klik na reload icon
3. Zavři a otevři DevTools (F12) znovu

### ❌ `backdrop-filter` nefunguje

**Příčina:** Prohlížeč nepodporuje `backdrop-filter`.

**Řešení:**
- Fallback je automaticky přidán v `src/input.css`:

```css
@supports not (backdrop-filter: blur(10px)) {
  .my-component {
    background-color: var(--bg1) !important;
  }
}
```

### ❌ Custom properties (`--bg0`, `--text0`) nejsou definovány

**Příčina:** CSS custom properties jsou definovány v `@layer base` v `src/input.css`.

**Řešení:**
- Zkontroluj, že `@layer base` obsahuje `:root { --bg0: ...; }`
- Nebo použij Tailwind classes přímo: `bg-bg-0` namísto `var(--bg0)`

### ❌ `npm run dev` končí s chybou "Cannot find module 'tailwindcss'"

**Příčina:** `node_modules` nejsou nainstalovány.

**Řešení:**
```bash
npm install
```

### ❌ CSS je příliš velký (performance issue)

**Příčina:** Tailwind zahrnuje unused utility classes.

**Řešení:**
1. Použij production build: `npm run build:css`
2. Ujisti se, že `content` v `tailwind.config.js` je správně nastavený
3. Tailwind automaticky purguje unused classes v production mode (minify)

---

## 📚 Další zdroje

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Tailwind Configuration](https://tailwindcss.com/docs/configuration)
- [Using with Chrome Extensions](https://tailwindcss.com/docs/installation/using-postcss)

---

## 💡 Tipy & Triky

### Rychlá customizace barev:

```js
// tailwind.config.js
colors: {
  myblue: '#1e40af',  // nyní můžeš použít: bg-myblue, text-myblue, border-myblue
}
```

### Custom utility class:

```css
/* src/input.css */
@layer utilities {
  .text-shadow-sm {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}
```

### Debug mode (zobraz všechny classes):

```html
<!-- Přidej do <html> tagu v panel.html -->
<html class="debug-screens">
```

Pak v `tailwind.config.js`:

```js
plugins: [
  require('@tailwindcss/debug-screens'),  // npm install -D @tailwindcss/debug-screens
]
```

---

**Happy coding!** 🚀 Pokud máš dotazy, checkni [CLAUDE.md](./CLAUDE.md) pro project overview.
