# TagDragon v1.5.5 — Codebase Review & Implementation Plan

> Reviewed: 2025-01  
> Scope: Full codebase audit — bugs, dead code, unused exports, folder structure, and next steps

---

## 1. BUGS & POTENTIAL ISSUES

### 🔴 BUG-1: `removeFromFiltered` called but never exported
- **File:** `src/panel/state.ts` line 118
- **Call site:** `src/panel/index.ts` line 118 — `state.removeFromFiltered(String(r.id))`
- **Problem:** `removeFromFiltered()` is never exported from `src/panel/state.ts`. The function is called during `pruneIfNeeded()` but does not exist as an export. This would cause a runtime error when pruning occurs (after 500 requests).
- **Fix:** Add `export function removeFromFiltered(id: string): void { requestState.filteredIds.delete(id); }` to state.ts

### 🟡 BUG-2: `qs()` exported but never imported
- **File:** `src/panel/utils/dom.ts` line 13
- **Problem:** `qs<T>()` is exported but never imported anywhere in the codebase. `qsa()` is used extensively but `qs()` is unused.
- **Note:** TypeScript `noUnusedLocals` is enabled in tsconfig, but since it's exported, it won't trigger.

### 🟡 BUG-3: `escHtml` exported alias but never used
- **File:** `src/panel/utils/format.ts` line 32
- **Problem:** `export const escHtml = esc;` — alias is never imported/used anywhere. Only `esc()` is used.

### 🟡 BUG-4: `resetProviders()` exported but never called
- **File:** `src/panel/state.ts` line 422
- **Problem:** `resetProviders()` clears `activeProviders` set but is never called anywhere. Provider pills are rebuilt via `ensureProviderPill()` instead. This is dead code.

### 🟡 BUG-5: `setCorrelationLookback()` exported but never called
- **File:** `src/panel/datalayer/state.ts` line 265
- **Problem:** `getCorrelationLookback()` is used (has a default of 500ms), but `setCorrelationLookback()` is never called anywhere. The lookback value is hardcoded at 500ms with no UI to change it.

### 🟡 BUG-6: Duplicated `esc()` function (5×)
- **Files:** `src/panel/index.ts` — inline in multiple functions, `src/panel/utils/format.ts` line 20
- **Problem:** `esc()` is defined in `format.ts` and imported in `index.ts`, but `index.ts` also defines its own inline `esc()` inside several functions:
  - `createDlFilterChip()` (line 381)
  - `renderDlSourceSubmenu()` (line 1408)
  - `renderDlEventSubmenu()` (line 1453)
  - `renderDlHasKeySubmenu()` (line 1513)
  - Each is a local `const esc = (s: string) => ...` that shadows the imported `esc`.

### 🟢 BUG-7: `getActiveTab()` / `setActiveTab()` unused externally
- **Files:** `src/panel/state.ts` lines 215, 222
- **Usage:** Only used within `detail-pane.ts` itself. Both are exported but only consumed internally.

---

## 2. DEAD CODE & UNUSED EXPORTS

| Location | Item | Status |
|----------|------|--------|
| `src/panel/utils/dom.ts:13` | `qs()` export | Never imported |
| `src/panel/utils/format.ts:32` | `escHtml` alias | Never imported |
| `src/panel/state.ts:422` | `resetProviders()` | Never called |
| `src/panel/datalayer/state.ts:265` | `setCorrelationLookback()` | Never called (getter is used) |
| `docs/` | 7 markdown files | Stale planning docs |

### Stale Docs Files (candidates for cleanup)
- `docs/UX-IMPROVEMENT-SPEC.md`
- `docs/datalayer-ui-ux-improvements.md`
- `docs/implementation-plan-provider-filter-redesign.md`
- `docs/provider-filter-redesign.md`
- `docs/provider-filter-v2-plan.md`
- `docs/PLAN-provider-icons-coverage.md`
- `docs/plans/split-clear-button.md`

---

## 3. STRUCTURAL ISSUES

### 3.1 `src/panel/tabs/` — misleading name
- **Contains:** `decoded.ts`, `query.ts`, `post.ts`, `headers.ts`, `response.ts`
- **Problem:** Word "tabs" in Chrome extension context means **browser tabs**. These are actually **detail pane tabs**. A new developer would look for browser tab logic here.
- **Fix:** Rename to `detail-tabs/`

