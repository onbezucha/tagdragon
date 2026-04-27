# Implementation Spec: Status & Method Filter by Badge Click

**Version:** 1.0  
**Date:** 2025-01  
**Scope:** Phase 1 — Click on status/method badge in request list and detail pane activates filter  
**Depends on:** Existing `filterState`, `setFilterStatus()`, `setFilterMethod()`, filter-bar, `matchesFilter()` — all already implemented

---

## 1. Problem Statement

TagDragon has a complete filter infrastructure for HTTP status codes and methods, but **no UI element activates these filters**:

- `setFilterStatus()` is defined but never called from UI
- `setFilterMethod()` is defined but never called from UI
- `filter-bar.ts` already renders removable pills for both filter types
- `matchesFilter()` already matches by status prefix and exact method

The primary use-case: a QA specialist sees a `403` or `500` in the request list and wants to instantly see **all requests with the same status class** (e.g., all errors) — to verify whether a marketing pixel failed to fire.

## 2. Solution Overview

Make the **status badge** and **method badge** clickable in two locations:

| Location | Element | Action |
|----------|---------|--------|
| Request list row | `.req-status` | Click → toggle status filter |
| Request list row | `.req-method` | Click → toggle method filter |
| Detail pane summary | `#summary-status` | Click → toggle status filter |
| Detail pane summary | `#summary-method` | Click → toggle method filter |

**Behavior:**
- Click on a badge with **no active filter** → activates filter, shows pill in filter bar
- Click on a badge with **the same filter already active** → deactivates filter, removes pill
- Click on a badge with **a different filter active** → switches to new value
- The click **does NOT prevent row selection** — badges use `stopPropagation()` to separate concerns

## 3. Filter Values

### Status Filter (prefix-based, matches existing `matchesFilter()` logic)

| Badge value | Filter value set | Pill label |
|-------------|-----------------|------------|
| 200, 204, 201… | `'2xx'` | `status: 2xx Success` |
| 301, 302, 304… | `'3xx'` | `status: 3xx Redirect` |
| 400, 403, 404… | `'4xx'` | `status: 4xx Error` |
| 500, 502, 503… | `'5xx'` | `status: 5xx Error` |

### Method Filter (exact match, matches existing `matchesFilter()` logic)

| Badge value | Filter value set | Pill label |
|-------------|-----------------|------------|
| GET | `'GET'` | `method: GET` |
| POST | `'POST'` | `method: POST` |

## 4. Implementation Details

### 4.1. CSS — Make Badges Look Clickable

**File:** `styles/input.css`

Add to the existing badge styles (after `.req-status` and `.req-method` definitions):

```css
/* Clickable filter badges */
.req-status,
.req-method {
  cursor: pointer;
  transition: opacity 150ms var(--ease);
}

.req-status:hover,
.req-method:hover {
  opacity: 0.7;
}

/* Active filter indicator */
.req-status.filter-active,
.req-method.filter-active {
  outline: 1.5px solid currentColor;
  outline-offset: 1px;
}
```

**File:** `public/panel.html` — add the same hover/active styles for detail pane badges:

```css
/* Detail pane — clickable summary badges */
.summary-status,
.summary-method {
  cursor: pointer;
  transition: opacity 150ms var(--ease);
}

.summary-status:hover,
.summary-method:hover {
  opacity: 0.7;
}

.summary-status.filter-active,
.summary-method.filter-active {
  outline: 1.5px solid currentColor;
  outline-offset: 1px;
}
```

### 4.2. Request List Click Handler

**File:** `src/panel/index.ts` — modify `initRequestListHandler()`

Current code (line ~1252):

```typescript
function initRequestListHandler(): void {
  DOM.list?.addEventListener('click', (e: Event) => {
    const row = (e.target as HTMLElement).closest('.req-row');
    if (!row) return;
    const id = (row as HTMLElement).dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (data) selectRequest(data, row as HTMLElement);
  });
}
```

New code:

```typescript
function initRequestListHandler(): void {
  DOM.list?.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    // ─── Badge filter clicks (status / method) ────────────────────────
    const statusBadge = target.closest('.req-status');
    const methodBadge = target.closest('.req-method');

    if (statusBadge || methodBadge) {
      e.stopPropagation(); // prevent row selection
      const row = target.closest('.req-row');
      const id = (row as HTMLElement)?.dataset.id;
      if (!id) return;
      const data = state.getRequest(id);
      if (!data) return;

      if (statusBadge) {
        toggleStatusFilter(data.status);
      } else {
        toggleMethodFilter(data.method);
      }

      applyFilters(updateRowVisibility, updateStatusBar);
      updateActiveFilters(() => {
        applyFilters(updateRowVisibility, updateStatusBar);
      });
      return;
    }

    // ─── Normal row selection ─────────────────────────────────────────
    const row = target.closest('.req-row');
    if (!row) return;
    const id = (row as HTMLElement).dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (data) selectRequest(data, row as HTMLElement);
  });
}
```

### 4.3. Detail Pane Badge Click Handlers

**File:** `src/panel/index.ts` — add new init function

