# TagDragon Performance Optimization Plan

> **Verze:** 1.0  
> **Cíl:** Systematický refactoring pro zlepšení performance — cílový scénář: 100+ requestů, stovky až tisíce DataLayer pushů, pomalejší prohlížeč  
> **Přístup:** Fáze 1 (Surgical Hot-Path) + Fáze 2 (Rendering Overhaul), bez virtual scrolling

---

## Fáze 1 — Surgical Hot-Path Optimization

**Cíl:** Eliminovat největší bottlenecky s minimálními změnami v kódu.  
**Odhadovaný effort:** 2-3 dny  
**Riziko:** Velmi nízké — izolované změny, snadno reverzovatelné

---

### 1.1 Pre-parse timestamps na ingestu

**Problém:**  
`findCorrelatedRequests()` (`src/panel/datalayer/correlation.ts:27,32,41`) parsuje `new Date(push.timestamp).getTime()` a `new Date(r.timestamp).getTime()` pro **každý** request při každém otevření correlation tabu. Stejný problém v `findTriggeringPush()` (`src/panel/datalayer/reverse-correlation.ts:26,32`). Pro 500 requestů a 500 pushí to je 1000+ `new Date()` parsing operací.

**Řešení:**  
Přidat `_ts: number` (parsed timestamp v ms) na `ParsedRequest` a `DataLayerPush`, vypočítat jednorázově při ingestu.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/types/request.ts` | Přidat `_ts?: number` do `ParsedRequest` |
| `src/types/datalayer.ts` | Přidat `_ts?: number` do `DataLayerPush` |
| `src/devtools/network-capture.ts:102` | Při tvorbě `ParsedRequest` přidat `_ts: Date.now()` (nebo `Date.parse(timestamp)` po vytvoření) |
| `src/panel/index.ts:327-329` | Při enrichmentu `DataLayerPush` přidat `_ts: Date.parse(push.timestamp)` |
| `src/panel/datalayer/correlation.ts:27,32,41` | Nahradit `new Date(push.timestamp).getTime()` → `push._ts ?? new Date(push.timestamp).getTime()` (s fallback) |
| `src/panel/datalayer/reverse-correlation.ts:26,32` | Stejná změna — použít `_ts` s fallback |

**Detail implementace:**

```typescript
// src/devtools/network-capture.ts — processRequest()
const parsedRequest: ParsedRequest = {
  // ... existing fields
  _ts: Date.now(),  // ← PřIDAT
};

// src/panel/index.ts — receiveDataLayerPush()
const enrichedPush: DataLayerPush = {
  ...push,
  _ts: Date.parse(push.timestamp),  // ← PřIDAT
  cumulativeState,
  _eventName: push._eventName ?? ...,
  sourceLabel: push.sourceLabel || push.source.toUpperCase(),
};

// src/panel/datalayer/correlation.ts — findCorrelatedRequests()
const pushTime = push._ts ?? new Date(push.timestamp).getTime();
// ...
const reqTime = r._ts ?? new Date(r.timestamp).getTime();
```

**Poznámka:** Fallback (`?? new Date()`) zajišťuje backward compatibility — starší requesty bez `_ts` budou stále fungovat.

**Očekávaný dopad:**  
Correlation výpočet z O(n) × `new Date()` parsing → O(n) × property lookup. Při 500 requestech ušetří ~1000× `new Date()` volání. Měřitelný rozdíl v DevTools Performance tab.

---

### 1.2 Provider matching — domain-first lookup

**Problém:**  
`matchProvider()` (`src/providers/index.ts:214`) dělá lineární scan 68 regexů na **každý** network request. Na typické stránce je 90%+ requestů obrázky, CSS, fonts, API volání — žádný provider ne-matchne. Pro každý z nich se spustí 68 regex testů zbytečně.

**Řešení:**  
Vytvořit `Map<string, number[]>` (hostname → indexy providerů v `PROVIDERS` array). Nejprve lookup hostname (O(1) hash), testnout jen relevantní regexy. Fallback na full scan pro generic patterny.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/providers/index.ts` | Přidat `domainIndex` mapu + upravit `matchProvider()` |

**Detail implementace:**

