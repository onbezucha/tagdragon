# Implementation Spec: HTTP Status & Method Filters in Provider Popover

**Version:** 1.0  
**Date:** 2025-01  
**Scope:** Move status/method filters into the existing Provider Filter popover; remove badge-click shortcut  
**Depends on:** `status-filter-click.md` (already implemented — badge-click code to be removed)

---

## 1. Problem Statement

The current badge-click filter (from `status-filter-click.md`) is a hidden interaction — users must discover it by hovering badges. The provider filter popover is the natural place users go to filter requests, but HTTP status and method filters are missing there.

Additionally, the popover is titled "Provider Filter" which doesn't reflect that it handles more than provider visibility.

**User need:** A QA specialist opens the filter popover to quickly isolate all 4xx/5xx error requests — without knowing that badges are clickable.

## 2. Solution Overview

1. **Rename** the popover from "Provider Filter" → "Filters"
2. **Add two new filter sections** (HTTP Status, HTTP Method) above the provider group list
3. **Remove the badge-click filtering** from both request list and detail pane (revert `status-filter-click.md` behavior)
4. **Keep `syncBadgeActiveState()` and `.filter-active` visual indicator** on list/detail badges so users see which filter matches — but badges are no longer clickable
5. **Popover filter pills are independent** — clicking a status pill toggles the status filter; clicking a method pill toggles the method filter. They don't affect provider visibility.

### Visual Layout

```
┌─ Filters ───────────────────────────────────── [🔍 search…] [×] ─┐
│                                                                     │
│  HTTP Status                                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │ 2xx  │ │ 3xx  │ │ 4xx  │ │ 5xx  │                              │
│  │  15  │ │   0  │ │   3  │ │   1  │                              │
│  └──────┘ └──────┘ └──────┘ └──────┘                              │
│                                                                     │
│  HTTP Method                                                       │
│  ┌──────┐ ┌──────┐                                                │
│  │ GET  │ │ POST │                                                │
│  │  12  │ │   6  │                                                │
│  └──────┘ └──────┘                                                │
│                                                                     │
│  ─── Analytics ── ✓ ─────── 15 ── [✓] [—] ──                      │
│    [GA4] [Adobe AA] [Mixpanel] …                                   │
│  ─── Marketing ── ✓ ─────── 42 ── [✓] [—] ──                      │
│    [Meta Pixel] [Google Ads] [Criteo] …                            │
│  …                                                                 │
│                                                                     │
│  15 of 69 visible                [Show all] [Hide all]             │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Behavior

### 3.1 HTTP Status Pills

| Pill | Filter value | When active | When inactive |
|------|-------------|-------------|---------------|
| `2xx` | `'2xx'` | Highlighted, outline | Default style |
| `3xx` | `'3xx'` | Highlighted, outline | Default style |
| `4xx` | `'4xx'` | Highlighted, outline | Default style |
| `5xx` | `'5xx'` | Highlighted, outline | Default style |

- Only **one status pill** can be active at a time (radio-like behavior)
- Clicking an active pill deactivates it (toggle off)
- Clicking an inactive pill activates it and deactivates the previous one
- Count badge shows number of requests with that status prefix (all requests, not just visible)

### 3.2 HTTP Method Pills

| Pill | Filter value | When active | When inactive |
|------|-------------|-------------|---------------|
| `GET` | `'GET'` | Highlighted, outline | Default style |
| `POST` | `'POST'` | Highlighted, outline | Default style |

- Same radio-like toggle behavior as status
- Only one method active at a time

### 3.3 Interaction with Provider Visibility

Status/method filters are **completely independent** of provider visibility:
- Provider pills hide/show providers (existing behavior, unchanged)
- Status/method pills filter the request list
- Both apply simultaneously (intersection)
- Footer "X of Y visible" continues to reflect provider visibility only (not status/method)

### 3.4 Filter Bar Integration

When a status or method filter is active via popover pills:
- A filter pill appears in the `#active-filters` bar (existing behavior via `updateActiveFilters`)
- Removing the pill from the filter bar deactivates the corresponding popover pill
- "Reset filters" clears everything (status, method, providers unchanged)