```typescript
/**
 * Initialize click handlers on detail pane summary badges.
 * Allows toggling status/method filter by clicking the badge.
 */
function initDetailBadgeHandlers(): void {
  // Status badge
  DOM.summaryStatus?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    const selectedId = state.getSelectedId();
    if (!selectedId) return;
    const data = state.getRequest(selectedId);
    if (!data) return;

    toggleStatusFilter(data.status);

    applyFilters(updateRowVisibility, updateStatusBar);
    updateActiveFilters(() => {
      applyFilters(updateRowVisibility, updateStatusBar);
    });
  });

  // Method badge
  DOM.summaryMethod?.addEventListener('click', (e: Event) => {
    e.stopPropagation();
    const selectedId = state.getSelectedId();
    if (!selectedId) return;
    const data = state.getRequest(selectedId);
    if (!data) return;

    toggleMethodFilter(data.method);

    applyFilters(updateRowVisibility, updateStatusBar);
    updateActiveFilters(() => {
      applyFilters(updateRowVisibility, updateStatusBar);
    });
  });
}
```

### 4.4. Toggle Helper Functions

**File:** `src/panel/index.ts` — add these private helpers

```typescript
/**
 * Map HTTP status code to prefix group (e.g. 403 → '4xx').
 */
function statusToPrefix(status: number): string {
  return String(status)[0] + 'xx';
}

/**
 * Toggle status filter: activate if different, deactivate if same.
 */
function toggleStatusFilter(status: number): void {
  const prefix = statusToPrefix(status);
  const current = state.getFilterStatus();
  state.setFilterStatus(current === prefix ? '' : prefix);
  syncBadgeActiveState();
}

/**
 * Toggle method filter: activate if different, deactivate if same.
 */
function toggleMethodFilter(method: string): void {
  const current = state.getFilterMethod();
  state.setFilterMethod(current === method ? '' : (method as 'GET' | 'POST'));
  syncBadgeActiveState();
}
```

### 4.5. Visual Active State Sync

**File:** `src/panel/index.ts` — add sync helper

```typescript
/**
 * Synchronize `.filter-active` class on all status/method badges
 * in both request list and detail pane.
 */
function syncBadgeActiveState(): void {
  const activeStatus = state.getFilterStatus();
  const activeMethod = state.getFilterMethod();

  // Request list badges
  DOM.list?.querySelectorAll('.req-status').forEach((el) => {
    const row = el.closest('.req-row');
    const id = (row as HTMLElement)?.dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (!data) return;
    const prefix = statusToPrefix(data.status);
    el.classList.toggle('filter-active', activeStatus === prefix);
  });

  DOM.list?.querySelectorAll('.req-method').forEach((el) => {
    const row = el.closest('.req-row');
    const id = (row as HTMLElement)?.dataset.id;
    if (!id) return;
    const data = state.getRequest(id);
    if (!data) return;
    el.classList.toggle('filter-active', activeMethod === data.method);
  });

  // Detail pane badges
  if (DOM.summaryStatus) {
    const selectedId = state.getSelectedId();
    const data = selectedId ? state.getRequest(selectedId) : null;
    if (data) {
      const prefix = statusToPrefix(data.status);
      DOM.summaryStatus.classList.toggle('filter-active', activeStatus === prefix);
    } else {
      DOM.summaryStatus.classList.remove('filter-active');
    }
  }

  if (DOM.summaryMethod) {
    const selectedId = state.getSelectedId();
    const data = selectedId ? state.getRequest(selectedId) : null;
    if (data) {
      DOM.summaryMethod.classList.toggle('filter-active', activeMethod === data.method);
    } else {
      DOM.summaryMethod.classList.remove('filter-active');
    }
  }
}
```

### 4.6. Call Init During Panel Setup

**File:** `src/panel/index.ts` — in the main `init()` or setup section

Find the line where `initRequestListHandler()` is called and add nearby:

```typescript
initRequestListHandler();
initDetailBadgeHandlers(); // <-- add this line
```

### 4.7. Update syncBadgeActiveState After Filter Changes

Every time filters are applied or reset, call `syncBadgeActiveState()`. The simplest approach is to add it at the end of the existing filter application flow. Look at these call sites:

| Location | When | Action |
|----------|------|--------|
| `initRequestListHandler()` badge click | After `applyFilters()` | Already handled inline |
| `initDetailBadgeHandlers()` click | After `applyFilters()` | Already handled inline |
| `filter-bar.ts` pill remove | After `applyFilters()` callback | Call `syncBadgeActiveState()` |
| Settings "Reset filters" button | After `resetFilters()` | Call `syncBadgeActiveState()` |
| Keyboard `Esc` clearing filter | After filter clear | Call `syncBadgeActiveState()` |

**Recommended approach:** Instead of sprinkling calls everywhere, expose `syncBadgeActiveState` from `index.ts` and call it from the `updateActiveFilters` callback chain. Since `updateActiveFilters` is always called after filter changes, add `syncBadgeActiveState()` at the end of every place where `updateActiveFilters(callback)` is called.

