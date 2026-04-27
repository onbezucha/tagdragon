# TagDragon Empty State Redesign — Implementation Spec

**Version:** 1.0  
**Date:** 2025-07-09  
**Approach:** C — Dragon Quick Start (Hybrid)  
**Scope:** Network tab `#empty-state` + DataLayer tab `#dl-empty-state`

---

## 1. Design Principles

1. **Brand Presence** — TagDragon logo + name vždy viditelné, ale decentní (nenarušuje workflow)
2. **Symetrický Design Jazyk** — obě empty states sdílí stejnou vizuální strukturu a CSS třídy
3. **Feature Education** — kompaktní karty (3 sloupce) vysvětlují schopnosti nástroje
4. **Clear CTA** — reload / re-inject tlačítka jako primární akce
5. **Dragon Radar** — animovaný radar v brand barvách (gold → ember → red)

---

## 2. Visual Structure (Wireframe)

### 2.1 Network Empty State (`#empty-state`)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           [icon48.png  32×32  rounded 6px]            │
│                TagDragon                              │
│            Network Monitor                            │
│                                                      │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│     │   📡     │  │   🔍     │  │   📊     │        │
│     │ Capture  │  │  Decode  │  │  Export  │        │
│     │ 69+ tags │  │ params   │  │ JSON/CSV │        │
│     └──────────┘  └──────────┘  └──────────┘        │
│                                                      │
│         [ 🔄 Reload page ]                           │
│                                                      │
│    Navigate the page to start capturing requests     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.2 DataLayer Empty State (`#dl-empty-state`)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           [icon48.png  32×32  rounded 6px]            │
│                TagDragon                              │
│           DataLayer Inspector                         │
│                                                      │
│           [✓ GTM] [✓ Tealium] [○ Adobe] [○ Seg]      │
│                                                      │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│     │   📡     │  │   🔍     │  │   ✅     │        │
│     │ Monitor  │  │ Inspect  │  │ Validate │        │
│     │ live DL  │  │ diff+cor │  │ rules    │        │
│     └──────────┘  └──────────┘  └──────────┘        │
│                                                      │
│         [ ↻ Re-inject scripts ]                      │
│                                                      │
│     Push data to start monitoring data layer         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 3. HTML Changes

### 3.1 Network Empty State (`#empty-state`)

**File:** `public/panel.html` — replace lines 4117–4127

**Current:**
```html
<div id="empty-state">
  <div class="empty-icon">
    <svg width="40" height="40" viewBox="0 0 40 40" class="empty-radar">
      <circle cx="20" cy="20" r="16" stroke="var(--text-3)" stroke-width="1" fill="none"/>
      <circle cx="20" cy="20" r="10" stroke="var(--text-3)" stroke-width="1" fill="none" opacity="0.5"/>
      <circle cx="20" cy="20" r="4" stroke="var(--text-3)" stroke-width="1" fill="none" opacity="0.3"/>
      <line x1="20" y1="20" x2="20" y2="4" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" class="radar-sweep"/>
    </svg>
  </div>
  <div class="empty-title">Waiting for requests...</div>
  <div class="empty-subtitle">Navigate the page to capture tracking activity. Supports GA4, UA, GTM, Meta, Hotjar, Tealium, Adobe, LinkedIn, Sklik, Bing and more.</div>
</div>
```

**New:**
```html
<div id="empty-state" class="es-container">
  <!-- Brand Header -->
  <div class="es-brand">
    <img src="icons/icon48.png" class="es-logo" alt="TagDragon" width="32" height="32">
    <div class="es-brand-name">TagDragon</div>
    <div class="es-brand-subtitle">Network Monitor</div>
  </div>

  <!-- Feature Cards -->
  <div class="es-features">
    <div class="es-feature-card">
      <div class="es-feature-icon">📡</div>
      <div class="es-feature-title">Capture</div>
      <div class="es-feature-desc">Intercepts 69+ marketing &amp; analytics platforms</div>
    </div>
    <div class="es-feature-card">
      <div class="es-feature-icon">🔍</div>
      <div class="es-feature-title">Decode</div>
      <div class="es-feature-desc">Decodes tracking parameters into readable format</div>
    </div>
    <div class="es-feature-card">
      <div class="es-feature-icon">📊</div>
      <div class="es-feature-title">Export</div>
      <div class="es-feature-desc">JSON or CSV export for further analysis</div>
    </div>
  </div>

  <!-- Action Button -->
  <button id="btn-reload-page" class="es-action-btn">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
    Reload page
  </button>

  <!-- Hint -->
  <div class="empty-subtitle">Navigate the page to start capturing tracking requests</div>
</div>
```

### 3.2 DataLayer Empty State (`#dl-empty-state`)

**File:** `public/panel.html` — replace lines 4227–4277

**Current:** massive inline-styled block with `<svg>`, inline styles, `.dl-feature-card` divs, source detection, and re-inject button.

