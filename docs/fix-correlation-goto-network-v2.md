# Fix: Correlation goto network — second click not working

## Problem

The first click on the `→` button in the Correlation tab works, but subsequent clicks either navigate to the previous request or do nothing.

## Root Cause Analysis

There were **two independent code paths** that pass `onGotoNetwork` callbacks into the Correlation rendering. Only one was fixed in the initial commit.

### Path 1: `createDlPushRow` callback (line ~300) ✅ FIXED in v1
Callback passed when a push row is clicked. Fresh closure created per-row.

### Path 2: `initDlDetailTabHandlers` (line ~1100) ❌ NOT FIXED in v1 — FIXED NOW
Callback passed once during panel initialization. Used when the user switches tabs (e.g., from Push Data to Correlation) while already having a push selected.

## Changes Applied

**File:** `src/panel/index.ts`

### Path 1 fix (line ~300)
```typescript
selectDlPush(p, r, (reqId) => {
  switchView('network');
  const reqData = state.getRequestMap().get(String(reqId));
  if (!reqData) return;
  const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
  if (!row) return;
  if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
    row.classList.remove('filtered-out', 'provider-hidden');
    row.style.display = '';
  }
  selectRequest(reqData, row);
});
```

### Path 2 fix (line ~1100)
```typescript
initDlDetailTabHandlers(currentPushGetter, (reqId) => {
  switchView('network');
  const reqData = state.getRequestMap().get(String(reqId));
  if (!reqData) return;
  const row = document.querySelector(`.req-row[data-id="${reqId}"]`) as HTMLElement | null;
  if (!row) return;
  if (row.classList.contains('filtered-out') || row.classList.contains('provider-hidden')) {
    row.classList.remove('filtered-out', 'provider-hidden');
    row.style.display = '';
  }
  selectRequest(reqData, row);
});
```

## Testing Checklist

- [ ] Click a push, switch to Correlation tab, click `→` → navigates to the correct request in Network tab
- [ ] Click a different push (stays on Correlation tab), click `→` on a different request → navigates to the NEW request
- [ ] Click `→`, go back to DataLayer, click same push, switch tabs, click `→` again → works every time
- [ ] Click `→` when target request is hidden by filter → row becomes visible and selected
- [ ] Click `→` when target request is hidden by provider filter → row becomes visible and selected
- [ ] Click `→` on different correlated requests in sequence → each one correctly navigates
