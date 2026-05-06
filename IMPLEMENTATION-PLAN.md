# Implementation Plan: Legacy Provider Cleanup (Approach B)

**Created:** 2026-07-24  
**Status:** Pending  
**Approach:** B — Medium cleanup (remove definitively legacy + strongly declining)

---

## 1. Providers Being Removed (5)

| # | Provider | Name in code | File | Reason |
|---|---|---|---|---|
| 1 | Adobe DTM | `Adobe DTM` | `src/providers/adobe/dtm.ts` | Product sunsetted, replaced by Adobe Launch |
| 2 | Adobe Heartbeat | `Adobe Heartbeat` | `src/providers/adobe/heartbeat.ts` | API deprecated, replaced by Media Collection API / AEP Web SDK |
| 3 | Adobe AAM | `Adobe AAM` | `src/providers/adobe/aam.ts` | End-of-life, replaced by Real-Time CDP |
| 4 | Webtrends | `Webtrends` | `src/providers/webtrends.ts` | Market-marginal, vast majority migrated to GA4/Adobe |
| 5 | Zemanta | `Zemanta` | `src/providers/zemanta.ts` | Acquired by Outbrain (2017), functional duplicate of `outbrain.ts` |

## 2. Providers Explicitly Kept

- **Adobe ECID** — Still relevant transitional layer, many active implementations
- **AT Internet** — Still active under Piano Analytics brand, strong in EU/France
- **Crazy Egg** — Still operational and selling
- **Ensighten** — Only TMS besides GTM/Tealium/Adobe Launch/Piwik PRO
- **DoubleClick** — Floodlight endpoints still actively used in Google Campaign Manager 360

---

## 3. Files to DELETE (15 files)

### 3.1 Provider source files (5)
```
src/providers/adobe/dtm.ts
src/providers/adobe/heartbeat.ts
src/providers/adobe/aam.ts
src/providers/webtrends.ts
src/providers/zemanta.ts
```

### 3.2 Test files (5)
```
tests/providers/adobe/dtm.test.ts
tests/providers/adobe/heartbeat.test.ts
tests/providers/adobe/aam.test.ts
tests/providers/webtrends.test.ts
tests/providers/zemanta.test.ts
```

### 3.3 Category files (5)
```
src/shared/categories/adobe/dtm.ts
src/shared/categories/adobe/heartbeat.ts
src/shared/categories/adobe/aam.ts
src/shared/categories/analytics/webtrends.ts
src/shared/categories/marketing/zemanta.ts
```

---

## 4. Files to EDIT (4 files)

### 4.1 `src/providers/index.ts`

**Remove imports (5):**
- Line 15: `import { adobeHeartbeat } from './adobe/heartbeat';`
- Line 18: `import { adobeAAM } from './adobe/aam';`
- Line 19: `import { adobeDTM } from './adobe/dtm';`
- Line 39: `import { webtrends } from './webtrends';`
- Line 67: `import { zemanta } from './zemanta';`

**Remove from PROVIDERS array (5):**
- Line 145: `webtrends,`
- Line 165: `adobeHeartbeat, // heartbeat.omtrdc.net before adobeTarget`
- Line 168: `adobeAAM, // dpm.demdex.net before adobeAA`
- Line 169: `adobeDTM,`
- Line 182: `zemanta,`

**Update ordering comment (line 109):**
```
BEFORE: aepWebSDK → adobeHeartbeat → adobeTarget → adobeECID → adobeAAM → adobeDTM → adobeLaunchChina → adobeAA
AFTER:  aepWebSDK → adobeTarget → adobeECID → adobeLaunchChina → adobeAA
```

### 4.2 `src/shared/categories/index.ts`

**Remove imports (5):**
- Line 17: `import { AAM_CATEGORIES } from './adobe/aam';`
- Line 19: `import { HEARTBEAT_CATEGORIES } from './adobe/heartbeat';`
- Line 20: `import { DTM_CATEGORIES } from './adobe/dtm';`
- Line 53: `import { ZEMANTA_CATEGORIES } from './marketing/zemanta';`
- Line 70: `import { WEBTRENDS_CATEGORIES } from './analytics/webtrends';`

**Remove from PROVIDER_CATEGORIES object (5):**
- Line 107: `'Adobe AAM': AAM_CATEGORIES,`
- Line 109: `'Adobe Heartbeat': HEARTBEAT_CATEGORIES,`
- Line 110: `'Adobe DTM': DTM_CATEGORIES,`
- Line 143: `Zemanta: ZEMANTA_CATEGORIES,`
- Line 160: `Webtrends: WEBTRENDS_CATEGORIES,`

### 4.3 `src/shared/provider-groups.ts`

**From analytics group (line 29):**
- Remove `'Webtrends',`

**From marketing group (line 64):**
- Remove `'Zemanta',`

**From adobe-stack group (lines 108-111):**
- Remove `'Adobe AAM',`
- Remove `'Adobe Heartbeat',`
- Remove `'Adobe DTM',`

### 4.4 `src/panel/utils/icon-registry.ts`