**New:**
```html
<div id="dl-empty-state" class="es-container">
  <!-- Brand Header -->
  <div class="es-brand">
    <img src="icons/icon48.png" class="es-logo" alt="TagDragon" width="32" height="32">
    <div class="es-brand-name">TagDragon</div>
    <div class="es-brand-subtitle">DataLayer Inspector</div>
  </div>

  <!-- Source Detection -->
  <div id="dl-source-detection" class="es-source-detection"></div>

  <!-- Feature Cards -->
  <div class="es-features">
    <div class="es-feature-card">
      <div class="es-feature-icon">📡</div>
      <div class="es-feature-title">Monitor</div>
      <div class="es-feature-desc">Live pushes from GTM, Tealium, Adobe, Segment</div>
    </div>
    <div class="es-feature-card">
      <div class="es-feature-icon">🔍</div>
      <div class="es-feature-title">Inspect</div>
      <div class="es-feature-desc">Diff, correlation, cumulative state, live tree</div>
    </div>
    <div class="es-feature-card">
      <div class="es-feature-icon">✅</div>
      <div class="es-feature-title">Validate</div>
      <div class="es-feature-desc">Catch missing fields or incorrect values</div>
    </div>
  </div>

  <!-- Action Button -->
  <button id="dl-btn-reinject" class="es-action-btn">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
    Re-inject scripts
  </button>

  <!-- Hint -->
  <div class="empty-subtitle">Push data to start monitoring your data layer</div>
</div>
```

---

## 4. CSS Changes

### 4.1 Replace existing empty state CSS

**File:** `public/panel.html` — inline `<style>` section

#### Remove (lines ~2395–2441):
```css
#empty-state { ... }
.empty-icon { ... }
@keyframes radarSweep { ... }
.empty-radar { ... }
.radar-sweep { ... }
.empty-title { ... }
.empty-subtitle { ... }
```

#### Remove (lines ~1370–1379):
```css
#dl-empty-state { ... }
```

#### Remove (lines ~1778–1804):
```css
.dl-feature-card { ... }
.dl-source-status-pill { ... }
.dl-source-status-pill.detected { ... }
.dl-source-status-pill.not-detected { ... }
```

### 4.2 Add new unified empty state CSS

**File:** `public/panel.html` — inline `<style>` (add where removed CSS was, around line 2395)

```css
/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE — Unified for Network & DataLayer
   ═══════════════════════════════════════════════════════════════════════════ */

.es-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 20px;
  color: var(--text-2);
  gap: 0;
}

/* ─── Brand Header ────────────────────────────────────────────────────── */

.es-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.es-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  margin-bottom: 6px;
  flex-shrink: 0;
  /* Subtle golden glow on dark, warm shadow on light */
  box-shadow: 0 0 12px var(--accent-glow);
}

.es-brand-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-0);
  letter-spacing: 0.3px;
  line-height: 1.3;
}

.es-brand-subtitle {
  font-size: 11px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-top: 1px;
}

/* ─── Source Detection (DL only) ──────────────────────────────────────── */

.es-source-detection {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 14px;
}

.es-source-detection:empty {
  display: none;
}

/* ─── Feature Cards ───────────────────────────────────────────────────── */

.es-features {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  max-width: 360px;
  width: 100%;
  margin-bottom: 16px;
}

.es-feature-card {
  padding: 10px 6px 8px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  text-align: center;
  transition: border-color 150ms var(--ease);
}

.es-feature-card:hover {
  border-color: var(--accent-glow);
}

.es-feature-icon {
  font-size: 16px;
  margin-bottom: 4px;
  line-height: 1;
}

.es-feature-title {
  font-weight: 600;
  font-size: 11px;
  color: var(--text-1);
  margin-bottom: 2px;
}

.es-feature-desc {
  font-size: 10px;
  color: var(--text-2);
  line-height: 1.3;
}

/* ─── Action Button ───────────────────────────────────────────────────── */

.es-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-2);
  color: var(--text-1);
  transition: all 150ms var(--ease);
  margin-bottom: 12px;
}

.es-action-btn:hover {
  background: var(--accent-muted);
  border-color: var(--accent);
  color: var(--accent);
}

.es-action-btn:active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.es-action-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ─── Subtitle (hint at bottom) ───────────────────────────────────────── */

.empty-subtitle {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
  max-width: 280px;
}

/* ─── Paused state (Network only) ─────────────────────────────────────── */

body.paused .es-container .es-brand-subtitle {
  color: var(--accent);
}

/* ─── Source status pills (DL only, reuse styles) ─────────────────────── */

.dl-source-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

.dl-source-status-pill.detected {
  background: rgba(72, 187, 120, 0.12);
  color: var(--green, #48bb78);
}

.dl-source-status-pill.not-detected {
  background: var(--bg-2);
  color: var(--text-3);
}
```

---

## 5. TypeScript Changes

### 5.1 Reload Page Button Handler

**File:** `src/panel/index.ts`

Add in the `init()` function, near the existing DL re-inject handler (around line 1422):