```typescript
// src/providers/index.ts

// ─── DOMAIN INDEX ────────────────────────────────────────────────────────
// Pre-built index: hostname → provider indices for fast first-pass lookup.
// Providers whose pattern doesn't start with a specific domain are indexed
// under a special "*" key for full-scan fallback.

const domainIndex = new Map<string, number[]>();
const genericIndices: number[] = [];

function buildDomainIndex(): void {
  PROVIDERS.forEach((provider, idx) => {
    const pattern = provider.pattern.source;
    
    // Try to extract a hostname from the regex pattern
    // Patterns like: /google-analytics\.com\/g\/collect/
    // We look for domain-like segments: xxx\.yyy\.zzz
    const domainMatch = pattern.match(/([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/);
    
    if (domainMatch) {
      // Extract just the effective domain for indexing
      // e.g. "google-analytics.com" from "www.google-analytics.com"
      const fullDomain = domainMatch[0];
      const parts = fullDomain.split('.');
      // Use last 2-3 parts as key (e.g. "google-analytics.com")
      const key = parts.length >= 3 && parts[0] !== 'www'
        ? parts.slice(1).join('.')
        : fullDomain;
      
      if (!domainIndex.has(key)) {
        domainIndex.set(key, []);
      }
      domainIndex.get(key)!.push(idx);
    } else {
      genericIndices.push(idx);
    }
  });
}

// Build once at module load
buildDomainIndex();

// ─── ENHANCED MATCH ──────────────────────────────────────────────────────

export function matchProvider(url: string): Provider | null {
  try {
    const hostname = new URL(url).hostname;
    
    // Find the longest matching domain key
    // e.g. for "collect.tealiumiq.com", try both "tealiumiq.com" and "collect.tealiumiq.com"
    let candidates: number[] = [];
    
    // Check exact hostname first
    const exact = domainIndex.get(hostname);
    if (exact) candidates.push(...exact);
    
    // Check parent domain (remove first subdomain)
    const dotIdx = hostname.indexOf('.');
    if (dotIdx > 0) {
      const parent = hostname.slice(dotIdx + 1);
      const parentMatch = domainIndex.get(parent);
      if (parentMatch) candidates.push(...parentMatch);
    }
    
    // Also check for "www." prefix
    if (hostname.startsWith('www.')) {
      const withoutWww = hostname.slice(4);
      const wwwMatch = domainIndex.get(withoutWww);
      if (wwwMatch) candidates.push(...wwwMatch);
    }
    
    // Test candidates first (most likely match), then generic
    const ordered = [...candidates, ...genericIndices];
    for (const idx of ordered) {
      if (PROVIDERS[idx].pattern.test(url)) {
        return PROVIDERS[idx] as Provider;
      }
    }
  } catch {
    // URL parsing failed, fall through to full scan
  }
  
  // Fallback: full scan (should rarely be reached)
  return PROVIDERS.find(p => p.pattern.test(url)) ?? null;
}
```

**Očekávaný dopad:**  
Pro 90%+ requestů (non-tracking) se sníží z 68 regex testů na 0-5 (typicky jen genericIndices fallback). Na stránce se 1000 network requesty to znamená ~60,000 méně regex operací. Největší single-item vylepšení pro content script overhead.

**Testování:**  
- Ověřit že `matchProvider()` vrací stejné výsledky pro reprezentativní URL set
- Kontrola ordering: domain-first lookup nesmí změnit pořadí matching (first match wins)
- Test na URL s nevalidní hostname (fallback)

---

### 1.3 DataLayer RAF batching

**Problém:**  
`receiveDataLayerPush()` (`src/panel/index.ts:316-402`) dělá synchronně při každém push:
1. Compute cumulative state (shallow copy + iterate)
2. `computeChangedPaths()` s `JSON.stringify` compare
3. `validatePush()` na každý push
4. `createDlPushRow()` — DOM creation
5. `appendChild()` — DOM mutation
6. `updateDlStatusText()` — DOM reads
7. Update tab badges — DOM writes

To vše synchronně, bez jakéhokoliv batching. Při GTM stránce s 50+ pushi při page load to znamená 50+ synchronních render cyklů, což blokuje main thread.

Network requesty už mají RAF batching (`src/panel/index.ts:170,468-470`). DataLayer nemá.

**Řešení:**  
Přidat stejný RAF batching pattern pro DataLayer pushe.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/datalayer/state.ts` | Přidat `dlPendingPushes` queue + `dlRafId` + getters/setters |
| `src/panel/index.ts:316-402` | Refaktor `receiveDataLayerPush()` — queue push data, flush v RAF |
| `src/panel/index.ts` | Přidat `flushPendingDlPushes()` funkci |

**Detail implementace:**

```typescript
// src/panel/datalayer/state.ts — PŘIDAT

// ─── DATALAYER BATCHING STATE ─────────────────────────────────────────────

interface DlPendingPush {
  push: DataLayerPush;
  isVisible: boolean;
}

let dlPendingPushes: DlPendingPush[] = [];
let dlRafId: number | null = null;

export function addDlPendingPush(item: DlPendingPush): void {
  dlPendingPushes.push(item);
}

export function getDlPendingPushes(): DlPendingPush[] {
  return dlPendingPushes;
}

export function clearDlPendingPushes(): void {
  dlPendingPushes = [];
}

export function getDlRafId(): number | null {
  return dlRafId;
}

export function setDlRafId(id: number | null): void {
  dlRafId = id;
}
```

```typescript
// src/panel/index.ts — UPRAVIT receiveDataLayerPush()

window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (dlState.getDlIsPaused()) return;

  // Compute cumulative state (kept synchronous — cheap shallow copy)
  const allPushes = dlState.getAllDlPushes();
  const prevState = allPushes.length > 0 ? allPushes[allPushes.length - 1].cumulativeState : {};
  const cumulativeState: Record<string, unknown> = { ...prevState };
  for (const [k, v] of Object.entries(push.data)) {
    cumulativeState[k] = v;
  }

  const enrichedPush: DataLayerPush = {
    ...push,
    _ts: Date.parse(push.timestamp),  // ← z 1.1
    cumulativeState,
    _eventName: push._eventName ?? (typeof push.data['event'] === 'string' ? push.data['event'] : undefined),
    sourceLabel: push.sourceLabel || push.source.toUpperCase(),
  };

  dlState.addDlPush(enrichedPush);

  // Queue for batched rendering — instead of immediate DOM operations
  const filterText = dlState.getDlFilterText();
  const isVisible = dlMatchesFilter(enrichedPush, filterText, ...);
  if (isVisible) dlState.addDlFilteredId(push.id);

  dlState.addDlPendingPush({ push: enrichedPush, isVisible });
  if (!dlState.getDlRafId()) {
    dlState.setDlRafId(requestAnimationFrame(flushPendingDlPushes));
  }
};
```

```typescript
// src/panel/index.ts — NOVÁ FUNKCE

