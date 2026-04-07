# Tooltip Implementation Plan — Custom Tooltip System for TagDragon Header

## Understanding Summary

TagDragon uses `title=""` attributes on ~23 buttons/elements in the header and toolbars for accessibility labels. However, **native browser tooltips are suppressed by Chrome in the DevTools panel iframe context** — they never appear. Simultaneously, `src/panel/index.ts` already writes dynamic `data-tooltip` values on ~8 elements (pause button, quick-action toggles, export button, etc.), but **no JS or CSS reads them** — this is dead code.

The goal: build a custom tooltip system that reads `data-tooltip` attributes and displays them **instantly** (zero delay) on hover.

---

## Approach A: Single Shared Tooltip Element (Event Delegation) ⭐ Recommended

### How it works

One `<div>` is created once and appended to `<body>`. A single delegated `pointerenter`/`pointerleave` listener on `document` checks if the hovered element (or ancestor) has a `data-tooltip` attribute. If yes, position the shared tooltip and show it. On leave or pointerdown, hide it.

### Business Analysis
| Pros | Cons |
|------|------|
| Minimal DOM footprint (1 element) | Slightly more complex positioning logic |
| Already matches existing `data-tooltip` writes in `index.ts` | — |
| Consistent look & feel across entire panel | — |
| Zero-delay feels native and professional | — |
| Easy to extend with multi-line, keyboard shortcuts, etc. | — |

### Technical Analysis
| Aspect | Detail |
|--------|--------|
| **Complexity** | Low — ~60 lines of TypeScript |
| **Performance** | Excellent — single event delegation, no per-element listeners, no DOM creation on hover |
| **Positioning** | `position: fixed` relative to viewport; flip below→above on overflow |
| **Dependencies** | None — pure DOM API |
| **Files to create** | `src/panel/utils/tooltip.ts` |
| **Files to modify** | `styles/input.css`, `public/panel.html`, `src/panel/index.ts` |
| **Estimated time** | 30–45 min |

### Best suited when
You want the cleanest, most performant solution that leverages the existing `data-tooltip` code in `index.ts`.

---

## Approach B: CSS-Only Tooltip (Pseudo-element)

### How it works

Use `::after` pseudo-element on `[data-tooltip]` with `content: attr(data-tooltip)`. Show on `:hover`. Position with `position: absolute` or `fixed`.

### Business Analysis
| Pros | Cons |
|------|------|
| Zero JavaScript — pure CSS | Cannot dynamically update tooltip text from JS without touching DOM |
| Simplest possible implementation | `content: attr()` cannot show keyboard shortcut hints like "Sort: Newest first (click for oldest first)" with formatting |
| — | Overflow clipping issues inside `overflow: hidden` containers |
| — | No `pointer-events: none` — tooltip can block hover on adjacent elements |
| — | Cannot animate opacity + transform reliably across all DevTools contexts |
| — | Dynamic tooltip text (pause/resume, sort order, etc.) already set via JS `dataset.tooltip` — CSS `attr()` can read this, but multi-line or rich content is limited |

### Technical Analysis
| Aspect | Detail |
|--------|--------|
| **Complexity** | Very low — ~15 lines of CSS |
| **Performance** | Good — but browser paints pseudo-elements on every hover state change |
| **Positioning** | `position: fixed` works but edge-detection (flip) requires `@container` queries or JS |
| **Dependencies** | None |
| **Files to create** | None |
| **Files to modify** | `styles/input.css`, `public/panel.html` |
| **Estimated time** | 15 min |

### Best suited when
You want absolute minimum code and can accept limitations (no overflow-aware flipping, no rich content).

---

## Approach C: Per-Element Tooltip (Tippy.js / Floating UI)

### How it works