```typescript
// Network Reload page button (shown in empty state)
document.getElementById('btn-reload-page')?.addEventListener('click', () => {
  try {
    chrome.devtools.inspectedWindow.reload({});
  } catch {
    // fallback — should not happen in DevTools context
  }
});
```

**Note:** `chrome.devtools.inspectedWindow` is only available in DevTools pages (not in content scripts or background). The panel is a DevTools page, so this is safe. TypeScript may need `@types/chrome` or the existing type definitions already include it.

### 5.2 DL Re-inject Handler (already exists, no change needed)

The existing handler at line 1423 stays as-is — only the button moves to the new HTML structure with class `es-action-btn`, but the `id="dl-btn-reinject"` is preserved.

### 5.3 DOM References — No Changes Needed

- `DOM.empty` still references `#empty-state` ✓
- `DOM.dlEmptyState` still references `#dl-empty-state` ✓
- The `.empty-subtitle` class is reused for the bottom hint
- `body.paused #empty-state .empty-title` selector is updated to `body.paused .es-container .es-brand-subtitle`

### 5.4 Source Detection — No JS Changes Needed

The `dl-source-detection` div keeps its `id` — the existing JS in `index.ts` (lines 811–825) that creates `dl-source-status-pill` spans continues to work unchanged. Only the container changes from inline-styled `<div>` to class-based `<div class="es-source-detection">`.

---

## 6. Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `public/panel.html` (lines ~4117–4127) | **Replace** | Network empty state HTML → new brand + features + reload button |
| `public/panel.html` (lines ~4227–4277) | **Replace** | DL empty state HTML → new brand + features + re-inject button (cleaned inline styles) |
| `public/panel.html` (CSS ~2395–2441) | **Replace** | Remove old `#empty-state`, `.empty-icon`, `.radar-sweep`, `.empty-title` CSS → new `.es-*` CSS |
| `public/panel.html` (CSS ~1370–1379) | **Remove** | Old `#dl-empty-state` CSS (now covered by `.es-container`) |
| `public/panel.html` (CSS ~1778–1804) | **Remove** | Old `.dl-feature-card` and `.dl-source-status-pill` CSS → moved into unified `.es-*` CSS |
| `public/panel.html` (CSS ~37–39) | **Update** | `body.paused #empty-state .empty-title` → `body.paused .es-container .es-brand-subtitle` |
| `src/panel/index.ts` (line ~1422) | **Add** | Reload page button handler using `chrome.devtools.inspectedWindow.reload()` |

**No changes to:**
- `src/panel/utils/dom.ts` (DOM refs unchanged)
- `src/panel/state.ts` (state logic unchanged)
- `styles/input.css` (no Tailwind changes needed)
- Build config, providers, or any other TS files

---

## 7. Migration Checklist

1. [ ] **Backup current HTML** — note line numbers before editing
2. [ ] **Replace CSS** — remove 3 old CSS blocks, add 1 unified block
3. [ ] **Update paused-state selector** — line ~37 in `<style>`
4. [ ] **Replace Network empty state HTML** — lines ~4117–4127
5. [ ] **Replace DL empty state HTML** — lines ~4227–4277
6. [ ] **Add reload handler** in `src/panel/index.ts`
7. [ ] **Test dark theme** — brand subtitle accent color visible
8. [ ] **Test light theme** — logo glow subtle, text readable
9. [ ] **Test paused state** — brand subtitle turns accent
10. [ ] **Test reload button** — page reloads, requests start flowing
11. [ ] **Test re-inject button** — scripts injected, pushes appear
12. [ ] **Test source detection pills** — appear correctly in DL empty state
13. [ ] **Test empty → populated transition** — empty state hides correctly when data arrives
14. [ ] **Test clear → empty transition** — empty state reappears after clear
15. [ ] **Run `npm run build`** — verify no build errors
16. [ ] **Run `npm run lint`** — verify no lint errors

---

## 8. Design Tokens Reference

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--accent` | `#F59E0B` | `#92400E` | Brand subtitle, hover states |
| `--accent-glow` | `rgba(251, 191, 36, 0.30)` | `rgba(146, 64, 14, 0.25)` | Logo box-shadow, card hover border |
| `--accent-muted` | `rgba(245, 158, 11, 0.15)` | `rgba(146, 64, 14, 0.12)` | Button hover background |
| `--bg-1` | `#1a1816` | `#FFFBF5` | Feature card background |
| `--border` | `rgba(251, 191, 36, 0.12)` | `rgba(194, 65, 12, 0.15)` | Card borders |
| `--text-0` | `#f5f0e8` | `#1F2937` | Brand name |
| `--text-1` | `#b8a89a` | `#4B5563` | Feature titles, button text |
| `--text-2` | `#7a6b5c` | `#6B7280` | Feature descriptions |
| `--text-3` | `#4d4339` | `#9CA3AF` | Bottom hint subtitle |
| `--green` | `#3ecf8e` | `#059669` | Detected source pill |