function flushPendingDlPushes(): void {
  dlState.setDlRafId(null);
  const pending = dlState.getDlPendingPushes();
  if (pending.length === 0) return;

  // 1. Compute highlights + validation in batch (still synchronous but batched)
  const allPushes = dlState.getAllDlPushes();
  for (let i = allPushes.length - pending.length; i < allPushes.length; i++) {
    if (i < 1) continue;
    const prevPush = allPushes[i - 1];
    const currPush = allPushes[i];
    const changedPaths = computeChangedPaths(prevPush.cumulativeState, currPush.cumulativeState);
    if (changedPaths.size > 0) {
      queueHighlights(changedPaths);
      checkWatchPaths(prevPush.cumulativeState, currPush.cumulativeState);
    }

    if (dlState.isValidationLoaded()) {
      const rules = dlState.getValidationRules();
      const errors = validatePush(currPush, rules);
      if (errors.length > 0) {
        dlState.setValidationErrors(currPush.id, errors);
      }
    }
  }

  // 2. Batch DOM updates using DocumentFragment
  const $list = DOM.dlPushList;
  const $empty = DOM.dlEmptyState;
  if ($empty && dlState.getDlTotalCount() > 0) {
    $empty.style.display = 'none';
  }

  if ($list) {
    const fragment = document.createDocumentFragment();
    for (const { push, isVisible } of pending) {
      try {
        const row = createDlPushRow(push, isVisible, (p, r) => {
          dlState.setDlSelectedId(p.id);
          setActiveDlRow(r);
          selectDlPush(p, r, gotoNetworkRequest);
        });
        fragment.appendChild(row);
      } catch (e) {
        console.warn('[TagDragon] Failed to create push row:', e);
      }
    }
    $list.appendChild(fragment);
  }

  dlState.clearDlPendingPushes();

  // 3. Single status update
  updateDlStatusText(dlState.getDlVisibleCount(), dlState.getDlTotalCount());

  // 4. Update badges (single write)
  const $dlBadge = DOM.tabBadgeDatalayer;
  if ($dlBadge) $dlBadge.textContent = String(dlState.getDlTotalCount());
  const $count = document.getElementById('dl-push-count');
  if ($count) {
    const n = dlState.getDlTotalCount();
    $count.textContent = `${n} push${n !== 1 ? 'es' : ''}`;
  }

  // 5. Validation error count badge (single computation)
  const $rulesCount = document.getElementById('dl-rules-count');
  if ($rulesCount) {
    const totalErrors = dlState.getAllDlPushes().reduce(
      (sum, p) => sum + dlState.getValidationErrors(p.id).length, 0
    );
    if (totalErrors > 0) {
      $rulesCount.style.display = '';
      $rulesCount.textContent = String(totalErrors);
      $rulesCount.style.color = 'var(--red)';
    } else {
      $rulesCount.style.display = 'none';
    }
  }
}
```

**Důležité — edge case s DevTools v pozadí:**  
Komentář v původním kódu (řádek 360-361) zmiňuje: *"DevTools window may be in background when user reloads the page, causing requestAnimationFrame to never fire"*. Tento problém je reálný ale řešitelný:

- Když je panel v pozadí, `requestAnimationFrame` se nezavolá. Ale při focus na panel (nebo při další push) se RAF spustí a vyprázdní frontu.
- Push data se stále ukládají do `dlState.all[]` (to zůstává synchronní). Jen DOM rendering je odložen.
- Pokud přijde další push, přidá se do fronty a RAF callback se znovu naplánování (protože `dlRafId` je null po vyprázdnění).

Pro extra safety můžeme přidat:

```typescript
// In receiveDataLayerPush — after queueing
if (pending.length > 50) {
  // Force flush for very large bursts to avoid memory buildup
  cancelAnimationFrame(dlState.getDlRafId()!);
  flushPendingDlPushes();
}
```

**Očekávaný dopad:**  
50 synchronních DOM operací při page load → 1 RAF batch. Měříitelné zlepšení v Chrome DevTools Performance tab — méně layout thrashing, méně forced reflows.

---

### 1.4 Eliminovat redundantní volání v createRequestRow

**Problém:**  
`createRequestRow()` (`src/panel/components/request-list.ts:57-58`) volá `getConfig()` a `getAllRequests()[0]?.timestamp` pro **každý** row:

```typescript
const cfg = getConfig();                              // shallow copy každý row
const sessionStart = getAllRequests()[0]?.timestamp;  // array access
```

`getConfig()` vrací `{ ...config }` (shallow copy) — zbytečná alloc při každém row. Při flush 20 requestů = 20 shallow copies.

**Řešení:**  
Předat `cfg` a `sessionStart` jako parametry do `flushPendingRequests()`, ty pak předá `createRequestRow()`.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/components/request-list.ts:53` | Přidat `cfg` a `sessionStart` parametry do `createRequestRow()` |
| `src/panel/index.ts:170-200` | Předat hodnoty z `flushPendingRequests()` |

**Detail implementace:**

