# Fix: DataLayer Sort Order Persistence

## Root Cause Analysis

Three issues were identified, with Issue #1 being the most likely root cause of the reported bug.

### Issue #1 (PRIMARY): Debounced save + unreliable `beforeunload` in DevTools panel

**Files:** `src/panel/state.ts` (lines 529–535, 550–556)

`updateConfig()` uses a 300ms debounce (`scheduleSave()`) before writing to `chrome.storage.local`. When the user clicks the sort toggle and then quickly closes DevTools (typical test scenario), the save doesn't complete in time. The `beforeunload` handler attempts to flush via `void saveConfig()`, but this is an async operation — the DevTools panel may be destroyed before `chrome.storage.local.set()` resolves.

The persistence mechanism is identical for ALL config values (network sort, hidden providers, theme, etc.). The DL sort is likely the most noticeable because the user's test cycle (open → click sort → close → reopen) is fast enough to consistently hit the 300ms debounce window.

### Issue #2 (SECONDARY): Race condition at panel startup

**Files:** `src/panel/index.ts` (line 544 vs 1929), `src/devtools/index.ts` (lines 80–98)

`window.receiveDataLayerPush` is defined at module-level (line 544), before async `init()` runs. Meanwhile, `panel.onShown` triggers `flushDataLayerBuffer()` and `INJECT_DATALAYER`, which can deliver pushes to the panel before `initDlSortState()` (line 1929) restores the persisted sort order.

**Impact:** First batch of pushes renders with default `asc` order, even when persisted order is `desc`.

### Issue #3 (TERTIARY): Filter popover sort toggle doesn't sync toolbar button

**File:** `src/panel/index.ts` (lines 1627–1631)

The "Toggle sort order" handler in the DL filter popover calls `toggleDlSortOrder()` but does NOT update `$dlSortBtn.classList.toggle('active', ...)`. The toolbar handler (lines 1326–1331) does this correctly.

**Impact:** Visual inconsistency — toolbar button doesn't reflect actual sort state after using the filter popover.

---

## Implementation Plan

### Fix #1: Immediate save for user-initiated config changes

**File:** `src/panel/state.ts`

Expose a new function `updateConfigImmediate()` that writes to storage synchronously (no debounce). This ensures critical user-initiated changes (like sort toggle) are persisted immediately, even if the panel is closed right after.

```typescript
/**
 * Update a config value and persist immediately (no debounce).
 * Use for user-initiated changes where persistence is critical.
 */
export function updateConfigImmediate<K extends keyof AppConfig>(
  key: K,
  value: AppConfig[K]
): void {
  config[key] = value;
  void saveConfig();
}
```

**File:** `src/panel/datalayer/state.ts`

Change `toggleDlSortOrder()`, `setDlSortField()`, and `setDlSortOrder()` to use `updateConfigImmediate` instead of `updateConfig`:

```typescript
import { getAppConfig, updateConfigImmediate } from '@/panel/state';

// ...

export function setDlSortField(field: DlSortField): void {
  dlSortField = field;
  updateConfigImmediate('dlSortField', field);
}

export function setDlSortOrder(order: DlSortOrder): void {
  dlSortOrder = order;
  updateConfigImmediate('dlSortOrder', order);
}

export function toggleDlSortOrder(): DlSortOrder {
  dlSortOrder = dlSortOrder === 'asc' ? 'desc' : 'asc';
  updateConfigImmediate('dlSortOrder', dlSortOrder);
  return dlSortOrder;
}
```

**Rationale:** Sort order changes are infrequent, user-initiated actions. The cost of an immediate write to `chrome.storage.local` is negligible. The benefit is guaranteed persistence even with rapid DevTools close.

---

### Fix #2: Gate `receiveDataLayerPush` on init completion

**File:** `src/panel/index.ts`

Add a module-level flag `isPanelReady` that is set to `true` only after `initDlSortState()` completes. Gate `window.receiveDataLayerPush` on this flag — if the panel isn't ready yet, buffer the push for later processing.

```typescript
// Module-level flag — set to true after init completes
let isPanelReady = false;

// Module-level buffer for pushes arriving before init completes
const earlyDlPushBuffer: DataLayerPush[] = [];
```

Modify `window.receiveDataLayerPush` (line 544):

```typescript
window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (!isPanelReady) {
    // Buffer until init completes — will be flushed by init()
    earlyDlPushBuffer.push(push);
    return;
  }
  // ... existing logic unchanged ...
};
```

At the end of `init()`, after `initDlSortState()` and all handler initialization:

```typescript
// Mark panel as ready and flush early pushes
isPanelReady = true;

// Replay any pushes that arrived before init completed
if (earlyDlPushBuffer.length > 0) {
  const buffered = [...earlyDlPushBuffer];
  earlyDlPushBuffer.length = 0;
  for (const push of buffered) {
    try { window.receiveDataLayerPush(push); } catch { /* ignore */ }
  }
}
```

**Rationale:** This ensures that ALL pushes are processed with the correct sort order, regardless of when they arrive relative to `init()`. The buffer is a simple array that's drained once — no ongoing overhead.

---

### Fix #3: Sync toolbar button from filter popover sort toggle

**File:** `src/panel/index.ts`

Update the "toggle-sort-order" handler in the DL filter popover (line 1627–1631) to also sync the toolbar button:

```typescript
$content.querySelector('[data-action="toggle-sort-order"]')?.addEventListener('click', () => {
  const newOrder = toggleDlSortOrder();
  renderDlPushListFull();
  // Sync toolbar button visual state
  const $dlSortBtn = document.getElementById('dl-btn-sort');
  $dlSortBtn?.classList.toggle('active', newOrder === 'desc');
  closeDlFilterPopover();
});
```

**Rationale:** One-line fix for visual consistency. The toolbar button and filter popover should always reflect the same state.

---

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `src/panel/state.ts` | Add `updateConfigImmediate()` export | Low — additive, no existing code changed |
| `src/panel/datalayer/state.ts` | Switch 3 functions from `updateConfig` to `updateConfigImmediate` | Low — same logic, just immediate persistence |
| `src/panel/index.ts` | Add `isPanelReady` flag + early push buffer + flush in `init()` | Low — only affects startup timing, no behavioral change for normal operation |
| `src/panel/index.ts` | Add toolbar button sync in filter popover handler | Low — one-line addition |

## Testing Plan

1. **Persistence test (Fix #1):**
   - Open DevTools → go to DataLayer tab
   - Click sort toggle (should change to desc/newest first)
   - Immediately close DevTools (F12)
   - Reopen DevTools → go to DataLayer tab
   - ✅ Sort button should show `active` state (desc)
   - ✅ Any new pushes should be prepended (newest first)

2. **Startup race condition test (Fix #2):**
   - Set DL sort to `desc` and keep DevTools open
   - Navigate to a page with active dataLayer pushes
   - Close and reopen DevTools
   - ✅ First batch of pushes should arrive in `desc` order (prepended)

3. **Filter popover sync test (Fix #3):**
   - Open DL filter popover → click "Toggle sort order"
   - Close popover
   - ✅ Toolbar `dl-btn-sort` button should reflect the new sort state