### 3.5 Badge Visual State (`.filter-active`)

The existing `syncBadgeActiveState()` in `index.ts` continues to add `.filter-active` outline to badges in the request list and detail pane when their status/method matches the active filter. This provides visual consistency without requiring badge clicks.

## 4. Implementation Details

### 4.1. HTML — Rename Popover & Add Filter Sections

**File:** `public/panel.html`

#### 4.1.1 Rename title

Change line ~3837:
```html
<!-- Before -->
<span class="popover-title">Provider Filter</span>

<!-- After -->
<span class="popover-title">Filters</span>
```

#### 4.1.2 Add HTTP filter sections in popover body

Change `#provider-popover-body` (line ~3850):
```html
<!-- Before -->
<div class="popover-body" id="provider-popover-body">
  <div id="provider-group-list"></div>
</div>

<!-- After -->
<div class="popover-body" id="provider-popover-body">
  <div id="http-filter-sections">
    <div class="http-filter-group">
      <div class="http-filter-header">
        <span class="http-filter-label">HTTP Status</span>
      </div>
      <div class="http-filter-pills" id="http-status-pills"></div>
    </div>
    <div class="http-filter-group">
      <div class="http-filter-header">
        <span class="http-filter-label">HTTP Method</span>
      </div>
      <div class="http-filter-pills" id="http-method-pills"></div>
    </div>
  </div>
  <div id="provider-group-list"></div>
</div>
```

### 4.2. CSS — HTTP Filter Pill Styles

**File:** `public/panel.html` — add after existing provider popover CSS (~line 870):

```css
/* HTTP filter sections */
#http-filter-sections {
  border-bottom: 1px solid var(--border);
}

.http-filter-group {
  padding: 6px 10px 8px;
}

.http-filter-group + .http-filter-group {
  border-top: 1px solid var(--border-subtle);
}

.http-filter-header {
  margin-bottom: 4px;
}

.http-filter-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-2);
}

.http-filter-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* Individual HTTP filter pill */
.hpill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  cursor: pointer;
  user-select: none;
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  transition: all 150ms var(--ease);
}

.hpill:hover {
  background: var(--bg-3);
  border-color: var(--border);
}

.hpill-count {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-3);
  font-family: var(--font-mono);
}

/* Active state — uses the same color as status badges */
.hpill.active {
  border-color: currentColor;
  outline: 1px solid currentColor;
  outline-offset: -1px;
}

/* Status pill color variants */
.hpill[data-prefix="2xx"] { color: var(--green); }
.hpill[data-prefix="3xx"] { color: var(--accent); }
.hpill[data-prefix="4xx"] { color: var(--dragon-orange); }
.hpill[data-prefix="5xx"] { color: var(--red); }

/* Method pill color variants */
.hpill[data-method="GET"] { color: var(--green); }
.hpill[data-method="POST"] { color: var(--accent); }
```

### 4.3. TypeScript — Render HTTP Filter Pills

**File:** `src/panel/components/provider-filter-popover.ts`

Add pill rendering logic. This runs once during `initProviderFilterPopover()`.