```typescript
// src/panel/components/request-list.ts

export function createRequestRow(
  data: ParsedRequest,
  isVisible: boolean,
  cfg: Readonly<AppConfig>,    // ← NOVÝ param
  sessionStart?: string,       // ← NOVÝ param
): HTMLElement {
  const row = rowTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement;
  row.dataset.id = String(data.id);
  
  // Předtím: const cfg = getConfig();
  // Předtím: const sessionStart = getAllRequests()[0]?.timestamp;
  const time = formatTimestamp(data.timestamp, cfg.timestampFormat, sessionStart);
  // ... zbytek beze změny
}
```

```typescript
// src/panel/index.ts — flushPendingRequests()

function flushPendingRequests(): void {
  state.setRafId(null);
  if (state.getPendingRequests().length === 0) return;

  const empty = DOM.empty;
  if (empty) empty.style.display = 'none';

  // Cache once per flush batch
  const cfg = state.getConfig();
  const sessionStart = state.getAllRequests()[0]?.timestamp;

  const fragment = document.createDocumentFragment();
  for (const { data, isVisible } of state.getPendingRequests()) {
    ensureProviderPill(data, doApplyFilters, doUpdateActiveFilters);
    const row = createRequestRow(data, isVisible, cfg, sessionStart);  // ← PŘEDAT
    fragment.appendChild(row);
  }
  // ... zbytek beze změny
}
```

**Očekávaný dopad:**  
Menší ale čistá optimalizace. 20 méně shallow copies per batch. Eliminuje i zbytečný `getAllRequests()` array access.

---

### 1.5 Optimize computeChangedPaths — shallow compare

**Problém:**  
`computeChangedPaths()` (`src/panel/index.ts:428-444`) porovnává hodnoty pomocí `JSON.stringify(prev[key]) !== JSON.stringify(curr[key])`. To je drahé pro objektové hodnoty (např. `ecommerce` objekt s produkty).

```typescript
} else if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
  result.set(key, 'changed');
}
```

**Řešení:**  
Pro účely live inspector highlightu nepotřebujeme deep compare — stačí **reference equality** s fallback na JSON.stringify jen pro primitivní hodnoty. Pokud se reference změnila, je to changed. Pokud ne, ale hodnota je primitivní a jiná, taky changed.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/index.ts:439` | Nahradit JSON.stringify compare rychlejší alternativou |

**Detail implementace:**

```typescript
function computeChangedPaths(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): Map<string, 'added' | 'changed' | 'removed'> {
  const result = new Map<string, 'added' | 'changed' | 'removed'>();
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of allKeys) {
    if (!(key in prev)) {
      result.set(key, 'added');
    } else if (!(key in curr)) {
      result.set(key, 'removed');
    } else {
      const prevVal = prev[key];
      const currVal = curr[key];
      
      // Fast path: reference equality
      if (prevVal === currVal) continue;
      
      // Fast path: null/undefined comparison
      if (prevVal == null && currVal == null) continue;
      
      // Primitives: direct comparison (covers string, number, boolean)
      if (typeof prevVal !== 'object' && typeof currVal !== 'object') {
        if (prevVal !== currVal) result.set(key, 'changed');
        continue;
      }
      
      // One is object, other is not — definitely changed
      if ((prevVal === null) !== (currVal === null) ||
          typeof prevVal !== typeof currVal) {
        result.set(key, 'changed');
        continue;
      }
      
      // Both are objects/arrays — use JSON.stringify as fallback
      // (only for actual objects, which is rarer)
      if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        result.set(key, 'changed');
      }
    }
  }
  return result;
}
```

**Očekávaný dopad:**  
Pro primitivní hodnoty (většina top-level keys v DataLayer) se eliminuje JSON.stringify úplně. Pro objektové hodnoty (jako `ecommerce`) zůstává JSON.stringify ale s early exit pro reference-equal values.

---

### 1.6 DataLayer filter debouncing

**Problém:**  
DL filter input (`src/panel/index.ts:1105-1111`) nemá debounce:

```typescript
$dlInput.addEventListener('input', () => {
  // ...
  dlState.setDlFilterText($dlInput.value);
  dlApplyFilter();          // ← OKAMŽITĚ
  updateDlActiveFilters();  // ← OKAMŽITĚ
});
```

Network filter má 150ms debounce (`src/panel/index.ts:703-707`). DL filter ne. Při 500 pushích a rychlém psaní to znamená 500× `dlMatchesFilter()` na každý znak.

**Řešení:**  
Přidat stejný 150ms debounce jako u network filteru.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/index.ts:1105-1111` | Přidat debounce timer |

**Detail implementace:**

```typescript
// src/panel/index.ts — initDatalayerHandlers()

const $dlInput = DOM.dlFilterInput;
let dlFilterTimer: ReturnType<typeof setTimeout>;  // ← PŘIDAT

if ($dlInput) {
  $dlInput.addEventListener('input', () => {
    const hasText = $dlInput.value.length > 0;
    if ($dlClearBtn) $dlClearBtn.style.display = hasText ? '' : 'none';
    dlState.setDlFilterText($dlInput.value);
    // Debounce — same as network filter
    clearTimeout(dlFilterTimer);  // ← PŘIDAT
    dlFilterTimer = setTimeout(() => {  // ← PŘIDAT
      dlApplyFilter();
      updateDlActiveFilters();
    }, 150);  // ← PŘIDAT
  });
}
```

**Očekávaný dopad:**  
Při rychlém psaní se filtr spustí jen 1× po 150ms pauze, místo N× (N = počet znaků). Stejný pattern jako u network filteru — konzistentní chování.

