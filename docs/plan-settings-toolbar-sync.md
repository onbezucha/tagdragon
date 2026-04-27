# Implementation Plan: Settings ↔ Toolbar Synchronization

**Date:** 2025-07-10  
**Status:** Ready for implementation  
**Scope:** Fix bidirectional sync between Settings popover and context toolbar (row 2)

---

## Problem Statement

When changing settings in the Settings popover, the corresponding toolbar buttons do not reflect the new state. Specifically:

1. **DataLayer sort order**: Changing sort order in Settings does NOT update the `dl-btn-sort` button's `.active` class or tooltip in the DataLayer toolbar
2. **Network sort order**: Already works (bidirectional) — serves as the reference pattern

### Current sync matrix

| Setting | Toolbar → Settings | Settings → Toolbar |
|---|:---:|:---:|
| Network: Sort order | ✅ | ✅ |
| DL: Sort order | ✅ | ❌ **BUG** |

All other settings (Wrap values, Auto-expand, Compact rows, Default tab, DL sort field, Group by source) exist only in Settings and do not need toolbar sync (by design — less frequently used).

---

## Implementation Changes

### File 1: `src/panel/index.ts`

#### Change 1A: Add `syncDlQuickButtons()` function

**Location:** After `syncQuickButtons()` (~line 1191)

Add new function following the same pattern as `syncQuickButtons()`:

```typescript
function syncDlQuickButtons(): void {
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  const order = dlState.getDlSortOrder();

  if ($dlSortBtn) {
    $dlSortBtn.classList.toggle('active', order === 'desc');
    $dlSortBtn.dataset.tooltip =
      order === 'desc'
        ? 'Newest first (click for oldest first)'
        : 'Oldest first (click for newest first)';
  }
}
```

**Why:** Mirrors `syncQuickButtons()` which does the same for Network sort. Reads DL sort state from `dlState.getDlSortOrder()` and updates the button's visual active state + tooltip.

---

#### Change 1B: Call `syncDlQuickButtons()` after DL sort toolbar click

**Location:** DL sort click handler (~line 1387–1393)

**Current code:**
```typescript
const $dlSortBtn = document.getElementById('dl-btn-sort');
$dlSortBtn?.addEventListener('click', () => {
  const newOrder = toggleDlSortOrder();
  $dlSortBtn.classList.toggle('active', newOrder === 'desc');
  renderDlPushListFull();
  syncSettingsControl('cfg-dl-sort-order', newOrder);
});
```

**New code:**
```typescript
const $dlSortBtn = document.getElementById('dl-btn-sort');
$dlSortBtn?.addEventListener('click', () => {
  const newOrder = toggleDlSortOrder();
  syncDlQuickButtons();
  renderDlPushListFull();
  syncSettingsControl('cfg-dl-sort-order', newOrder);
});
```

**Change:** Replace manual `$dlSortBtn.classList.toggle('active', ...)` with `syncDlQuickButtons()` call. This keeps the logic centralized — same function handles both the active class and the tooltip.

---

#### Change 1C: Add `syncDlQuickButtons` to `initSettingsDrawer()` context

**Location:** `initSettingsDrawer()` call (~line 1558–1565)

**Current code:**
```typescript
initSettingsDrawer({
  getActiveView: () => activeView,
  doApplyFilters,
  doUpdateActiveFilters,
  syncQuickButtons,
  applyWrapValuesClass,
  applyCompactRowsClass,
});
```

**New code:**
```typescript
initSettingsDrawer({
  getActiveView: () => activeView,
  doApplyFilters,
  doUpdateActiveFilters,
  syncQuickButtons,
  syncDlQuickButtons,
  applyWrapValuesClass,
  applyCompactRowsClass,
});
```

**Change:** Pass the new function so settings-drawer can call it when DL settings change.

---

### File 2: `src/panel/components/settings-drawer.ts`

#### Change 2A: Add `syncDlQuickButtons` to `DrawerContext` interface

**Location:** `DrawerContext` interface (~line 16–23)

**Current code:**
```typescript
export interface DrawerContext {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  syncQuickButtons: () => void;
  applyWrapValuesClass: () => void;
  applyCompactRowsClass: () => void;
}
```

**New code:**
```typescript
export interface DrawerContext {
  getActiveView: () => 'network' | 'datalayer';
  doApplyFilters: () => void;
  doUpdateActiveFilters: () => void;
  syncQuickButtons: () => void;
  syncDlQuickButtons: () => void;
  applyWrapValuesClass: () => void;
  applyCompactRowsClass: () => void;
}
```