Use a lightweight library like [Floating UI](https://floating-ui.com/) (formerly Popper.js) or [Tippy.js](https://atomiks.github.io/tippyjs/) to manage tooltip positioning and behavior per element.

### Business Analysis
| Pros | Cons |
|------|------|
| Production-grade positioning (auto-flip, shift, etc.) | External dependency (~3-8 KB min+gzip) |
| Rich features (themes, animations, arrows, multi-line) | Overkill for simple label tooltips |
| Handles edge cases (viewport clipping, scroll) | Setup overhead |
| — | Bundle size increase for a Chrome extension |

### Technical Analysis
| Aspect | Detail |
|--------|--------|
| **Complexity** | Medium — library integration + initialization per element |
| **Performance** | Good — library is optimized, but per-instance overhead |
| **Positioning** | Best-in-class — auto-flip, auto-shift, viewport detection |
| **Dependencies** | `@floating-ui/dom` (~2.6 KB) or `tippy.js` (~7 KB) |
| **Files to create** | `src/panel/utils/tooltip.ts` (wrapper) |
| **Files to modify** | `package.json`, `styles/input.css`, `public/panel.html`, `src/panel/index.ts` |
| **Estimated time** | 1–2 hours |

### Best suited when
You plan to add more complex popovers, rich tooltips with HTML content, or need pixel-perfect placement in cramped UI areas.

---

## Recommendation: **Approach A — Single Shared Tooltip Element**

This is the clear winner because:

1. **The JS code already writes `data-tooltip` dynamically** (8 locations in `index.ts`) — no new pattern needed
2. **Zero external dependencies** — keeps the extension lean
3. **Instant display** — `pointerenter` fires immediately, no delay
4. **Event delegation** — one listener handles all 23+ elements, no per-button setup
5. **Matches the existing redesign spec** (`docs/ui-redesign-spec.md` Phase 1)

---

## Detailed Implementation Plan

### Step 1: Create `src/panel/utils/tooltip.ts`

New file — the custom tooltip engine:

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP SYSTEM
// Single shared tooltip element, event delegation on document.
// Reads data-tooltip attributes and positions the tooltip instantly.
// ═══════════════════════════════════════════════════════════════════════════

let tooltipEl: HTMLElement | null = null;
let currentTarget: HTMLElement | null = null;

/**
 * Initialize the tooltip system.
 * Creates the shared tooltip DOM element and attaches delegated event listeners.
 */
export function init(): void {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip-popup';
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);

  // Capture phase for early interception before child handlers
  document.addEventListener('pointerenter', handleEnter, true);
  document.addEventListener('pointerleave', handleLeave, true);
  document.addEventListener('pointerdown', handleDismiss, true);
}

function handleEnter(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;

  const text = target.dataset.tooltip;
  if (!text) return;

  currentTarget = target;
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  positionTooltip(target);
}

function handleLeave(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;

  // Only hide if we're leaving the current tooltip target
  if (target === currentTarget) {
    hideTooltip();
  }
}

function handleDismiss(_e: Event): void {
  hideTooltip();
}

function hideTooltip(): void {
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
  currentTarget = null;
}

function positionTooltip(target: HTMLElement): void {
  if (!tooltipEl) return;

  const rect = target.getBoundingClientRect();
  const tRect = tooltipEl.getBoundingClientRect();

  // Default: below the element, horizontally centered
  let top = rect.bottom + 6;
  let left = rect.left + (rect.width - tRect.width) / 2;

  // Horizontal overflow protection
  if (left < 4) left = 4;
  if (left + tRect.width > window.innerWidth - 4) {
    left = window.innerWidth - tRect.width - 4;
  }

  // Vertical flip if tooltip would overflow bottom
  if (top + tRect.height > window.innerHeight - 4) {
    top = rect.top - tRect.height - 6;
  }

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}
```

**Key design decisions:**
- `pointerenter`/`pointerleave` with **capture phase** (`true`) — fires immediately, before any child element can steal the event
- `pointerdown` dismissal — tooltip disappears on click so it doesn't overlap with popovers
- `closest('[data-tooltip]')` — handles cases where the pointer enters a child `<svg>` or `<i>` inside the button
- `currentTarget` tracking — prevents flickering when pointer moves between children of the same tooltip element
- `position: fixed` — immune to any parent `transform` or `overflow: hidden`

---

### Step 2: Add CSS to `styles/input.css`

Add inside the `@layer components { ... }` block (before the closing `}` at line ~925):

```css
  /* ═══════════════════════════════════════════════════════════════════════════
       CUSTOM TOOLTIP (replaces native title="" — suppressed in DevTools)
       ═══════════════════════════════════════════════════════════════════════════ */

  .tooltip-popup {
    position: fixed;
    z-index: 10000;
    padding: 4px 8px;
    background-color: var(--bg-3);
    color: var(--text-0);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.4;
    pointer-events: none;
    white-space: nowrap;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    animation: tooltipFadeIn 80ms var(--ease);
  }

  @keyframes tooltipFadeIn {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }
```

**Key design decisions:**
- `animation: 80ms` — intentionally short to feel instant, not sluggish
- `max-width: 280px` + `text-overflow: ellipsis` — prevents ultra-wide tooltips for long dynamic text (e.g., sort button state)
- `pointer-events: none` — tooltip never blocks interaction with elements beneath it
- `z-index: 10000` — above all popovers and overlays
- Uses existing CSS variables (`--bg-3`, `--text-0`, `--border`, `--ease`) — automatic dark/light theme support

---

### Step 3: Migrate `title=""` → `data-tooltip=""` in `public/panel.html`

**23 replacements** across 3 sections. All are in the header area (rows 1 and 2).

#### 3.1 Global Tab Bar (Row 1) — 9 elements

| Line | Element | Current | New |
|------|---------|---------|-----|
| 2528 | `.tab-btn[data-view="network"]` | `title="Network requests"` | `data-tooltip="Network requests"` |
| 2532 | `.tab-btn[data-view="datalayer"]` | `title="DataLayer pushes"` | `data-tooltip="DataLayer pushes"` |
| 2540 | `#adobe-env-badge` | `title="Adobe environment"` | `data-tooltip="Adobe environment"` |
| 2547 | `#btn-clear-cookies` | `title="Delete all cookies on this site"` | `data-tooltip="Delete all cookies on this site"` |
| 2550 | `#btn-consent` | `title="Cookie Consent"` | `data-tooltip="Cookie Consent"` |
| 2555 | `#btn-theme-toggle` | `title="Toggle light/dark mode"` | `data-tooltip="Toggle light/dark mode"` |
| 2559 | `#btn-clear-all` | `title="Clear all requests (Ctrl+L)"` | `data-tooltip="Clear all requests (Ctrl+L)"` |
| 2562 | `#btn-settings` | `title="Filters &amp; settings"` | `data-tooltip="Filters &amp; settings"` |
| 2565 | `#btn-info` | `title="About TagDragon"` | `data-tooltip="About TagDragon"` |

#### 3.2 Network Context Toolbar (Row 2) — 8 elements

| Line | Element | Current | New |
|------|---------|---------|-----|
| 2584 | `#btn-quick-sort` | `title="Sort: Newest first"` | `data-tooltip="Sort: Newest first"` |
| 2587 | `#btn-quick-wrap` | `title="Wrap long values"` | `data-tooltip="Wrap long values"` |
| 2590 | `#btn-quick-expand` | `title="Auto-expand"` | `data-tooltip="Auto-expand"` |
| 2593 | `#btn-quick-compact` | `title="Compact list"` | `data-tooltip="Compact list"` |
| 2597 | `#btn-providers` | `title="Provider filter"` | `data-tooltip="Provider filter"` |
| 2601 | `#btn-export` | `title="Export as JSON"` | `data-tooltip="Export as JSON"` |
| 2606 | `#btn-pause` | `title="Pause capture"` | `data-tooltip="Pause capture"` |
| 2621 | `#btn-clear-filter` | *(no title — add one)* | `data-tooltip="Clear filter"` |

#### 3.3 DataLayer Context Toolbar (Row 2) — 5 elements

| Line | Element | Current | New |
|------|---------|---------|-----|
| 2629 | `#dl-filter-source` | `title="Filter by source"` | `data-tooltip="Filter by source"` |
| 2638 | `#dl-push-count` | `title="Total pushes received by panel"` | `data-tooltip="Total pushes received by panel"` |
| 2640 | `#dl-btn-export` | `title="Export DataLayer"` | `data-tooltip="Export DataLayer"` |
| 2645 | `#dl-btn-pause` | `title="Pause DataLayer capture"` | `data-tooltip="Pause DataLayer capture"` |
| 3157 | `#dl-detail-close` | `title="Close detail"` | `data-tooltip="Close detail"` |