---

### 1.7 Reverse correlation — binary search optimization

**Problém:**  
`findTriggeringPush()` (`src/panel/datalayer/reverse-correlation.ts:21-46`) iteruje **všechny** pushe lineárně:

```typescript
for (const push of pushes) {
  const pushTime = new Date(push.timestamp).getTime();
  // ...
}
```

Protože pushy jsou seřazené podle času, můžeme použít binary search k nalezení rozsahu relevantních pushí.

**Řešení:**  
S `_ts` (z 1.1) použít binary search k nalezení first/last relevant push, pak iterovat jen ten rozsah.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/datalayer/reverse-correlation.ts:21-46` | Binary search + iterovat jen relevant rozsah |

**Detail implementace:**

```typescript
export function findTriggeringPush(
  request: ParsedRequest,
  pushes: DataLayerPush[],
  lookbackMs = 2000,
): TriggeringPushResult | null {
  const reqTime = request._ts ?? new Date(request.timestamp).getTime();
  if (isNaN(reqTime) || pushes.length === 0) return null;

  // Binary search for the latest push within lookback window
  // Pushes are time-ordered, so we can narrow the range
  const minTime = reqTime - lookbackMs;
  
  let lo = 0;
  let hi = pushes.length - 1;
  let best: TriggeringPushResult | null = null;

  // Find first push that could be within range (binary search)
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midTime = pushes[mid]._ts ?? 0;
    if (midTime < minTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Scan from the found position to the end (at most lookbackMs worth of pushes)
  for (let i = lo; i < pushes.length; i++) {
    const push = pushes[i];
    const pushTime = push._ts ?? new Date(push.timestamp).getTime();
    if (isNaN(pushTime)) continue;

    const delay = reqTime - pushTime;
    if (delay < -200 || delay > lookbackMs) continue;

    if (!best || Math.abs(delay) < Math.abs(best.delayMs)) {
      const confidence = delay < 200 ? 'high' : delay < 1000 ? 'medium' : 'low';
      best = { push, delayMs: delay, confidence };
    }
  }

  return best;
}
```

**Očekávaný dopad:**  
Při 1000 pushích a lookback 2000ms, binary search redukuje prohledávaný rozsah z 1000 na ~10-50 pushů (jen ty v time window). O(log n) + O(k) místo O(n).

---

### 1.8 SVG icon caching v request-list

**Problém:**  
`buildGroupIcon()` (`src/panel/components/request-list.ts:17-22`) je volána pro každý row. Vrací stejný SVG string pro stejného providera. Tento string se pak nastavuje přes `innerHTML`, což browser musí parse.

```typescript
const iconSvg = buildGroupIcon(data.provider);
if (iconSvg) {
  iconEl.innerHTML = iconSvg;  // ← Parse SVG string for every row
}
```

**Řešení:**  
Cache `DocumentFragment` per provider — jednorázově parse SVG, pak `cloneNode(true)`.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/components/request-list.ts` | Přidat SVG fragment cache, použít `cloneNode` |

**Detail implementace:**

```typescript
// src/panel/components/request-list.ts

// ─── SVG ICON CACHE ──────────────────────────────────────────────────────
// Cache parsed DocumentFragments for provider/group icons.
// Avoids re-parsing the same SVG string for every row.

const svgIconCache = new Map<string, DocumentFragment>();

function getCachedIcon(provider: string): DocumentFragment | null {
  const cached = svgIconCache.get(provider);
  if (cached) return cached;

  const iconSvg = buildGroupIcon(provider);
  if (!iconSvg) return null;

  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents';
  wrapper.innerHTML = iconSvg;
  
  const fragment = document.createDocumentFragment();
  while (wrapper.firstChild) {
    fragment.appendChild(wrapper.firstChild);
  }
  
  svgIconCache.set(provider, fragment);
  return fragment;
}
```

A v `createRequestRow()`:

```typescript
const iconEl = row.querySelector('.req-category-icon') as HTMLElement;
const iconFragment = getCachedIcon(data.provider);
if (iconFragment) {
  iconEl.appendChild(iconFragment.cloneNode(true));
} else {
  iconEl.remove();
}
```

**Očekávaný dopad:**  
Pro 100 requestů se 10 různými providery: 10× SVG parse místo 100×. Zrychlení DOM creation při batch flush.

---

## Fáze 2 — Rendering Overhaul

**Cíl:** Optimalizovat způsob, jakým panel renderuje UI pro velké datové sady.  
**Odhadovaný effort:** 1-2 týdny  
**Riziko:** Střední — zásah do core rendering loop

---

### 2.1 Live Inspector — incrementální update

**Problém:**  
`renderLiveInspector()` (`src/panel/datalayer/live-inspector.ts:41-108`) dělá `container.innerHTML = ''` a rebuild celého stromu při každém push (pokud je Live tab active). `queueHighlights()` sice existuje pro apply highlights na existující strom, ale `renderLiveInspector()` je stále volána z `renderActiveTab()` při každém switch na Live tab nebo při výběru push.

`applyHighlights()` (`live-inspector.ts:353-401`) je správný přístup pro live updates — jen updatuje existující DOM nodes. Ale `renderLiveInspector()` rebuild celého stromu zruší tento benefit.

**Řešení:**  
Rozlišit dva módy:
1. **Full render** — při prvním otevření Live tabu
2. **Incremental update** — při novém pushu když je Live tab už active

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/datalayer/live-inspector.ts` | Přidat `addKeysToTree()` a `removeKeysFromTree()` funkce |
| `src/panel/datalayer/live-inspector.ts` | Upravit `queueHighlights()` aby volal incrementální update |

**Detail implementace — koncept:**

```typescript
// src/panel/datalayer/live-inspector.ts

/**
 * Incrementally update the live tree with new/changed/removed keys.
 * Called by queueHighlights() when Live tab is already visible.
 */
function updateTreeIncremental(
  container: HTMLElement,
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  changedPaths: Map<string, ChangeType>,
): void {
  const treeContainer = container.querySelector('.dl-tree');
  if (!treeContainer) return;

  // Update header
  const header = container.querySelector('.dl-live-header');
  if (header) {
    const keyCount = Object.keys(curr).length;
    header.textContent = `Current state · ${keyCount} top-level keys`;
  }

  // Remove keys that no longer exist
  for (const key of Object.keys(prev)) {
    if (!(key in curr)) {
      const node = treeContainer.querySelector(
        `.dl-tree-node[data-path="${CSS.escape(key)}"]`
      );
      if (node) node.remove();
    }
  }

  // Add or update keys
  for (const key of Object.keys(curr).sort()) {
    const existingNode = treeContainer.querySelector(
      `.dl-tree-node[data-path="${CSS.escape(key)}"]`
    ) as HTMLElement | null;

    const changeType = changedPaths.get(key);

    if (!existingNode) {
      // New key — insert in sorted position
      const nodeData: TreeNodeData = {
        key,
        value: curr[key],
        depth: 0,
        path: key,
        changeType,
        isLeaf: !isExpandable(curr[key]),
        childCount: isExpandable(curr[key])
          ? Object.keys(curr[key] as object).length
          : 0,
      };
      const newNode = createTreeNode(nodeData, changedPaths);
      insertNodeSorted(treeContainer, newNode, key);
    } else {
      // Existing key — update value if changed
      if (changeType) {
        updateExistingNode(existingNode, curr[key], changeType, changedPaths);
      }
    }
  }
}

function insertNodeSorted(
  container: HTMLElement,
  newNode: HTMLElement,
  key: string,
): void {
  const nodes = container.querySelectorAll(':scope > .dl-tree-node');
  let inserted = false;
  for (const node of nodes) {
    const nodeKey = (node as HTMLElement).dataset.path ?? '';
    if (key.localeCompare(nodeKey) < 0) {
      container.insertBefore(newNode, node);
      inserted = true;
      break;
    }
  }
  if (!inserted) container.appendChild(newNode);
}

function updateExistingNode(
  node: HTMLElement,
  newValue: unknown,
  changeType: ChangeType,
  changedPaths: Map<string, ChangeType>,
): void {
  // Update bracket/value display
  const bracket = node.querySelector(':scope > .dl-tree-row .dl-tree-value-bracket');
  const valEl = node.querySelector(':scope > .dl-tree-row .dl-tree-value');
  
  const isLeaf = !isExpandable(newValue);
  
  if (isLeaf) {
    // ... update leaf value text
  } else {
    // ... update bracket count
  }

  // Apply highlight animation
  const keyEl = node.querySelector(':scope > .dl-tree-row .dl-tree-key') as HTMLElement | null;
  if (keyEl && changeType) {
    keyEl.classList.remove('dl-tree-key-changed', 'dl-tree-key-added', 'dl-tree-key-removed');
    void keyEl.offsetWidth; // force reflow
    keyEl.classList.add(`dl-tree-key-${changeType}`);
  }
}
```

**Očekávaný dopad:**  
Při Live tab visible a každém novém push: místo rebuild 50+ top-level tree nodes, updatujeme jen 1-5 changed/added/removed nodes. Výrazně méně DOM operations.

---

### 2.2 Lazy cumulative state computation

**Problém:**  
`receiveDataLayerPush()` (`src/panel/index.ts:320-325`) počítá `cumulativeState` při **každém** push — shallow copy předchozího state + iterate nové keys. Pro 50+ keys v cumulative state je to zbytečná alloc na každý push.

```typescript
const prevState = allPushes.length > 0 ? allPushes[allPushes.length - 1].cumulativeState : {};
const cumulativeState: Record<string, unknown> = { ...prevState };
for (const [k, v] of Object.entries(push.data)) {
  cumulativeState[k] = v;
}
```

**Řešení:**  
Udržovat **jeden sdílený cumulative state object** a mutovat ho in-place. Každý push si uloží **snapshot** (jen pokud je vybrán/viditelný). To eliminovalo N× shallow copy.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/datalayer/state.ts` | Přidat `sharedCumulativeState` + `snapshotCumulativeState()` |
| `src/panel/index.ts:320-325` | Místo shallow copy — mutovat shared state, uložit snapshot |

**Detail implementace:**

```typescript
// src/panel/datalayer/state.ts

// ─── SHARED CUMULATIVE STATE ─────────────────────────────────────────────
// Single mutable object that grows with each push.
// Avoids N shallow copies per session.

let sharedCumulativeState: Record<string, unknown> = {};

/**
 * Get the current shared cumulative state reference.
 * Mutating this directly is safe ONLY inside receiveDataLayerPush.
 */
export function getSharedCumulativeState(): Record<string, unknown> {
  return sharedCumulativeState;
}

/**
 * Create a lightweight snapshot of the current cumulative state.
 * Only captures the keys that were present at this point (for diff/correlation).
 * Uses structuredClone for true copy (available in modern Chrome).
 */
export function snapshotCumulativeState(): Record<string, unknown> {
  // structuredClone is available in Chrome 98+ (DevTools context)
  // Falls back to manual shallow copy
  try {
    return structuredClone(sharedCumulativeState);
  } catch {
    return { ...sharedCumulativeState };
  }
}

/**
 * Reset cumulative state (on clear).
 */
export function resetCumulativeState(): void {
  sharedCumulativeState = {};
}
```

```typescript
// src/panel/index.ts — receiveDataLayerPush()

window.receiveDataLayerPush = function (push: DataLayerPush): void {
  if (dlState.getDlIsPaused()) return;

  // Mutate shared cumulative state in-place
  const sharedState = dlState.getSharedCumulativeState();
  for (const [k, v] of Object.entries(push.data)) {
    sharedState[k] = v;
  }

  const enrichedPush: DataLayerPush = {
    ...push,
    _ts: Date.parse(push.timestamp),
    cumulativeState: dlState.snapshotCumulativeState(),  // snapshot pro tento push
    _eventName: push._eventName ?? ...,
    sourceLabel: push.sourceLabel || push.source.toUpperCase(),
  };

  // ... rest of the function
};
```

```typescript
// src/panel/index.ts — clearDataLayer()

window.clearDataLayer = function (): void {
  const $status = document.getElementById('dl-source-status');
  if ($status) $status.innerHTML = '';
  clearLiveState();
  clearValidationErrors();
  dlState.resetCumulativeState();  // ← PŘIDAT
  dlClearAll();
};
```

**Očekávaný dopad:**  
Eliminuje 1 shallow copy (50+ keys) per push. Místo `{ ...prevState }` s N keys, je to jeden `structuredClone()` volání — které je nativní a optimalizované enginem. Ušetří ~50 property copies × 1000 pushes = 50,000 zbytečných alloc.

**Risk:**  
`structuredClone` může selhat na non-cloneable values (functions, DOM nodes). Ale protože dataLayer push data prochází `sanitize()` v content scriptu (který odstraňuje functions a DOM nodes), měl by to být safe. Fallback na `{ ...sharedState }` je bezpečný.

---

### 2.3 Heavy data store — memory budget

**Problém:**  
`heavyDataStore` (`src/devtools/panel-bridge.ts:34`) ukládá response bodies (až 4KB each) + request/response headers pro každý request. Při 500 requestech to je ~2-4MB. Nikdy se nečistí kromě explicitního clear nebo prune.

**Řešení:**  
Přidat automatický cleanup při prune — smazat heavy data pro pruned requesty. Už se to částečně dělá (`window._deleteHeavyData(removed.map(r => r.id))`), ale zajistit že to funguje spolehlivě.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/panel/index.ts:121-124` | Ověřit že `_deleteHeavyData` je voláno při prune |
| `src/devtools/panel-bridge.ts:34` | Přidat `.size` tracking + warning |

**Detail implementace — jednoduché vylepšení:**

```typescript
// src/devtools/panel-bridge.ts

const MAX_HEAVY_DATA_SIZE = 5 * 1024 * 1024; // 5MB
let heavyDataSizeEstimate = 0;

export const heavyDataStore = new Map<number, HeavyData>();

// Wrap set to track size
const originalSet = heavyDataStore.set.bind(heavyDataStore);
heavyDataStore.set = function(key: number, value: HeavyData) {
  const old = heavyDataStore.get(key);
  if (old) {
    heavyDataSizeEstimate -= estimateSize(old);
  }
  heavyDataSizeEstimate += estimateSize(value);
  
  // Evict oldest entries if over budget
  while (heavyDataSizeEstimate > MAX_HEAVY_DATA_SIZE && heavyDataStore.size > 0) {
    const firstKey = heavyDataStore.keys().next().value!;
    const removed = heavyDataStore.get(firstKey)!;
    heavyDataSizeEstimate -= estimateSize(removed);
    heavyDataStore.delete(firstKey);
  }
  
  return originalSet(key, value);
};

function estimateSize(data: HeavyData): number {
  return (data.responseBody?.length ?? 0) +
    Object.keys(data.requestHeaders).reduce((s, k) => s + k.length + (data.requestHeaders[k]?.length ?? 0), 0) +
    Object.keys(data.responseHeaders).reduce((s, k) => s + k.length + (data.responseHeaders[k]?.length ?? 0), 0);
}
```

**Očekávaný dopad:**  
Memory footprint se nezvýší nad ~5MB bez ohledu na počet requestů. Protection proti OOM na dlouhých session s velkými response bodies.

---

### 2.4 sanitize() v content script — structuredClone s replacerem

**Problém:**  
`sanitize()` (`src/content/data-layer-main.ts:17-46`) je rekurzivní funkce která prochází celý objekt a vytváří nový. Pro GTM dataLayer s 50+ keys a vnořenými objekty to může být drahé. Navíc WeakSet alloc na každé volání.

**Řešení:**  
Zkusit `structuredClone()` jako první pokus (je nativní a optimalizovaný), s try/catch fallback na současný sanitize pro non-cloneable values.

**Soubory k úpravě:**

| Soubor | Změna |
|--------|-------|
| `src/content/data-layer-main.ts:56-73` | V `sendPush()` zkusit structuredClone první |

**Detail implementace:**

```typescript
// src/content/data-layer-main.ts — sendPush()

function sendPush(
  source: string,
  pushIndex: number,
  timestamp: string,
  data: unknown,
  isReplay?: boolean,
): void {
  let sanitized: unknown;
  
  // Try native structuredClone first (much faster than manual sanitize)
  try {
    sanitized = structuredClone(data);
    // structuredClone handles: primitives, plain objects, arrays, Date, RegExp, Map, Set
    // It throws on: functions, DOM nodes, symbols, circular refs
    // Since DataLayer data is typically plain objects/arrays, this should work for most cases
  } catch {
    // Fallback to manual sanitize for non-cloneable data
    try {
      sanitized = sanitize(data);
    } catch {
      sanitized = { _error: 'Data could not be serialized' };
    }
  }
  
  try {
    window.postMessage({
      type: 'TAGDRAGON_DL_PUSH',
      source,
      pushIndex,
      timestamp,
      data: sanitized,
      isReplay: isReplay === true,
    }, '*');
  } catch {
    window.postMessage({
      type: 'TAGDRAGON_DL_PUSH',
      source,
      pushIndex,
      timestamp,
      data: { _error: 'Data could not be serialized' },
      isReplay: isReplay === true,
    }, '*');
  }
}
```

**Očekávaný dopad:**  
Pro typický DataLayer data (plain objects/arrays) se `structuredClone` zvládne nativně bez rekurze. Rychlejší a menší memory footprint. Fallback zajišťuje kompatibilitu.

**Risk:**  
`structuredClone` nefunguje v MAIN world na všech Chrome verzích. Ale od Chrome 98+ je dostupný a DevTools extension běží na moderním Chrome. Fallback je bezpečný.

---

## Shrnutí — Priority Matrix

| # | Optimalizace | Fáze | Effort | Dopad | Riziko |
|---|-------------|------|--------|-------|-------|
| 1.3 | DataLayer RAF batching | 1 | 3h | **Vysoký** | Nízké |
| 1.1 | Pre-parse timestamps | 1 | 1h | **Vysoký** | Minimální |
| 1.2 | Provider domain-first lookup | 1 | 2h | **Vysoký** | Nízké |
| 1.6 | DL filter debouncing | 1 | 15min | Střední | Minimální |
| 1.5 | Shallow computeChangedPaths | 1 | 30min | Střední | Minimální |
| 1.4 | Eliminovat redundantní volání | 1 | 30min | Nízký | Minimální |
| 1.7 | Reverse correlation binary search | 1 | 1h | Střední | Nízké |
| 1.8 | SVG icon caching | 1 | 30min | Střední | Minimální |
| 2.1 | Live Inspector incrementální update | 2 | 4h | **Vysoký** | Střední |
| 2.2 | Lazy cumulative state | 2 | 2h | Střední | Nízké |
| 2.3 | Heavy data memory budget | 2 | 1h | Nízký | Minimální |
| 2.4 | structuredClone v sanitize() | 2 | 30min | Střední | Minimální |

**Doporučený pořadí implementace:**

1. **1.1** → **1.3** → **1.6** → **1.2** → **1.5** → **1.4** → **1.7** → **1.8** (Fáze 1 — hot-path)
2. **2.2** → **2.1** → **2.4** → **2.3** (Fáze 2 — rendering)

---

## Testing Strategy

### Performance Regression Testing

Pro každou fázi doporučuji:

1. **Baseline measurement** (před změnami):
   - Otevřít reprezentativnou stránku (e-commerce s GTM)
   - V Chrome DevTools → Performance tab → Record
   - Reload stránky, počkat na stabilizaci
   - Zaznamenat: Scripting time, Rendering time, Memory usage

2. **After each optimization**:
   - Stejný test, porovnat výsledky
   - Focus na: `receiveDataLayerPush` duration, `flushPendingRequests` duration, total scripting time

### Functional Testing Checklist

- [ ] Provider matching vrací stejné výsledky (1.2)
- [ ] Correlation tab zobrazuje stejné výsledky (1.1, 1.7)
- [ ] Reverse correlation zobrazuje stejné výsledky (1.1, 1.7)
- [ ] DataLayer push list se správně renderuje při page load (1.3)
- [ ] DataLayer push list se správně renderuje když panel je v pozadí (1.3)
- [ ] DL filter funguje správně s debounce (1.6)
- [ ] Live Inspector zobrazuje správný state (2.1, 2.2)
- [ ] Clear funguje správně (resetuje cumulative state) (2.2)
- [ ] Prune funguje správně (čistí heavy data) (2.3)
- [ ] Timestamp formáty fungují správně (1.1)
- [ ] Export (JSON/CSV) funguje správně
- [ ] Provider filter (hide/show) funguje správně
- [ ] Request detail pane (všechny taby) funguje správně

---

## Není v scope (budoucí vylepšení)

Tyto věci jsou identifikované ale nejsou součástí tohoto plánu:

1. **Virtual scrolling** — významná změna architektury, vyžaduje samostatný spec
2. **Web Workers** pro těžké computation (correlation, diff)
3. **IndexedDB** místo in-memory storage pro requesty
4. **Tree-shaking** optimalizace Rollup buildu (momentálně IIFE, nelze tree-shake)
5. **Content script lazy loading** — inject jen na detekovaných stránkách
6. **CSS containment** (`contain: strict`) na list items