### 3.2 `src/panel/datalayer/` — flat mix of concerns (9 files)
- **Problem:** state, UI components, utilities, engines all at same level. No way to distinguish a component from a utility from the filename alone.
- **Fix:** Split into `components/` and `utils/` subfolders

### 3.3 `HARPostData` interface duplicated
- `src/devtools/network-capture.ts` line 11
- `src/providers/url-parser.ts` line 9
- **Problem:** Both define identical `HARPostData` interfaces.

### 3.4 `src/panel/index.ts` is monolithic (2006 lines)
- Handles: view switching, request receiving/batching, DataLayer receiving/batching, keyboard navigation, toolbar handlers, quick actions, config UI, category toggling, copy handler, splitter drag, DL filter submenus (4 render functions), DL validation UI, DL sort UI, DL detail tab handlers.
- **Fix:** Extract DataLayer handlers into `src/panel/datalayer/handlers.ts`

---

## 4. IMPLEMENTATION PLAN

### Phase 1: Bug Fixes & Dead Code Removal
**Priority: HIGH | Estimated: 1-2 hours**

#### Step 1.1 — [BUG-1] Add `removeFromFiltered` export
**File:** `src/panel/state.ts`

Add this function (after `addFilteredId` at line ~177):
```typescript
/**
 * Remove a request ID from the filtered set (mark as not visible).
 */
export function removeFromFiltered(id: string): void {
  requestState.filteredIds.delete(id);
}
```

#### Step 1.2 — [BUG-6] Remove 5 inline `esc()` definitions
**File:** `src/panel/index.ts`

The file already imports `getEventName` from `./utils/format` (line 11), but does NOT import `esc`. Two changes:

1. **Add `esc` to the existing format import** on line 11:
   ```typescript
   // Before:
   import { getEventName } from './utils/format';
   // After:
   import { getEventName, esc } from './utils/format';
   ```