---

#### Change 2B: Call `syncDlQuickButtons` from DL sort order `wireSelect` afterFn

**Location:** `wireUpSectionControls` for `tab === 'datalayer'` (~line 424–427)

**Current code:**
```typescript
wireSelect('cfg-dl-sort-order', 'dlSortOrder', () => {
  const val = (document.getElementById('cfg-dl-sort-order') as HTMLSelectElement)?.value;
  if (val) dlState.setDlSortOrder(val as 'asc' | 'desc');
});
```

**New code:**
```typescript
wireSelect('cfg-dl-sort-order', 'dlSortOrder', () => {
  const val = (document.getElementById('cfg-dl-sort-order') as HTMLSelectElement)?.value;
  if (val) dlState.setDlSortOrder(val as 'asc' | 'desc');
  ctx?.syncDlQuickButtons();
});
```

**Why:** When user changes DL sort order in Settings, this syncs the toolbar button state back.

---

#### Change 2C: Call `syncDlQuickButtons` from footer Reset to defaults handler

**Location:** Reset to defaults click handler (~line 492–501)

**Current code:**
```typescript
document.getElementById('btn-popover-reset-all')?.addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
  state.resetConfig();
  dlState.initDlSortState();
  closeSettings();
  ctx?.syncQuickButtons();
  ctx?.applyWrapValuesClass();
  ctx?.applyCompactRowsClass();
});
```

**New code:**
```typescript
document.getElementById('btn-popover-reset-all')?.addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
  state.resetConfig();
  dlState.initDlSortState();
  closeSettings();
  ctx?.syncQuickButtons();
  ctx?.syncDlQuickButtons();
  ctx?.applyWrapValuesClass();
  ctx?.applyCompactRowsClass();
});
```

---

#### Change 2D: Call `syncDlQuickButtons` from footer Import config handler

**Location:** Import config reader.onload handler (~line 531–536)

**Current code:**
```typescript
dlState.initDlSortState();
refreshContent();
ctx?.syncQuickButtons();
ctx?.applyWrapValuesClass();
ctx?.applyCompactRowsClass();
```

**New code:**
```typescript
dlState.initDlSortState();
refreshContent();
ctx?.syncQuickButtons();
ctx?.syncDlQuickButtons();
ctx?.applyWrapValuesClass();
ctx?.applyCompactRowsClass();
```

---

## Summary of All Changes

| File | Line | Change | Type |
|---|---|---|---|
| `src/panel/index.ts` | ~1191 | Add `syncDlQuickButtons()` function | New function |
| `src/panel/index.ts` | ~1389 | Replace manual class toggle with `syncDlQuickButtons()` | Refactor |
| `src/panel/index.ts` | ~1562 | Add `syncDlQuickButtons` to context object | Param addition |
| `src/panel/components/settings-drawer.ts` | ~20 | Add `syncDlQuickButtons` to `DrawerContext` | Interface update |
| `src/panel/components/settings-drawer.ts` | ~427 | Add `ctx?.syncDlQuickButtons()` in afterFn | Bug fix |
| `src/panel/components/settings-drawer.ts` | ~499 | Add `ctx?.syncDlQuickButtons()` after reset | Bug fix |
| `src/panel/components/settings-drawer.ts` | ~534 | Add `ctx?.syncDlQuickButtons()` after import | Bug fix |

**Total:** 7 targeted changes across 2 files. Zero new dependencies. Zero HTML changes.

---

## Verification Checklist

After implementation, verify:

- [ ] **Toolbar → Settings (DL)**: Click `dl-btn-sort` → Settings popover shows updated sort order in dropdown
- [ ] **Settings → Toolbar (DL)**: Open Settings → DataLayer tab → Change sort order → `dl-btn-sort` updates `.active` class + tooltip
- [ ] **Reset defaults**: Click "Reset to defaults" → both `btn-quick-sort` and `dl-btn-sort` return to default (asc, no active class)
- [ ] **Import config**: Import config with `dlSortOrder: "desc"` → `dl-btn-sort` gets `.active` class
- [ ] **Network sort unchanged**: Network sort still works bidirectionally (regression check)
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors

---

## Out of Scope

The following are intentionally NOT part of this fix:

- Adding Wrap values / Auto-expand / Compact rows buttons to toolbar (by design — less frequent)
- Adding DL sort field / Group by source to toolbar (by design)
- Merging Network and DataLayer toolbars (keeping separate by design)