Alternatively, add it as a one-liner inside the `applyFilters` wrapper used throughout the panel:

```typescript
// In index.ts, create a shared helper
function applyFiltersAndSync(
  rowVis?: () => void,
  statusCb?: (n: number, s: number, d: number) => void
): void {
  applyFilters(rowVis ?? updateRowVisibility, statusCb ?? updateStatusBar);
  syncBadgeActiveState();
}
```

Then gradually replace `applyFilters(...)` calls with `applyFiltersAndSync()` where appropriate.

### 4.8. Wire resetFilters to clear badge active state

**File:** `src/panel/state.ts` — `resetFilters()` already resets `status` and `method` to `''`. The visual sync will happen via `syncBadgeActiveState()` called after reset.

### 4.9. Tooltip for Badges

**File:** `src/panel/components/request-list.ts` — modify `createRequestRow()`

Add `data-tooltip` attribute to status and method elements so users know they're clickable:

```typescript
// Status
const statusEl = row.querySelector('.req-status') as HTMLElement;
statusEl.textContent = String(data.status || '—');
statusEl.setAttribute('data-tooltip', 'Click to filter by status');
if (data.status) statusEl.classList.add(`status-${String(data.status)[0]}`);

// Method
const methodEl = row.querySelector('.req-method') as HTMLElement;
methodEl.textContent = data.method;
methodEl.setAttribute('data-tooltip', 'Click to filter by method');
if (data.method === 'GET') methodEl.classList.add('method-get');
else if (data.method === 'POST') methodEl.classList.add('method-post');
```

**File:** `public/panel.html` — add tooltip to summary badges:

```html
<span id="summary-status" class="summary-status" data-tooltip="Click to filter by status"></span>
...
<span id="summary-method" class="summary-method" data-tooltip="Click to filter by method"></span>
```

## 5. Files Changed

| File | Change |
|------|--------|
| `src/panel/index.ts` | Modify `initRequestListHandler()`, add `initDetailBadgeHandlers()`, `toggleStatusFilter()`, `toggleMethodFilter()`, `statusToPrefix()`, `syncBadgeActiveState()` |
| `src/panel/components/request-list.ts` | Add `data-tooltip` to `.req-status` and `.req-method` in `createRequestRow()` |
| `public/panel.html` | Add CSS for clickable badges (hover, `.filter-active`), add `data-tooltip` to summary badges |
| `styles/input.css` | Add CSS for `.req-status`/`.req-method` hover and `.filter-active` states |

**No changes needed:**
- `src/panel/state.ts` — `setFilterStatus()`, `setFilterMethod()`, `resetFilters()` already exist
- `src/panel/utils/filter.ts` — `matchesFilter()` already handles both filters
- `src/panel/components/filter-bar.ts` — pill rendering already handles both filters
- `src/types/request.ts` — `FilterState` already has `status` and `method`

## 6. Testing Checklist

- [ ] Click status badge (e.g. `200`) in request list → filter activates, pill shows `status: 2xx Success`
- [ ] Click same status badge again → filter deactivates, pill removed
- [ ] Click status badge with different prefix (e.g. `403` when `2xx` active) → switches to `4xx Error`
- [ ] Click method badge (`POST`) in request list → filter activates, pill shows `method: POST`
- [ ] Click same method badge again → deactivates
- [ ] Click status badge in detail pane → same toggle behavior
- [ ] Click method badge in detail pane → same toggle behavior
- [ ] Remove status pill via `×` button → filter clears, badges lose `.filter-active`
- [ ] Remove method pill via `×` button → filter clears, badges lose `.filter-active`
- [ ] "Reset filters" button in Settings → clears both filters, badges lose `.filter-active`
- [ ] `Ctrl+L` (clear all) → no stale `.filter-active` on badges
- [ ] New request arrives while status filter active → its badge gets `.filter-active` if matching
- [ ] Tooltip shows on hover over status/method badges in list
- [ ] Tooltip shows on hover over status/method badges in detail pane
- [ ] Row selection still works when clicking anywhere except badges
- [ ] Keyboard navigation (`↑/↓`) still works

## 7. Edge Cases

| Case | Expected behavior |
|------|-------------------|
| Request with status `0` (no response) | Badge shows `—`, not clickable (no filter set) |
| Request with status `100` (1xx) | Filter prefix `1xx` — rare but handled |
| Mixed methods (OPTIONS, HEAD, PUT, DELETE, PATCH) | These are not in `FilterState.method` type union (`'' \| 'GET' \| 'POST'`). Skip method filter toggle for non-GET/POST. Only show tooltip for GET/POST. |
| Detail pane has no selected request | Click on summary badge → no-op (guard on `getSelectedId()`) |
| Multiple filters active simultaneously | All pills show in filter bar, badge `.filter-active` reflects only its own filter type |

## 8. Future Considerations (Out of Scope)

- **Phase 2:** Add status/method filter dropdowns in Settings popover (for users who don't discover the badge click)
- **Phase 3:** Support search syntax like `status:4xx` or `method:POST` in the search input
- **Phase 4:** Click on event name badge in request list → activate event type filter
