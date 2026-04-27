# Implementation Plan: Unify DataLayer Export Button with Network Export Button

**Date:** 2025-01-XX  
**Scope:** DataLayer toolbar export button → split button with format picker  
**Files affected:** 3

---

## Current State

| | Network | DataLayer |
|---|---|---|
| **Structure** | Split button (`#export-split-btn`) with main action + dropdown chevron | Plain `<button>` with inline styles |
| **Format picker** | Dropdown menu (JSON / CSV) | None — reads shared `AppConfig.exportFormat` |
| **Tooltip** | Dynamic (`Export as JSON` / `Export as CSV`) | Static (`Export DataLayer`) |
| **CSS** | Dedicated rules in `styles/input.css` (L1254–1323) | Inline `style="..."` attribute |
| **Outside-click close** | Handled (`#export-split-btn` check) | N/A |

## Goal

DataLayer export button should be a **structurally identical** split button — same HTML pattern, same CSS classes, same dropdown behavior — with `dl-` prefixed IDs.

---

## Changes

### 1. HTML — `public/panel.html`

**Location:** Line 3822–3825 (DataLayer context toolbar)

**Before:**
```html
<button id="dl-btn-export" data-tooltip="Export DataLayer"
  style="display:flex;align-items:center;gap:4px;padding:4px 8px;font-size:12px;">
  <i data-lucide="download"></i>
  <span>Export</span>
</button>
```

**After:**
```html
<div id="dl-export-split-btn">
  <button id="dl-btn-export" data-tooltip="Export as JSON">
    <i data-lucide="download"></i>
    <span>Export</span>
  </button>
  <button id="dl-btn-export-format" data-tooltip="Change format" class="export-format-btn">
    <i data-lucide="chevron-down"></i>
  </button>
  <div id="dl-export-format-menu">
    <button data-format="json" class="export-format-option">JSON</button>
    <button data-format="csv" class="export-format-option">CSV</button>
  </div>
</div>
```

**Key decisions:**
- Wrapper ID: `dl-export-split-btn` (mirrors `export-split-btn`)
- Main button: keeps `dl-btn-export` (no handler changes needed)
- Format toggle: `dl-btn-export-format` (mirrors `btn-export-format`)
- Dropdown: `dl-export-format-menu` (mirrors `export-format-menu`)
- Format options reuse existing `.export-format-option` class (shared CSS)
- Format toggle reuses existing `.export-format-btn` class (shared CSS)
- **Remove all inline styles** — CSS handles it
- Tooltip changes from `"Export DataLayer"` → `"Export as JSON"` (dynamic, synced via JS)

### 2. CSS — `styles/input.css`

**Add one rule** after the existing `#export-split-btn` block (~L1258):

```css
/* ─── DataLayer Export Split Button ──────────────────────────────── */

#dl-export-split-btn {
  display: flex;
  gap: 0;
  position: relative;
}

#dl-export-split-btn > button:first-child {
  border-radius: 4px 0 0 4px;
}

#dl-btn-export {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
}

#dl-btn-export svg {
  width: 12px;
  height: 12px;
}
```

**Notes:**
- `.export-format-btn` and `.export-format-option` styles are already generic (no `#export-split-btn` scoping) → they work for both toolbars without changes.
- `#dl-export-format-menu` needs its own rule (the existing `#export-format-menu` is ID-specific):

```css
#dl-export-format-menu {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
  z-index: 200;
  min-width: 80px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

#dl-export-format-menu.visible {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

**Alternative (DRYer):** Convert `#export-format-menu` to a shared class `.export-format-menu` and use it on both dropdowns. This reduces duplication but requires changing the existing Network HTML/CSS too. See "Optional DRY refactor" below.

### 3. JavaScript — `src/panel/index.ts`

#### 3a. Add DataLayer format toggle handler (~L1368, right after DL export click handler)

**After the existing `dl-btn-export` click handler** (L1369–1375), add:

```typescript
// DL Export format split button
const btnDlExportFormat = document.getElementById('dl-btn-export-format');
const dlExportFormatMenu = document.getElementById('dl-export-format-menu');

btnDlExportFormat?.addEventListener('click', (e: Event) => {
  e.stopPropagation();
  dlExportFormatMenu?.classList.toggle('visible');
});

dlExportFormatMenu?.addEventListener('click', (e: Event) => {
  const target = (e.target as HTMLElement).closest('.export-format-option') as HTMLElement;
  if (!target) return;
  const format = target.dataset.format as 'json' | 'csv';
  if (format) {
    state.updateConfig('exportFormat', format);
    syncExportTooltip();
  }
  dlExportFormatMenu?.classList.remove('visible');
});
```