```typescript
import {
  getFilterStatus,
  setFilterStatus,
  getFilterMethod,
  setFilterMethod,
  getAllRequests,
} from '../state';

// ─── HTTP FILTER PILLS ────────────────────────────────────────────────────

const STATUS_PREFIXES = ['2xx', '3xx', '4xx', '5xx'] as const;
const METHODS: readonly ('GET' | 'POST')[] = ['GET', 'POST'];

/**
 * Count requests by status prefix.
 */
function countByStatusPrefix(): Record<string, number> {
  const counts: Record<string, number> = {};
  getAllRequests().forEach((req) => {
    const prefix = req.status ? String(req.status)[0] + 'xx' : null;
    if (prefix) counts[prefix] = (counts[prefix] || 0) + 1;
  });
  return counts;
}

/**
 * Count requests by method.
 */
function countByMethod(): Record<string, number> {
  const counts: Record<string, number> = {};
  getAllRequests().forEach((req) => {
    counts[req.method] = (counts[req.method] || 0) + 1;
  });
  return counts;
}

/**
 * Render status and method filter pills in the popover.
 */
function renderHttpFilterPills(): void {
  // ─── Status pills ──────────────────────────────────────────────────────
  const statusContainer = document.getElementById('http-status-pills');
  if (!statusContainer) return;

  statusContainer.innerHTML = '';
  const statusCounts = countByStatusPrefix();
  const activeStatus = getFilterStatus();

  STATUS_PREFIXES.forEach((prefix) => {
    const pill = document.createElement('div');
    pill.className = `hpill${activeStatus === prefix ? ' active' : ''}`;
    pill.dataset.prefix = prefix;
    pill.innerHTML = `${prefix} <span class="hpill-count">${statusCounts[prefix] || 0}</span>`;
    pill.addEventListener('click', () => {
      const current = getFilterStatus();
      setFilterStatus(current === prefix ? '' : prefix);
      refreshHttpFilterPillStates();
      ctx?.doApplyFilters();
      ctx?.doUpdateActiveFilters();
    });
    statusContainer.appendChild(pill);
  });

  // ─── Method pills ──────────────────────────────────────────────────────
  const methodContainer = document.getElementById('http-method-pills');
  if (!methodContainer) return;

  methodContainer.innerHTML = '';
  const methodCounts = countByMethod();
  const activeMethod = getFilterMethod();

  METHODS.forEach((method) => {
    const pill = document.createElement('div');
    pill.className = `hpill${activeMethod === method ? ' active' : ''}`;
    pill.dataset.method = method;
    pill.innerHTML = `${method} <span class="hpill-count">${methodCounts[method] || 0}</span>`;
    pill.addEventListener('click', () => {
      const current = getFilterMethod();
      setFilterMethod(current === method ? '' : method);
      refreshHttpFilterPillPillStates();
      ctx?.doApplyFilters();
      ctx?.doUpdateActiveFilters();
    });
    methodContainer.appendChild(pill);
  });
}

/**
 * Refresh active states and counts on HTTP filter pills.
 * Called after filter changes and after new requests arrive.
 */
export function refreshHttpFilterPillStates(): void {
  const activeStatus = getFilterStatus();
  const activeMethod = getFilterMethod();
  const statusCounts = countByStatusPrefix();
  const methodCounts = countByMethod();

  // Status pills
  document.querySelectorAll('#http-status-pills .hpill').forEach((pill) => {
    const el = pill as HTMLElement;
    const prefix = el.dataset.prefix;
    el.classList.toggle('active', activeStatus === prefix);
    const countEl = el.querySelector('.hpill-count');
    if (countEl) countEl.textContent = String(statusCounts[prefix || ''] || 0);
  });

  // Method pills
  document.querySelectorAll('#http-method-pills .hpill').forEach((pill) => {
    const el = pill as HTMLElement;
    const method = el.dataset.method;
    el.classList.toggle('active', activeMethod === method);
    const countEl = el.querySelector('.hpill-count');
    if (countEl) countEl.textContent = String(methodCounts[method || ''] || 0);
  });
}
```

#### 4.3.1 Call `renderHttpFilterPills()` in init

In `initProviderFilterPopover()`, add at the end:

```typescript
export function initProviderFilterPopover(context: ProviderFilterContext): void {
  ctx = context;
  // ... existing init code ...

  // Render HTTP filter pills
  renderHttpFilterPills();

  registerPopover('provider-filter', closeProviderFilter);
}
```

### 4.4. TypeScript — Update Pill Counts After New Requests

**File:** `src/panel/components/provider-filter-popover.ts`

Export `refreshHttpFilterPillStates` (shown above) so it can be called externally.

**File:** `src/panel/index.ts`

Import and call after request counts change:

```typescript
import { refreshHttpFilterPillStates } from './components/provider-filter-popover';
```

Call `refreshHttpFilterPillStates()` in these locations:
1. Inside `doApplyFilters()` — after `syncBadgeActiveState()` (counts update on every filter change)
2. After `flushPendingRequests()` processes new requests — ensures counts reflect new data

### 4.5. Remove Badge-Click Behavior

**File:** `src/panel/index.ts`

#### 4.5.1 Remove from `initRequestListHandler()`

Revert `initRequestListHandler()` to its original simple form (remove badge-click interception):

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

