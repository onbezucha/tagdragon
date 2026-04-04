# Fix: Correlation → goto network request

## Problem

In the DataLayer detail pane, **Correlation** sub-tab, clicking the `→` button on a correlated request does **not** navigate to that request in the Network tab. It only switches the view to Network, but doesn't select or highlight the target request.

## Root Cause

`src/panel/index.ts:303–305` — the `onGotoNetwork` callback receives `requestId` but ignores it:

```typescript
selectDlPush(p, r, (_reqId) => {
  switchView('network');
});
```

The underscore-prefixed `_reqId` parameter is a code-style signal that the value is intentionally unused.

## Scope of Changes

**Single file:** `src/panel/index.ts`

### What needs to happen when the user clicks `→`

1. **Switch to Network view** — already done via `switchView('network')`
2. **Look up request data** — get `ParsedRequest` from the request map using `state.getRequestMap()`
3. **Find the DOM row** — query `.req-row[data-id="<id>"]`
4. **Handle hidden/filtered rows** — if the row exists but is hidden by a filter or provider filter, make it visible
5. **Select the request** — call `selectRequest(data, row)` which handles:
   - Setting `selectedId` in state
   - Highlighting the row (`.active` class)
   - Rendering the detail pane
   - Scrolling the row into view (`scrollIntoView({ block: 'nearest' })`)

### Edge Cases

| Case | Handling |
|------|----------|
| Request not in map (already pruned) | Silently abort — `if (!reqData) return` |
| Row not in DOM (pruned before render) | Silently abort — `if (!row) return` |
| Row hidden by text/status/method filter | Remove `filtered-out` class, set `display: ''` |
| Row hidden by provider filter | Remove `provider-hidden` class, set `display: ''` |
| Row scrolled out of view | `selectRequest` already calls `scrollIntoView` |
| Currently on DataLayer view | `switchView('network')` already toggles visibility |

## Implementation

### Change: `src/panel/index.ts` — line 303–305

**Before:**

```typescript
selectDlPush(p, r, (_reqId) => {
  switchView('network');
});
```

**After:**

```typescript
selectDlPush(p, r, (reqId) => {
  switchView('network');

  const reqData = state.getRequestMap().get(String(reqId));
  if (!reqData) return;

  const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
  if (!row) return;

  // Make row visible if hidden by filter or provider filter
  if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
    row.classList.remove('filtered-out', 'provider-hidden');
    row.style.display = '';
  }

  selectRequest(reqData, row);
});
```

### Imports verification

The callback already has access to:
- `switchView` — defined in the same file (line 189)
- `state.getRequestMap` — imported from `./state` at the top of the file
- `selectRequest` — imported from `./components/detail-pane` at the top of the file (line 16)

**No new imports needed.**

## Testing Checklist

- [ ] Click `→` on a correlated request → switches to Network tab and selects the request
- [ ] Click `→` when the target request is currently visible → highlights it, scrolls to it, shows detail
- [ ] Click `→` when the target request is hidden by a text filter → row becomes visible and selected
- [ ] Click `→` when the target request is hidden by provider filter → row becomes visible and selected
- [ ] Click `→` when the target request has been pruned (no longer in memory) → no error, view still switches
- [ ] Click `→` multiple times on different correlated requests → each one correctly selects its target
- [ ] Verify that after goto, clicking other network requests still works normally
- [ ] Verify that the detail pane shows the correct decoded params for the goto-selected request