**Remove 5 SVG icon entries:**
- `'Adobe AAM': ...` (lines 17-19)
- `'Adobe DTM': ...` (lines 25-27)
- `'Adobe Heartbeat': ...` (lines 33-35)
- `'Webtrends': ...` (lines 266-273)
- `'Zemanta': ...` (lines 275-279)

---

## 5. Wiki Cleanup (5 delete + 7 edit)

### 5.1 DELETE wiki pages (5)
```
wiki/wiki/providers/adobe-dtm.md
wiki/wiki/providers/adobe-heartbeat.md
wiki/wiki/providers/adobe-aam.md
wiki/wiki/providers/webtrends.md
wiki/wiki/providers/zemanta.md
```

### 5.2 EDIT wiki pages (7)

**`wiki/wiki/index.md`** — Remove 5 rows from provider table:
- Webtrends row
- Zemanta row
- Adobe AAM row
- Adobe Heartbeat row
- Adobe DTM row

**`wiki/wiki/categories/analytics.md`** — Remove Webtrends row from table

**`wiki/wiki/categories/marketing.md`** — Remove Zemanta row from table

**`wiki/wiki/categories/adobe-stack.md`** — Remove AAM, Heartbeat, DTM rows; remove AAM cross-device reference

**`wiki/wiki/connections/adobe-stack-deep.md`** — Remove references to AAM, Heartbeat, DTM from:
- Provider table (3 rows)
- ECID integration table
- Video section (Heartbeat)
- Legacy DTM section
- Domain table (3 rows)

**`wiki/wiki/providers/adobe-ecid.md`** — Remove wikilinks to `[[adobe-aam]]` and `[[adobe-dtm]]`; rephrase affected sentences

**`wiki/wiki/providers/adobe-launch-china.md`** — Remove wikilinks to `[[adobe-dtm]]` and `[[adobe-aam]]`; rephrase affected sentences

---

## 6. JEAN.md Updates

Update these references:
- Line 9: `"67 tracking providers"` → `"62 tracking providers"`
- Line 30: `"67 provider matchers"` → `"62 provider matchers"`
- Line 49: `"67 provider matchers in flat files + vendor subfolders (adobe/8, ...)"` → `"62 provider matchers in flat files + vendor subfolders (adobe/5, ...)"`
- Line 53: `"83 total"` → `"78 total"`
- Line 163: `"providers/            # One page per tracking provider (67 total)"` → `"providers/            # One page per tracking provider (62 total)"`

---

## 7. Execution Order

| Step | Action | Files | Verify |
|------|--------|-------|--------|
| 1 | Delete provider source files | 5 files | — |
| 2 | Delete test files | 5 files | — |
| 3 | Delete category files | 5 files | — |
| 4 | Edit `src/providers/index.ts` | Remove imports + array entries + update comment | — |
| 5 | Edit `src/shared/categories/index.ts` | Remove imports + object entries | — |
| 6 | Edit `src/shared/provider-groups.ts` | Remove from 3 groups | — |
| 7 | Edit `src/panel/utils/icon-registry.ts` | Remove 5 SVG entries | — |
| 8 | `npm run build` | — | Build succeeds without errors |
| 9 | `npm run test` | — | All 78 tests pass |
| 10 | `npm run lint && npm run format:check` | — | No lint/format errors |
| 11 | Wiki cleanup | Delete 5 + edit 7 pages | — |
| 12 | Update `JEAN.md` | Update counts | — |
| 13 | Commit | Single commit: "chore: remove 5 legacy providers (DTM, Heartbeat, AAM, Webtrends, Zemanta)" | — |

---

## 8. Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Provider count | 67 | 62 |
| Test files | 83 | 78 |
| Source files in providers/ | 71 total (3 utility + 1 event-types + 53 root providers + 8 adobe/ + 3 google/ + 1 meta/ + 2 microsoft/) | 66 total (3 utility + 1 event-types + 48 root providers + 5 adobe/ + 3 google/ + 1 meta/ + 2 microsoft/) |
| Bundle size (estimated) | — | ~1.5–3 KB reduction in minified IIFE |
| Adobe subfolder | 8 files | 5 files (analytics, target, ecid, aep-websdk, launch-china) |

---

## 9. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| User has active DTM/AAM/Heartbeat implementations | Low — all are deprecated/EOL | Acceptable: those users are migrating anyway |
| Domain index misses after removal | None — index is built dynamically from remaining providers | Auto-healed on next build |
| Test count change breaks CI expectations | None — Vitest discovers tests dynamically | Will show 78 passing instead of 83 |
| Wiki cross-references break | Medium — 2 provider pages link to removed providers | Fixed in step 11 |

---

## 10. Post-Cleanup Verification Checklist

- [ ] `npm run build` — no TypeScript errors
- [ ] `npm run test` — 78 tests pass, 0 failures
- [ ] `npm run lint` — no errors
- [ ] `npm run format:check` — passes
- [ ] Manual check: no dangling imports in `providers/index.ts`
- [ ] Manual check: no dangling imports in `shared/categories/index.ts`
- [ ] Manual check: no dangling entries in `provider-groups.ts`
- [ ] Manual check: no stale SVG entries in `icon-registry.ts`
- [ ] Wiki: no broken wikilinks to removed provider pages
- [ ] JEAN.md counts updated (lines 9, 30, 49, 53, 163)