#### 4.5.2 Remove `initDetailBadgeHandlers()` function

Delete the entire `initDetailBadgeHandlers()` function and its call from init.

#### 4.5.3 Remove toggle helper functions

Delete these functions (they are no longer needed — filtering is done via popover):
- `statusToPrefix()`
- `toggleStatusFilter()`
- `toggleMethodFilter()`

Keep `syncBadgeActiveState()` — it's still needed for visual indicator on list/detail badges.

#### 4.5.4 Remove from `doApplyFilters()`

`syncBadgeActiveState()` stays in `doApplyFilters()` — badges still show active state when filter is active via popover.

### 4.6. Remove Tooltips from Badges

**File:** `src/panel/components/request-list.ts`

Remove the `data-tooltip` attributes added in `status-filter-click.md`:

```typescript
// Remove these lines from createRequestRow():
// if (data.method === 'GET' || data.method === 'POST') {
//   methodEl.setAttribute('data-tooltip', 'Click to filter by method');
// }
// if (data.status) statusEl.setAttribute('data-tooltip', 'Click to filter by status');
```

**File:** `public/panel.html`

Remove `data-tooltip` from summary badges:
```html
<!-- Before -->
<span id="summary-method" class="summary-method" data-tooltip="Click to filter by method"></span>
<span id="summary-status" class="summary-status" data-tooltip="Click to filter by status"></span>

<!-- After -->
<span id="summary-method" class="summary-method"></span>
<span id="summary-status" class="summary-status"></span>
```

### 4.7. Keep CSS for `.filter-active` on Badges

**Files:** `styles/input.css`, `public/panel.html`

Keep the `.req-status.filter-active`, `.req-method.filter-active`, `.summary-status.filter-active`, `.summary-method.filter-active` CSS rules — they're still used by `syncBadgeActiveState()`.

But **remove** the `cursor: pointer`, `transition`, `:hover` rules since badges are no longer clickable:

```css
/* REMOVE from styles/input.css */
.req-status,
.req-method {
  cursor: pointer;
  transition: opacity 150ms var(--ease);
}
.req-status:hover,
.req-method:hover {
  opacity: 0.7;
}

/* REMOVE from public/panel.html */
.summary-status,
.summary-method {
  cursor: pointer;
  transition: opacity 150ms var(--ease);
}
.summary-status:hover,
.summary-method:hover {
  opacity: 0.7;
}
```

### 4.8. Wire Filter Bar Pill Removal → Popover Sync

**File:** `src/panel/components/filter-bar.ts`

When the user removes a status/method pill from the filter bar via the `×` button, the popover pills need to sync. This is already handled because `filter-bar.ts` calls `applyFiltersCallback()` → which calls `doApplyFilters()` → which calls `syncBadgeActiveState()`.

Add `refreshHttpFilterPillStates()` to the same flow. Since `doApplyFilters()` is the centralized callback, and `filter-bar.ts` already calls it through the callback chain, the cleanest approach is:

**File:** `src/panel/index.ts` — add `refreshHttpFilterPillStates()` to `doApplyFilters()`:

```typescript
function doApplyFilters(): void {
  applyFilters(updateRowVisibility, updateStatusBar);
  syncBadgeActiveState();
  refreshHttpFilterPillStates();
}
```

### 4.9. Update `updateFilterBarVisibility()` Button State

**File:** `src/panel/components/provider-bar.ts`

The `updateFilterBarVisibility()` function already checks `getFilterStatus()` and `getFilterMethod()` for filter bar visibility. The `#btn-providers` active indicator currently only reflects hidden providers. Update it to also reflect active HTTP filters:

```typescript
export function updateFilterBarVisibility(): void {
  const hiddenProviders = getHiddenProviders();
  const hasFilters = !!(/* ... existing checks ... */);

  // Indicator on the button — active when providers hidden OR HTTP filters active
  const $btn = DOM.btnProviders;
  const hasHttpFilter = !!(getFilterStatus() || getFilterMethod());
  $btn?.classList.toggle('active', hiddenProviders.size > 0 || hasHttpFilter);

  DOM.filterBar?.classList.toggle('visible', hasFilters);
  updateHiddenBadge();
}
```