#### 3b. Update outside-click handler (~L1111–1116)

**Before:**
```typescript
if (!target.closest('#export-split-btn')) {
  exportFormatMenu?.classList.remove('visible');
}
```

**After:**
```typescript
if (!target.closest('#export-split-btn')) {
  exportFormatMenu?.classList.remove('visible');
}
if (!target.closest('#dl-export-split-btn')) {
  dlExportFormatMenu?.classList.remove('visible');
}
```

#### 3c. Update `syncExportTooltip()` (~L1195–1206)

**Before:**
```typescript
function syncExportTooltip(): void {
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    const fmt = state.getConfig().exportFormat.toUpperCase();
    btnExport.dataset.tooltip = `Export as ${fmt}`;
  }
  // Update format menu active state
  document.querySelectorAll('.export-format-option').forEach((el) => {
    const format = (el as HTMLElement).dataset.format;
    el.classList.toggle('active', format === state.getConfig().exportFormat);
  });
}
```

**After:**
```typescript
function syncExportTooltip(): void {
  const fmt = state.getConfig().exportFormat.toUpperCase();

  // Network export tooltip
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.dataset.tooltip = `Export as ${fmt}`;
  }

  // DataLayer export tooltip
  const btnDlExport = document.getElementById('dl-btn-export');
  if (btnDlExport) {
    btnDlExport.dataset.tooltip = `Export as ${fmt}`;
  }

  // Update ALL format menu active states (both toolbars)
  document.querySelectorAll('.export-format-option').forEach((el) => {
    const format = (el as HTMLElement).dataset.format;
    el.classList.toggle('active', format === state.getConfig().exportFormat);
  });
}
```

**This is sufficient** because both toolbars share `AppConfig.exportFormat` — when you change format in one, the other updates too. The `.export-format-option` querySelectorAll already covers both menus.

#### 3d. Update DL export click handler tooltip init

No code change needed — `syncExportTooltip()` is already called on panel init. Just verify it runs after DOM is ready (it does, it's in `initToolbarHandlers()` flow).

### 4. Inline style cleanup — `public/panel.html`

Remove the existing inline `style` attribute from `#dl-btn-export` (already covered in step 1).

Also verify that the existing inline CSS block in `panel.html` (L253–264) for `#btn-export` is still needed. Since the Tailwind-built `dist/panel.css` also gets these styles from `styles/input.css`, the inline block is likely a fallback or historical. **Do not remove it in this PR** to avoid regressions — but flag for future cleanup.

---

## Optional DRY Refactor (Not in scope, but worth noting)

The current CSS uses ID selectors (`#export-format-menu`, `#export-split-btn`) which forces duplication. A cleaner approach:

1. Replace `#export-format-menu` → `.export-format-menu`
2. Replace `#export-split-btn` → `.export-split-btn`
3. Both toolbars share the exact same CSS

**Decision:** Out of scope for this change. The ID-based approach is consistent with the rest of the codebase and keeps the change minimal.

---

## Testing Checklist

- [ ] DataLayer toolbar shows split button (Export + chevron)
- [ ] Click chevron → dropdown appears with JSON/CSV options
- [ ] Active format is highlighted (same as Network)
- [ ] Click outside → dropdown closes
- [ ] Click JSON/CSV → format saves to config, both toolbars update
- [ ] Main Export button tooltip updates dynamically
- [ ] Export actually downloads in selected format
- [ ] Switching format in Network toolbar updates DataLayer tooltip + active state
- [ ] Switching format in DataLayer toolbar updates Network tooltip + active state
- [ ] No inline styles remain on `#dl-btn-export`
- [ ] Dark/light theme — dropdown renders correctly in both
- [ ] No visual regression in Network toolbar

---

## File Change Summary

| File | Change | Lines touched (est.) |
|---|---|---|
| `public/panel.html` | Replace DL export button with split button structure | ~5 → ~12 (net +7) |
| `styles/input.css` | Add `#dl-export-split-btn`, `#dl-btn-export`, `#dl-export-format-menu` rules | +30 |
| `src/panel/index.ts` | Add DL format toggle handlers, update outside-click, update `syncExportTooltip()` | +25, modify ~10 |