2. **Remove the local `esc` definition** from 4 functions — delete the line `const esc = (s: string) => ...` in each:
   - `createDlFilterChip()` (line 381)
   - `renderDlSourceSubmenu()` (line 1408)
   - `renderDlEventSubmenu()` (line 1453)
   - `renderDlHasKeySubmenu()` (line 1513)

   Note: The local `esc` in each function has a slightly different signature
   (some escape `"`, some don't). The imported `esc` from `format.ts` escapes all
   5 characters (`&`, `<`, `>`, `"`, `'`), which is a superset of what the local
   versions do. This is safe — more escaping is never wrong.

#### Step 1.3 — [BUG-2] Remove unused `qs()` export
**File:** `src/panel/utils/dom.ts`

Delete lines 13-18 (the entire `qs()` function):
```typescript
// DELETE THIS:
export function qs<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector<T>(selector);
}
```

#### Step 1.4 — [BUG-3] Remove unused `escHtml` alias
**File:** `src/panel/utils/format.ts`

Delete lines 29-32 (the alias + its JSDoc comment):
```typescript
// DELETE THIS:
/**
 * HTML escape a string (alias for esc, used for clarity in template contexts).
 */
export const escHtml = esc;
```

#### Step 1.5 — [BUG-4] Remove unused `resetProviders()`
**File:** `src/panel/state.ts`

Delete lines 418-424 (the function + its JSDoc comment):
```typescript
// DELETE THIS:
/**
 * Reset provider pill state (clears seen providers so pills are rebuilt on next request).
 * Does NOT clear hiddenProviders — filter preferences persist across clears.
 */
export function resetProviders(): void {
  activeProviders.clear();
}
```

#### Step 1.6 — [BUG-5] Remove unused `setCorrelationLookback()`
**File:** `src/panel/datalayer/state.ts`

Delete lines 265-266 (the unused setter — keep the getter on line 265):
```typescript
// DELETE THIS (the setter that was after the getter):
// Note: check the exact lines — only remove the setter function, keep getCorrelationLookback()
```

**Verification:** Run `npm run build` — must complete with zero errors.

---

### Phase 2: Folder Restructuring
**Priority: HIGH | Estimated: 1-2 hours**
**No runtime impact.** Rollup bundles everything into single IIFE files. Folder structure only affects development experience.

#### Step 2a — Rename `src/panel/tabs/` → `src/panel/detail-tabs/`

**Shell commands:**
```bash
git mv src/panel/tabs src/panel/detail-tabs
```

**Import changes — 1 file, 5 imports:**

**File:** `src/panel/components/detail-pane.ts` (lines 6-10)
```typescript
// Before:
import { renderCategorizedParams } from '../tabs/decoded';
import { renderParamTable } from '../tabs/query';
import { renderPostTab } from '../tabs/post';
import { renderHeadersTab, loadHeavyData } from '../tabs/headers';
import { renderResponse } from '../tabs/response';

// After:
import { renderCategorizedParams } from '../detail-tabs/decoded';
import { renderParamTable } from '../detail-tabs/query';
import { renderPostTab } from '../detail-tabs/post';
import { renderHeadersTab, loadHeavyData } from '../detail-tabs/headers';
import { renderResponse } from '../detail-tabs/response';
```

No other file imports from `tabs/`. ✅

**Verification:** Run `npm run build` — must complete with zero errors.

---

#### Step 2b — Split `src/panel/datalayer/` into subfolders

**Target structure:**
```
datalayer/
├── state.ts                        (zůstane na úrovni — jediný state file)
├── components/                     ← přesun
│   ├── push-list.ts
│   ├── push-detail.ts
│   └── live-inspector.ts
└── utils/                          ← přesun
    ├── diff-renderer.ts
    ├── ecommerce-formatter.ts
    ├── correlation.ts
    ├── reverse-correlation.ts
    └── validator.ts
```

**Shell commands:**
```bash
mkdir -p src/panel/datalayer/components src/panel/datalayer/utils
git mv src/panel/datalayer/push-list.ts src/panel/datalayer/components/push-list.ts
git mv src/panel/datalayer/push-detail.ts src/panel/datalayer/components/push-detail.ts
git mv src/panel/datalayer/live-inspector.ts src/panel/datalayer/components/live-inspector.ts
git mv src/panel/datalayer/diff-renderer.ts src/panel/datalayer/utils/diff-renderer.ts
git mv src/panel/datalayer/ecommerce-formatter.ts src/panel/datalayer/utils/ecommerce-formatter.ts
git mv src/panel/datalayer/correlation.ts src/panel/datalayer/utils/correlation.ts
git mv src/panel/datalayer/reverse-correlation.ts src/panel/datalayer/utils/reverse-correlation.ts
git mv src/panel/datalayer/validator.ts src/panel/datalayer/utils/validator.ts
```

**Import changes — 7 files, 13 imports:**

##### File 1: `src/panel/components/detail-pane.ts` (2 imports)
```typescript
// Before:
import { findTriggeringPush, renderTriggeredBy, hideTriggeredByBanner } from '../datalayer/reverse-correlation';
import { getAllDlPushes } from '../datalayer/state';

// After (reverse-correlation moved to utils/):
import { findTriggeringPush, renderTriggeredBy, hideTriggeredByBanner } from '../datalayer/utils/reverse-correlation';
import { getAllDlPushes } from '../datalayer/state';
```

##### File 2: `src/panel/components/status-bar.ts` (1 import)
```typescript
// Before:
import { getAllDlPushes, getDlVisibleCount, getDlTotalCount } from '../datalayer/state';

// After (state.ts stays at same level — NO CHANGE):
import { getAllDlPushes, getDlVisibleCount, getDlTotalCount } from '../datalayer/state';
```
**No change needed.** ✅

##### File 3: `src/panel/index.ts` (5 imports)
```typescript
// Before:
import * as dlState from './datalayer/state';
import { createDlPushRow, getSourceColor, setActiveDlRow, updateDlStatusText, dlMatchesFilter, exportDlJson, exportDlCsv, updateDlRowValidation, getSortedDlPushIds, renderGroupedPushList } from './datalayer/push-list';
import { selectDlPush, closeDlDetail, initDlDetailTabHandlers } from './datalayer/push-detail';
import { queueHighlights, checkWatchPaths, clearLiveState } from './datalayer/live-inspector';
import { validatePush, loadValidationRules, saveValidationRules } from './datalayer/validator';
import { getValidationErrors, setValidationErrors, clearValidationErrors, getValidationRules, setValidationRules, isValidationLoaded, setValidationLoaded, getDlSortField, setDlSortField, getDlSortOrder, toggleDlSortOrder, getDlGroupBySource, setDlGroupBySource, initDlSortState } from './datalayer/state';

// After:
import * as dlState from './datalayer/state';
import { createDlPushRow, getSourceColor, setActiveDlRow, updateDlStatusText, dlMatchesFilter, exportDlJson, exportDlCsv, updateDlRowValidation, getSortedDlPushIds, renderGroupedPushList } from './datalayer/components/push-list';
import { selectDlPush, closeDlDetail, initDlDetailTabHandlers } from './datalayer/components/push-detail';
import { queueHighlights, checkWatchPaths, clearLiveState } from './datalayer/components/live-inspector';
import { validatePush, loadValidationRules, saveValidationRules } from './datalayer/utils/validator';
import { getValidationErrors, setValidationErrors, clearValidationErrors, getValidationRules, setValidationRules, isValidationLoaded, setValidationLoaded, getDlSortField, setDlSortField, getDlSortOrder, toggleDlSortOrder, getDlGroupBySource, setDlGroupBySource, initDlSortState } from './datalayer/state';
```

##### File 4: `src/panel/datalayer/components/push-list.ts` (1 import)
```typescript
// Before (when file was at datalayer/push-list.ts):
import {
  getAllDlPushes,
  getDlFilteredIds,
  getDlSelectedId,
  getValidationErrors,
  getDlSortField,
  getDlSortOrder,
} from './state';

// After (file moved to datalayer/components/push-list.ts, state.ts stayed at datalayer/):
import {
  getAllDlPushes,
  getDlFilteredIds,
  getDlSelectedId,
  getValidationErrors,
  getDlSortField,
  getDlSortOrder,
} from '../state';
```

##### File 5: `src/panel/datalayer/components/push-detail.ts` (5 imports)
```typescript
// Before (when file was at datalayer/push-detail.ts):
import { getAllDlPushes, computeCumulativeState, getValidationErrors, getCorrelationWindow, setCorrelationWindow } from './state';
import { deepDiff, renderDiff } from './diff-renderer';
import { renderEcommerceTable, detectEcommerceType } from './ecommerce-formatter';
import { findCorrelatedRequests, renderCorrelation } from './correlation';
import { getSourceColor, getSourceBadge } from './push-list';
import { renderLiveInspector } from './live-inspector';

// After (file moved to datalayer/components/push-detail.ts):
import { getAllDlPushes, computeCumulativeState, getValidationErrors, getCorrelationWindow, setCorrelationWindow } from '../state';
import { deepDiff, renderDiff } from '../utils/diff-renderer';
import { renderEcommerceTable, detectEcommerceType } from '../utils/ecommerce-formatter';
import { findCorrelatedRequests, renderCorrelation } from '../utils/correlation';
import { getSourceColor, getSourceBadge } from './push-list';  // same folder, no change
import { renderLiveInspector } from './live-inspector';  // same folder, no change
```

##### File 6: `src/panel/datalayer/components/live-inspector.ts` (1 import)
```typescript
// Before (when file was at datalayer/live-inspector.ts):
import {
  getWatchedPaths,
  addWatchedPath,
  removeWatchedPath,
  clearWatchedPaths,
} from './state';

// After (file moved to datalayer/components/live-inspector.ts):
import {
  getWatchedPaths,
  addWatchedPath,
  removeWatchedPath,
  clearWatchedPaths,
} from '../state';
```

##### File 7: `src/panel/datalayer/utils/correlation.ts` (1 import)
```typescript
// Before (when file was at datalayer/correlation.ts):
import { getCorrelationWindow, getCorrelationLookback } from './state';

// After (file moved to datalayer/utils/correlation.ts):
import { getCorrelationWindow, getCorrelationLookback } from '../state';
```

##### No import changes needed:
- `src/panel/datalayer/state.ts` — no internal imports from datalayer peers ✅
- `src/panel/datalayer/utils/diff-renderer.ts` — only imports from `@/types/datalayer` ✅
- `src/panel/datalayer/utils/ecommerce-formatter.ts` — only imports from `@/shared/ecommerce` and `../utils/format` ✅
- `src/panel/datalayer/utils/reverse-correlation.ts` — only imports from `@/types/*` ✅
- `src/panel/datalayer/utils/validator.ts` — only imports from `@/types/datalayer` ✅

**Verification:** Run `npm run build` — must complete with zero errors.

---

#### Step 2c — Clean up stale docs

**Delete these 7 files:**
```bash
rm docs/UX-IMPROVEMENT-SPEC.md
rm docs/datalayer-ui-ux-improvements.md
rm docs/implementation-plan-provider-filter-redesign.md
rm docs/provider-filter-redesign.md
rm docs/provider-filter-v2-plan.md
rm docs/PLAN-provider-icons-coverage.md
rm docs/plans/split-clear-button.md
rmdir docs/plans
```

Keep `docs/CODEBASE-REVIEW.md` (this file).

**Verification:** Run `npm run build` — no impact expected.

---

### Phase 3: Code Deduplication & Refactoring
**Priority: MEDIUM | Estimated: 2-3 hours**

#### Step 3.1 — Extract `HARPostData` to shared types

**Create file:** `src/types/har.ts`
```typescript
/**
 * HAR (HTTP Archive) POST data format.
 * Used by both devtools network capture and provider URL parser.
 */
export interface HARPostData {
  text?: string;
  raw?: Array<{ bytes?: string }>;
  mimeType?: string;
}
```

**Update 2 files:**

**File:** `src/devtools/network-capture.ts` (line 11)
```typescript
// Before:
interface HARPostData {
  text?: string;
  raw?: Array<{ bytes?: string }>?;
  mimeType?: string;
}

// After:
import type { HARPostData } from '@/types/har';
```
(Delete the local interface, add the import at top of file)

**File:** `src/providers/url-parser.ts` (line 9)
```typescript
// Before:
interface HARPostBody {
  text?: string;
  raw?: Array<{ bytes?: string }>?;
  mimeType?: string;
}

// After:
import type { HARPostData } from '@/types/har';
```
(Delete the local interface, add the import at top of file. Note: url-parser calls it `HARPostBody` — rename all usages of `HARPostBody` to `HARPostData` in the same file, or import as `import type { HARPostData as HARPostBody }` to minimize changes.)

**Verification:** Run `npm run build` — must complete with zero errors.

#### Step 3.2 — Extract DL handlers from `src/panel/index.ts`

**Create file:** `src/panel/datalayer/handlers.ts`

Move the following functions from `index.ts` to `handlers.ts`:
- `initDatalayerHandlers()` (line 1245-1897)
- `dlApplyFilter()` (line 348-372)
- `updateDlFilterChips()` (line 401-466)
- `createDlFilterChip()` (line 376-399)
- `renderDlPushListFull()` (line 1198-1241)
- `flushPendingDlPushes()` (line 470-541)
- `dlClearAll()` (line 321-344)
- `initDlDetailTabHandlers` call (line 1867)

This is the most complex refactor. Recommend doing it as a separate PR after Phases 1-2.

---

### Phase 4: Future Improvements
**Priority: LOW (future)**

1. **ESLint** — add minimal config for unused exports, consistent quotes, no-console warnings
2. **Further split `src/panel/index.ts`**:
   - `src/panel/toolbar.ts` — quick actions, export, theme
   - `src/panel/splitter.ts` — splitter drag logic
   - `src/panel/keyboard.ts` — keyboard navigation
3. **Provider icon size optimization** — `provider-icons.ts` is ~283 lines of base64 SVGs. Consider lazy-loading.
4. **Config migration strategy** — versioned migration system for `chrome.storage.local`
5. **`src/providers/url-parser.ts`** — consider moving to `src/shared/` (it's a general utility used by all providers, ~20 imports to update)

---

## 5. RISK ASSESSMENT

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| BUG-1 (removeFromFiltered) causes prune crash | HIGH | HIGH (triggers on >500 requests) | Fix in Phase 1 |
| Panel index.ts too large for maintenance | MEDIUM | HIGH | Phase 3 extract DL handlers |
| Duplicated HARPostData type drift | LOW | LOW | Phase 3 extract to shared types |
| Folder rename breaks imports | MEDIUM | LOW | TypeScript catches at build time; every import mapped above |
| Phase 2b (datalayer split) breaks cross-references | LOW | LOW | All 13 internal imports mapped in detail above |

---

## 6. SUMMARY STATISTICS

- **Total source files:** ~75 TypeScript files
- **Total lines of code:** ~15,000+ (estimated)
- **Providers:** 69 registered
- **Largest file:** `src/panel/index.ts` (2006 lines)
- **Bugs found:** 7 (1 critical, 5 minor, 1 cosmetic)
- **Dead code items:** 5
- **Folder issues:** 2 (misleading name, flat mix)
- **Structural issues:** 2 (monolithic file, duplicated type)