### 4.10. Tooltip on Toolbar Button

**File:** `public/panel.html`

Update the tooltip on `#btn-providers`:
```html
<!-- Before -->
<button id="btn-providers" data-tooltip="Provider filter" ...>

<!-- After -->
<button id="btn-providers" data-tooltip="Filters" ...>
```

## 5. Files Changed

| File | Change |
|------|--------|
| `public/panel.html` | Rename popover title; add `#http-filter-sections` HTML; add `.hpill` CSS; update `#btn-providers` tooltip; remove `data-tooltip` from summary badges; remove clickable hover CSS |
| `styles/input.css` | Remove clickable badge CSS (cursor, hover); keep `.filter-active` |
| `src/panel/components/provider-filter-popover.ts` | Add `renderHttpFilterPills()`, `refreshHttpFilterPillStates()`, count helpers; call in `initProviderFilterPopover()` |
| `src/panel/components/provider-bar.ts` | Update `updateFilterBarVisibility()` to reflect HTTP filters in button active state |
| `src/panel/index.ts` | Remove badge-click handlers, remove toggle helpers, remove `initDetailBadgeHandlers()`; add `refreshHttpFilterPillStates()` to `doApplyFilters()` and after `flushPendingRequests()` |
| `src/panel/components/request-list.ts` | Remove `data-tooltip` from status/method badges |

**No changes needed:**
- `src/panel/state.ts` — filter state methods already exist
- `src/panel/utils/filter.ts` — `matchesFilter()` already handles both filters
- `src/panel/components/filter-bar.ts` — pill rendering already handles both filters
- `src/panel/utils/dom.ts` — no new DOM references needed (sections are rendered dynamically)

## 6. Testing Checklist

- [ ] Open filter popover → "Filters" title shown
- [ ] HTTP Status section shows 4 pills: 2xx, 3xx, 4xx, 5xx with correct counts
- [ ] HTTP Method section shows 2 pills: GET, POST with correct counts
- [ ] Click status pill (e.g. 4xx) → pill gets `.active`, filter activates, filter bar shows pill
- [ ] Click same status pill again → pill deactivates, filter clears
- [ ] Click different status pill (e.g. 2xx when 4xx active) → switches to 2xx
- [ ] Click method pill → same toggle behavior
- [ ] Status and method filters can be active simultaneously
- [ ] Filter bar pill removal → popover pill deactivates
- [ ] "Reset filters" in Settings → popover pills deactivate
- [ ] New requests arrive → counts update on pills
- [ ] Badges in request list show `.filter-active` outline when filter matches (visual only, not clickable)
- [ ] Badges in detail pane show `.filter-active` outline when filter matches
- [ ] No cursor:pointer on badges (not clickable)
- [ ] No tooltip on badges
- [ ] Toolbar button `#btn-providers` shows `.active` when HTTP filter is active
- [ ] Provider visibility pills still work independently
- [ ] Search still filters provider pills (HTTP pills not affected by search)
- [ ] Footer "X of Y visible" reflects provider visibility only

## 7. Edge Cases

| Case | Expected behavior |
|------|-------------------|
| No requests captured yet | All counts show `0`, pills still visible |
| All requests are 2xx | Other status pills show `0` count, still clickable |
| Request with status `0` | Not counted in any prefix (no 0xx) |
| Request with status `100` | Counted under `1xx` (rare, no dedicated pill — not shown) |
| Non-GET/POST methods (OPTIONS, HEAD, PUT, DELETE, PATCH) | Counted in method counts but no pill for them |
| Popover search input | Only filters provider pills, not HTTP filter pills |
| Popover closed and reopened | HTTP pills reflect current filter state and counts |

## 8. Migration from Badge-Click

This spec intentionally removes the badge-click feature because:
1. **Discoverability** — hidden interactions are poor UX for a tool aimed at QA specialists
2. **Consistency** — all filters should be in one place (the popover)
3. **Visual indicator preserved** — `.filter-active` outline on badges still shows which requests match, providing visual context without requiring interaction

If users later request badge-click as a power-user shortcut, it can be re-added without conflicting with this implementation.