#### 3.4 Consent Panel — 1 element

| Line | Element | Current | New |
|------|---------|---------|-----|
| 2855 | `#consent-refresh` | `title="Refresh"` | `data-tooltip="Refresh"` |

**Important:** Do NOT migrate `title` attributes that are set dynamically via JS (e.g., `consent-panel.ts` lines 349/353 where `.title` is conditionally set to show "CMP API not available"). Those are informational status indicators on specific buttons inside panels, not header tooltips. They should be left as-is for now.

---

### Step 4: Initialize tooltip system in `src/panel/index.ts`

**4.1** Add import near the top (after line 10):

```typescript
import { init as initTooltip } from './utils/tooltip';
```

**4.2** Call `initTooltip()` in the `init()` function (after line 1270, before other initializations):

```typescript
async function init(): Promise<void> {
  // ...
  initTooltip();        // ← Add here — first thing after DOM is ready
  await initTheme();
  // ...
}
```

**Rationale for placement:** Tooltip system has no async dependencies. Initializing it first ensures tooltips work even if other init steps fail or take time.

---

### Step 5: Handle edge case — Dynamic tooltip text already works ✅

The existing `index.ts` code already writes `data-tooltip` dynamically. These will **automatically work** with the new tooltip system — no changes needed:

| Location | Dynamic text |
|----------|-------------|
| Line 262 | Clear button: "Clear all requests (Ctrl+L)" / "Clear all DataLayer pushes (Ctrl+L)" |
| Line 741 | Pause button: "Pause capture" / "Resume capture" |
| Line 793-807 | Clear cookies: "Deleting..." / "Deleted N cookies" / "Error" |
| Line 877 | Sort button: "Newest first (click for oldest first)" / "Oldest first (click for newest first)" |
| Line 881 | Wrap button: "Wrap values: on" / "Wrap values: off" |
| Line 885 | Expand button: "Auto-expand: on" / "Auto-expand: off" |
| Line 889 | Compact button: "Compact list: on" / "Compact list: off" |
| Line 924 | Export button: "Export as JSON" / "Export as CSV" |
| Line 1103 | DL Pause: "Pause DataLayer capture" / "Resume DataLayer capture" |

**However**, for buttons where JS sets `dataset.tooltip` dynamically, the initial HTML `title=""` must also become `data-tooltip=""` so the tooltip shows even before JS runs. The dynamic writes will overwrite the initial value.

---

### Step 6: Verify no request row native tooltips

`request-list.ts` does NOT set any `title` attributes on rows — confirmed via grep. ✅ No action needed.

---

## Complete File Change Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/panel/utils/tooltip.ts` | **CREATE** | +68 lines |
| `styles/input.css` | **MODIFY** — add `.tooltip-popup` + keyframe inside `@layer components` | +22 lines |
| `public/panel.html` | **MODIFY** — `title=""` → `data-tooltip=""` on 22 elements, add `data-tooltip` on 1 element | ~22 line edits |
| `src/panel/index.ts` | **MODIFY** — add import + `initTooltip()` call | +2 lines |

**Total:** ~114 new/modified lines across 4 files.

---

## Testing Checklist

- [ ] Hover over each of the 23 header/toolbar buttons → tooltip appears instantly
- [ ] Move mouse away → tooltip disappears immediately
- [ ] Click a button → tooltip disappears (not stuck behind popover)
- [ ] Pause button tooltip changes between "Pause capture" and "Resume capture"
- [ ] Sort button tooltip updates with current sort state
- [ ] Export button tooltip shows "Export as JSON" or "Export as CSV" per config
- [ ] Quick action toggles show "on"/"off" state in tooltip
- [ ] Clear cookies button shows "Deleting..." then "Deleted N cookies"
- [ ] Tab switch changes clear button tooltip between Network/DataLayer
- [ ] Tooltip does not overflow panel edges (horizontal or vertical)
- [ ] Tooltip works in both dark and light theme
- [ ] No native browser tooltip appears on any element
- [ ] Tooltip does not appear on elements without `data-tooltip` (e.g., request rows)
- [ ] Tooltip works when hovering over SVG icons inside buttons (delegation via `closest()`)
- [ ] `npm run build` succeeds with no errors
