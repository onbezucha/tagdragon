# TagDragon UI Redesign — "Structured Clarity" (Přístup B)

## Přehled

Cíl: Udělat TagDragon přehlednější, hezčí a srozumitelnější pro všechny uživatele (markeťáky, analytiky i vývojáře). Přístup B zachovává stávající architekturu a funkčnost, ale výrazně zlepšuje vizuální hierarchii, interakce a information design.

**Odhadovaný čas:** 5-8 dní  
**Riziko:** Střední — žádné změny v provider systému nebo state managementu  

---

## FÁZE 1: Tooltip System (Bug fix + Nový feature) — Den 1

### Problém
1. **Nativní `title=""` tooltipy nefungují v DevTools iframe** — Chrome je suppressne v panel contextu
2. **`data-tooltip` atributy v `index.ts` jsou mrtvý kód** — kód do nich píše (např. `btnPause.dataset.tooltip = paused ? 'Resume capture' : 'Pause capture'`), ale žádný JS/CSS je nečte
3. **Request row má nativní `title`** z `req-url` elementu, což způsobuje otravný browser tooltip s celou URL při hoveru

### Řešení

#### 1.1 Vytvořit custom tooltip systém

**Nový soubor:** `src/panel/utils/tooltip.ts`

```typescript
// Jednoduchý custom tooltip pro DevTools panel
// Funguje s data-tooltip atributy, které už kód používá

let tooltipEl: HTMLElement | null = null;

function init(): void {
  // Vytvořit jeden sdílený tooltip element
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip-popup';
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);

  // Delegovaný event listener na body
  document.addEventListener('pointerenter', handleEnter, true);
  document.addEventListener('pointerleave', handleLeave, true);
  document.addEventListener('pointerdown', handleLeave, true); // Zavřít při kliku
}

function handleEnter(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;
  
  const text = target.dataset.tooltip;
  if (!text) return;
  
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  positionTooltip(target);
}

function handleLeave(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement | null;
  if (!target || !tooltipEl) return;
  tooltipEl.style.display = 'none';
}

function positionTooltip(target: HTMLElement): void {
  if (!tooltipEl) return;
  const rect = target.getBoundingClientRect();
  const tRect = tooltipEl.getBoundingClientRect();
  
  // Default: pod elementem, centrovaný
  let top = rect.bottom + 6;
  let left = rect.left + (rect.width - tRect.width) / 2;
  
  // Overflow ochrana
  if (left < 4) left = 4;
  if (left + tRect.width > window.innerWidth - 4) {
    left = window.innerWidth - tRect.width - 4;
  }
  if (top + tRect.height > window.innerHeight - 4) {
    top = rect.top - tRect.height - 6; // Nad elementem
  }
  
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}
```

#### 1.2 CSS pro tooltip

**Soubor:** `styles/input.css` — přidat do `@layer components`

```css
.tooltip-popup {
  position: fixed;
  z-index: 10000;
  padding: 4px 8px;
  background-color: var(--bg-3);
  color: var(--text-0);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--font-sans);
  line-height: 1.4;
  pointer-events: none;
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  animation: tooltipFadeIn 100ms var(--ease);
}

@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
```

#### 1.3 Migrace: `title=""` → `data-tooltip=""`

**Soubor:** `public/panel.html`

Změnit všechny `title=""` atributy na `data-tooltip=""` na těchto elementech:

| Element | Starý atribut | Nový atribut |
|---------|--------------|--------------|
| `.tab-btn[data-view="network"]` | `title="Network requests"` | `data-tooltip="Network requests"` |
| `.tab-btn[data-view="datalayer"]` | `title="DataLayer pushes"` | `data-tooltip="DataLayer pushes"` |
| `#adobe-env-badge` | `title="Adobe environment"` | `data-tooltip="Adobe environment"` |
| `#btn-clear-cookies` | `title="Delete all cookies on this site"` | `data-tooltip="Delete all cookies on this site"` |
| `#btn-consent` | `title="Cookie Consent"` | `data-tooltip="Cookie Consent"` |
| `#btn-theme-toggle` | `title="Toggle light/dark mode"` | `data-tooltip="Toggle light/dark mode"` |
| `#btn-clear-all` | `title="Clear all requests (Ctrl+L)"` | `data-tooltip="Clear all requests (Ctrl+L)"` |
| `#btn-settings` | `title="Filters & settings"` | `data-tooltip="Filters & settings"` |
| `#btn-info` | `title="About TagDragon"` | `data-tooltip="About TagDragon"` |
| `.quick-btn` (všechny 4) | `title="Sort: Newest first"` atd. | `data-tooltip="Sort: Newest first"` atd. |
| `#btn-providers` | `title="Provider filter"` | `data-tooltip="Provider filter"` |
| `#btn-export` | `title="Export as JSON"` | `data-tooltip="Export as JSON"` |
| `#btn-pause` | `title="Pause capture"` | `data-tooltip="Pause capture"` |
| `#dl-clear-filter` | `title="Clear filter"` | `data-tooltip="Clear filter"` |
| `#dl-filter-source` | `title="Filter by source"` | `data-tooltip="Filter by source"` |
| `#dl-push-count` | `title="Total pushes..."` | `data-tooltip="Total pushes received by panel"` |
| `#dl-btn-export` | `title="Export DataLayer"` | `data-tooltip="Export DataLayer"` |
| `#dl-btn-pause` | `title="Pause DataLayer capture"` | `data-tooltip="Pause DataLayer capture"` |
| `#consent-refresh` | `title="Refresh"` | `data-tooltip="Refresh"` |
| `#dl-detail-close` | `title="Close detail"` | `data-tooltip="Close detail"` |

#### 1.4 Odstranit nativní tooltip z request row

**Soubor:** `src/panel/components/request-list.ts`

V `createRequestRow()` se odstraní jakýkoliv `title` atribut z `.req-row` nebo `.req-url`. Pokud tam žádný není (z kódu to nevypadá, že by tam byl přidán explicitně), zkontrolovat, zda `.req-url` nemá nativní title atribut.

**Důležité:** Zkontrolovat, zda `.req-row` nemá nastavený `title` atribut někde jinde — grep přes celý kód.

#### 1.5 Inicializace tooltip systému

**Soubor:** `src/panel/index.ts`

V `init()` funkci (na konci souboru) přidat:
```typescript
import { init as initTooltip } from './utils/tooltip';
// ...
initTooltip();
```

### Checklist Fáze 1
- [ ] Vytvořit `src/panel/utils/tooltip.ts`
- [ ] Přidat `.tooltip-popup` CSS do `styles/input.css`
- [ ] Migrace všech `title=""` → `data-tooltip=""` v `panel.html`
- [ ] Odstranit `title` z request row (pokud existuje)
- [ ] Inicializovat tooltip systém v `index.ts`
- [ ] Otestovat v DevTools panelu — tooltipy se zobrazují při hoveru
- [ ] Otestovat, že žádný nativní tooltip už nevyskakuje

---

## FÁZE 2: Toolbar Redesign — Den 2-3

### Problém
- **Network context toolbar** má 12+ elementů v jedné řádce (search, 4 quick buttons, provider filter, export, pause)
- **Příliš mnoho vizuálního šumu** — uživatel neví, na co kliknout
- **Quick action buttons nemají popisky** — jen ikonky, které bez tooltipů (Fáze 1) nedávají smysl
- **Toolbar buttons nejsou logicky seskupeny** — pause, clear, cookies, consent, sort, wrap, expand, compact, providers, export, theme, settings, info

### Řešení

#### 2.1 Reorganizace Global Tab Bar (ROW 1)

**Současný stav:**
```
[Network | DataLayer]                    [Adobe Badge | 🗑 🍪 ☀️ 🗑 ⚙️ ❓]
```

**Nový stav:**
```
[🐉 Network (42) | DataLayer (15)]       [🍪 Consent | ☀️ Theme | ⚙️ Settings | ❓ About]
```

Změny:
- **Z global tab baru ODSTRANIT:** `#btn-clear-all`, `#btn-clear-cookies`, `#adobe-env-badge`
- **PŘESUNOUT do toolbaru:** `#btn-clear-all`, `#btn-clear-cookies`
- **Adobe env badge** přesunout do context toolbaru (Network only)
- **Přidat request count badge** do tab buttons (už existuje jako `.tab-badge`, jen zajistit, že je viditelný)

**HTML změny v `panel.html`:**

```html
<!-- ROW 1: GLOBAL TAB BAR -->
<div id="global-tab-bar">
  <div class="gtb-section">
    <div id="tab-switcher">
      <button class="tab-btn active" data-view="network" data-tooltip="Network requests">
        <i data-lucide="cable"></i>
        <span>Network</span>
        <span class="tab-badge" id="tab-badge-network">0</span>
      </button>
      <button class="tab-btn" data-view="datalayer" data-tooltip="DataLayer pushes">
        <i data-lucide="database"></i>
        <span>DataLayer</span>
        <span class="tab-badge" id="tab-badge-datalayer">0</span>
      </button>
    </div>
  </div>
  <div class="gtb-right">
    <button id="btn-consent" data-tooltip="Cookie Consent">
      <i data-lucide="cookie"></i>
    </button>
    <button id="btn-theme-toggle" data-tooltip="Toggle light/dark mode">
      <span class="theme-icon-sun"><i data-lucide="sun"></i></span>
      <span class="theme-icon-moon"><i data-lucide="moon"></i></span>
    </button>
    <button id="btn-settings" data-tooltip="Filters & settings">
      <i data-lucide="settings"></i>
    </button>
    <button id="btn-info" data-tooltip="About TagDragon">
      <i data-lucide="circle-help"></i>
    </button>
  </div>
</div>
```

#### 2.2 Redesign Network Context Toolbar (ROW 2)

**Současný stav:**
```
[🔍 Filter input]  [⇅ ⏏ 📐 ☰] [🔽 Provider] | [⬇ Export] | [⏸ Pause]
```

**Nový stav — seskupení s vizuálními separátory:**
```
[🔍 Filter input]  | [⏸ Pause] [🗑 Clear] | [⇅ ⏏ 📐 ☰ Quick] [🔽 Providers] | [⬇ Export] [🍪 Cookies] [🏷 Adobe]
```

Logické skupiny:
1. **Search** — vždy viditelný, flex-grow
2. **Capture** — Pause + Clear (primární akce)
3. **View** — Quick toggles + Provider filter (nastavení zobrazení)
4. **Actions** — Export + Cookies + Adobe Env (nástroje)

**HTML:**

```html
<!-- ROW 2: NETWORK CONTEXT TOOLBAR -->
<div id="network-context" class="context-toolbar">
  <div class="ctx-left">
    <div class="filter-wrap">
      <i data-lucide="search"></i>
      <input type="text" id="filter-input" placeholder="Filter by URL, parameter, or provider...">
      <button id="btn-clear-filter">
        <i data-lucide="x"></i>
      </button>
    </div>
  </div>
  <div class="ctx-right">
    <!-- Capture group -->
    <button id="btn-pause" class="pause-btn" data-tooltip="Pause capture">
      <span class="pause-icon"><i data-lucide="pause"></i></span>
      <span class="play-icon"><i data-lucide="play"></i></span>
      <span class="pause-text">Pause</span>
      <span class="play-text">Resume</span>
    </button>
    <button id="btn-clear-all" class="ctx-icon-btn" data-tooltip="Clear all requests (Ctrl+L)">
      <i data-lucide="trash-2"></i>
    </button>
    
    <div class="toolbar-separator"></div>
    
    <!-- View group -->
    <div id="quick-actions">
      <button id="btn-quick-sort" class="quick-btn" data-tooltip="Sort: Newest first">
        <i data-lucide="arrow-up-down"></i>
      </button>
      <button id="btn-quick-wrap" class="quick-btn" data-tooltip="Wrap long values">
        <i data-lucide="wrap-text"></i>
      </button>
      <button id="btn-quick-expand" class="quick-btn" data-tooltip="Auto-expand">
        <i data-lucide="maximize-2"></i>
      </button>
      <button id="btn-quick-compact" class="quick-btn" data-tooltip="Compact list">
        <i data-lucide="align-justify"></i>
      </button>
    </div>
    <button id="btn-providers" data-tooltip="Provider filter">
      <i data-lucide="filter"></i>
    </button>
    
    <div class="toolbar-separator"></div>
    
    <!-- Actions group -->
    <button id="btn-export" data-tooltip="Export as JSON">
      <i data-lucide="download"></i>
      <span>Export</span>
    </button>
    <button id="btn-clear-cookies" class="ctx-icon-btn" data-tooltip="Delete all cookies on this site">
      <i data-lucide="eraser"></i>
    </button>
    <div id="adobe-env-badge" class="env-badge hidden" data-tooltip="Adobe environment">
      <span class="env-badge-dot"></span>
      <span class="env-badge-label">PROD</span>
      <i data-lucide="chevron-down"></i>
    </div>
  </div>
</div>
```

#### 2.3 Vylepšení toolbar separátorů

**CSS změny:**

```css
.toolbar-separator {
  width: 1px;
  height: 18px;
  background-color: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}

.ctx-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-2);
  cursor: pointer;
  transition: all 150ms;
}

.ctx-icon-btn:hover {
  background: var(--bg-2);
  color: var(--text-1);
}
```

#### 2.4 DataLayer Context Toolbar — stejný pattern

Aplikovat stejné seskupení i na DataLayer toolbar:

```
[🔍 Filter] | [⏸ Pause] [🗑 Clear] | [Source dropdown] [Push count] | [⬇ Export]
```

### Checklist Fáze 2
- [ ] Reorganizovat global tab bar HTML
- [ ] Redesign network context toolbar s logickými skupinami
- [ ] Aplikovat stejné seskupení na DataLayer toolbar
- [ ] Přesunout `#btn-clear-cookies` a `#btn-clear-all` z global tab baru
- [ ] Přesunout `#adobe-env-badge` do network context toolbaru
- [ ] Přidat CSS pro `.ctx-icon-btn`
- [ ] Otestovat responsivitu — toolbar se nezhroutí při úzkém panelu
- [ ] Ověřit, že všechny event listenery stále fungují (id elementů se nemění)

---

## FÁZE 3: Request List Redesign — Den 3-4

### Problém
- **3-řádkový row je information overload** — provider+time, event, status+method+size+duration
- **Compact mode skryje příliš mnoho** — ztrácí event name a status
- **Chybí vizuální hierarchie** — vše je stejně velké a stejně důležité
- **Nativní URL tooltip při hoveru** (řešeno ve Fázi 1)

### Řešení: Intelligent single-line row s hover expand

#### 3.1 Nový row design

**Default stav (jeden řádek):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [🔴 icon] GA4    page_view · 200 · GET · 1.2KB · 45ms    12:34 │
└──────────────────────────────────────────────────────────────────┘
```

**Hover stav (rozbalený druhý řádek):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [🔴 icon] GA4    page_view · 200 · GET · 1.2KB · 45ms    12:34 │
│            https://www.google-analytics.com/g/collect?...        │
└──────────────────────────────────────────────────────────────────┘
```

**Klíčové změny:**
1. **Sloučit 3 řádky do 1** — provider name + event + meta v jednom flex řádku
2. **Provider color jako left border** (již existuje, zachovat)
3. **Event name je primární** — bold/monospace, zbytek je secondary
4. **URL se zobrazí při hoveru** jako druhý řádek (místo tooltipu)
5. **Zachovat slide-in animaci** pro nové requesty

#### 3.2 Nový row template

**Soubor:** `src/panel/components/request-list.ts`

```typescript
const rowTemplate = document.createElement('template');
rowTemplate.innerHTML = `
  <div class="req-row">
    <div class="req-primary">
      <span class="req-category-icon"></span>
      <span class="req-provider-name"></span>
      <span class="req-event"></span>
      <span class="req-meta">
        <span class="req-status"></span>
        <span class="req-meta-sep">·</span>
        <span class="req-method"></span>
        <span class="req-meta-sep">·</span>
        <span class="req-size"></span>
        <span class="req-meta-sep">·</span>
        <span class="req-duration"></span>
      </span>
      <span class="req-time"></span>
    </div>
    <div class="req-url-preview"></div>
  </div>
`;
```

#### 3.3 CSS pro nový row

**Soubor:** `styles/input.css` — nahradit existující `.req-*` třídy

```css
.req-row {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 100ms var(--ease);
}

.req-row.new {
  animation: slideIn 150ms var(--ease);
}

.req-row:hover {
  background: var(--bg-hover);
  border-left-color: var(--accent-muted);
}

.req-row:hover .req-url-preview {
  max-height: 18px;
  opacity: 1;
  margin-top: 2px;
}

.req-row.active {
  background: var(--bg-active);
  border-left-color: var(--accent);
  box-shadow: inset 1px 0 0 var(--accent);
}

.req-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  min-height: 22px;
}

.req-category-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--text-2);
}

.req-category-icon svg {
  width: 13px;
  height: 13px;
}

.req-provider-name {
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.req-event {
  color: var(--text-0);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.req-meta {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 11px;
  color: var(--text-2);
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.req-meta-sep {
  margin: 0 4px;
  color: var(--text-3);
}

.req-status {
  font-weight: 500;
}

.req-method {
  font-weight: 500;
}

.req-time {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-2);
  flex-shrink: 0;
  margin-left: auto;
}

/* URL preview — viditelný pouze při hoveru */
.req-url-preview {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 20px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 150ms var(--ease), opacity 150ms var(--ease), margin-top 150ms var(--ease);
}

/* Compact mode — skrýt meta info */
body.compact-rows .req-meta {
  display: none;
}

body.compact-rows .req-row {
  padding: 3px 10px;
}

body.compact-rows .req-row:hover .req-url-preview {
  display: none;
}
```

#### 3.4 Aktualizace `createRequestRow()`

**Soubor:** `src/panel/components/request-list.ts`

Aktualizovat funkci tak, aby:
- Plnila novou strukturu (`.req-primary` s inline meta, `.req-url-preview`)
- `.req-url-preview` obsahuje URL (bez nativního `title` atributu)
- Zachovat existující logiku pro provider icon, EXT badge, status/method barvy

#### 3.5 Zachování compact mode

Compact mode nyní:
- Skryje `.req-meta` (status, method, size, duration)
- Skryje `.req-url-preview`
- Row je jen: `[icon] ProviderName    event_name    time`

To je mnohem lepší než současný compact mode, který skrývá event name.

### Checklist Fáze 3
- [ ] Nový row template v `request-list.ts`
- [ ] Nový CSS pro `.req-*` třídy
- [ ] Aktualizovat `createRequestRow()` pro novou strukturu
- [ ] URL preview při hoveru (bez nativního tooltipu)
- [ ] Compact mode skrývá jen meta, zachovává event
- [ ] Zachovat provider barvy, status barvy, method barvy
- [ ] Zachovat slide-in animaci
- [ ] Ověřit keyboard navigaci (↑↓) stále funguje
- [ ] Ověřit selected/active state

---

## FÁZE 4: Detail Pane Improvements — Den 4-5

### Problém
- **5 tabů vypadají stejně** — chybí vizuální rozdíl mezi "důležitým" Decoded tabem a ostatními
- **Detail header je plochý** — provider badge, URL a meta info chybí vizuální hloubka
- **Parametry nemají hierarchii** — vše vypadá stejně důležitě

### Řešení

#### 4.1 Vylepšení detail header

**Současný stav:**
```
[GA4 badge] https://google-analytics.com/...  [✕]
Method: POST | Status: 200 | Duration: 45ms | Time: 12:34:56
```

**Nový stav:**
```
┌─────────────────────────────────────────────────────────────┐
│ [GA4 badge]  page_view                        [✕]          │
│ https://google-analytics.com/g/collect?v=2&...              │
│ POST · 200 OK · 45ms · 1.2KB · 12:34:56                   │
└─────────────────────────────────────────────────────────────┘
```

Změny:
- **Provider badge + event name** na prvním řádku (event z detail pane, ne z row)
- **URL na druhém řádku** v monospace, muted color
- **Meta info na třetím řádku** jako inline badges s separátory

**HTML změny:**

```html
<div id="detail-header">
  <div id="detail-provider-badge"></div>
  <div id="detail-event-name" style="flex:1; font-weight:500; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
  <button id="btn-close-detail" data-tooltip="Close detail">
    <svg width="12" height="12" ...>...</svg>
  </button>
</div>
<div id="detail-url"></div>
<div id="detail-meta">
  <!-- Same as before but with better styling -->
</div>
```

#### 4.2 Tab indicator s barvou

Změnit `.dtab.active` tak, aby měl barevné podtržení:

```css
.dtab.active {
  color: var(--text-0);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
```

To už existuje! Jen ověřit, že funguje správně.

#### 4.3 Vylepšení param rows — klíčové parametry zvýraznit

V Decoded tabu, parametry jako `event`, `client_id`, `user_id` by měly být vizuálně odlišené:

```css
/* Klíčové parametry (event name, user identifiers) */
.param-row.param-key-important .param-key {
  color: var(--accent);
  font-weight: 600;
}

.param-row.param-key-important .param-value {
  font-weight: 500;
}
```

V `decoded.ts` přidat detekci důležitých klíčů a přidat třídu `param-key-important`.

### Checklist Fáze 4
- [ ] Přidat `#detail-event-name` element do headeru
- [ ] Aktualizovat `selectRequest()` v `detail-pane.ts` pro event name
- [ ] Vylepšit detail meta styling
- [ ] Přidat `.param-key-important` CSS třídu
- [ ] Aktualizovat `renderCategoryParams()` v `decoded.ts`

---

## FÁZE 5: Empty States & Status Bar — Den 5-6

### Problém
- **Empty state je prázdný** — jen radar animace a text, chybí akční odkazy
- **Status bar je informační** — chybí vizuální indikace stavu
- **Memory bar je subtilní** — 2px vysoký, uživatel si nevšimne

### Řešení

#### 5.1 Vylepšení empty state

**Soubor:** `public/panel.html` — upravit `#empty-state`

```html
<div id="empty-state">
  <div class="empty-icon">
    <svg width="40" height="40" viewBox="0 0 40 40" class="empty-radar">
      <!-- existing radar SVG -->
    </svg>
  </div>
  <div class="empty-title">Waiting for requests...</div>
  <div class="empty-subtitle">
    Navigate on the page or trigger actions to capture tracking requests.<br>
    Supported: GA4, GTM, Meta, Hotjar, Tealium, Adobe, and 60+ more.
  </div>
  <div class="empty-actions">
    <button class="empty-action-btn" data-tooltip="Open keyboard shortcuts reference">
      <i data-lucide="keyboard" style="width:12px;height:12px;"></i>
      <span>Keyboard shortcuts</span>
    </button>
  </div>
</div>
```

#### 5.2 Status bar — recording pulse indicator

Přidat malý pulzující dot vedle "Recording" textu:

```css
.status-recording-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--green);
  animation: statusPulse 2s infinite;
  flex-shrink: 0;
}

body.paused .status-recording-dot {
  background-color: var(--yellow);
  animation: none;
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

#### 5.3 Memory bar — větší a informativnější

Zvýšit z 2px na 3px a přidat tooltip:

```css
#memory-bar {
  height: 3px;
  /* ... existing styles ... */
}
```

### Checklist Fáze 5
- [ ] Vylepšit empty state text a přidat akční tlačítka
- [ ] Přidat recording pulse dot do status bar
- [ ] Zvětšit memory bar na 3px
- [ ] Přidat data-tooltip na memory bar s textem např. "450 / 500 requests"

---

## FÁZE 6: Popup Redesign — Den 6

### Problém
- **Popup vypadá jinak než panel** — používá jiné CSS proměnné, jiný font
- **Chybí Dragon Eye theme** — popup má generic dark theme místo teplé palety
- **Poskytuje jen základní info** — chybí interaktivita

### Řešení

#### 6.1 Sjednotit popup s Dragon Eye paletou

**Soubor:** `public/popup.css`

Nahradit existující `:root` proměnné Dragon Eye paletou (stejnou jako v panelu):

```css
:root {
  --bg-0: #141210;
  --bg-1: #1a1816;
  --bg-2: #221f1c;
  --bg-3: #2a2622;
  --text-0: #f5f0e8;
  --text-1: #b8a89a;
  --text-2: #7a6b5c;
  --border: rgba(251, 191, 36, 0.12);
  --accent: #F59E0B;
  --accent-muted: rgba(245, 158, 11, 0.15);
  --green: #3ecf8e;
  --red: #ef5350;
  --purple: #ab47bc;
  --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;
  --radius: 6px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 6.2 Použít IBM Plex font v popupu

Přidat do `popup.html`:
```html
<link rel="stylesheet" href="../dist/panel.css">
```

Tím se načtou IBM Plex fonty (jsou už v CSS bundle). Pak změnit:
```css
body {
  font-family: var(--font-sans);
}
```

#### 6.3 Vylepšení provider pills v popupu

Provider pills v popupu by měly používat stejné barvy jako v panelu:

```css
.provider-pill {
  /* existing styles */
  border-left-color: var(--provider-color, var(--accent));
}
```

To vyžaduje, aby popup.ts nastavoval `--provider-color` CSS proměnnou na každém pillu.

### Checklist Fáze 6
- [ ] Sjednotit popup CSS proměnné s Dragon Eye paletou
- [ ] Načíst panel.css v popup.html pro IBM Plex fonty
- [ ] Aktualizovat popup.ts pro provider barvy
- [ ] Ověřit vizuální konzistenci popup ↔ panel

---

## FÁZE 7: Micro-interactions & Polish — Den 7-8

### 7.1 Smooth scroll do selected row

Při keyboard navigaci (↑↓) přidat smooth scroll:

```typescript
// V navigateList()
nextRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
```

To už částečně existuje v `selectRequest()` — ověřit konzistenci.

### 7.2 Focus ring improvement

Všechen interaktivní elementy by měly mít focus ring:

```css
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* Výjimka: neukazovat focus ring při mouse click */
button:focus:not(:focus-visible) {
  outline: none;
}
```

### 7.3 Popover animation

Popovers by měly mít fade-in animaci:

```css
#settings-popover.visible,
#provider-popover.visible,
#consent-popover.visible,
#info-popover.visible,
#env-popover.visible {
  display: block;
  animation: popoverFadeIn 120ms var(--ease);
}

@keyframes popoverFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 7.4 Request row selection transition

Přidat subtilní transition při select/deselect:

```css
.req-row {
  transition: background 100ms var(--ease), border-left-color 100ms var(--ease);
}
```

To už částečně existuje — jen ověřit.

### 7.5 Scrollbar styling

Už existuje v `@layer utilities`. Ověřit, že je konzistentní napříč všem scrollable elementy.

### Checklist Fáze 7
- [ ] Smooth scroll při keyboard navigaci
- [ ] Focus visible styling pro všechny interaktivní elementy
- [ ] Popover fade-in animace
- [ ] Request row transition
- [ ] Konzistentní scrollbar styling

---

## Shrnutí změn

### Nové soubory
| Soubor | Účel |
|--------|-------|
| `src/panel/utils/tooltip.ts` | Custom tooltip systém |

### Modifikované soubory
| Soubor | Změny |
|--------|-------|
| `public/panel.html` | Toolbar reorganizace, `title` → `data-tooltip`, detail header, empty state |
| `styles/input.css` | Tooltip CSS, nový row CSS, focus styles, popover animace, memory bar |
| `src/panel/index.ts` | Inicializace tooltip, aktualizace tooltip textů |
| `src/panel/components/request-list.ts` | Nový row template, URL preview |
| `src/panel/components/detail-pane.ts` | Event name v headeru |
| `src/panel/tabs/decoded.ts` | Important param highlighting |
| `public/popup.html` | Načíst panel.css |
| `public/popup.css` | Dragon Eye paleta, IBM Plex font |

### Nezměněné soubory
- Provider systém (`src/providers/`)
- State management (`src/panel/state.ts`, `src/panel/datalayer/state.ts`)
- Network capture (`src/devtools/`)
- Background service worker (`src/background/`)
- Content scripts (`src/content/`)
- Typy (`src/types/`)

---

## Rizika a mitigace

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|--------|----------------|-------|----------|
| Performance — nový row template pomalejší při 500+ requestech | Střední | Střední | Zachovat template cloning, otestovat s 1000 requesty |
| Tooltip positioning při scrollování | Střední | Nízký | `pointerenter/leave` eventy s automatickým zavíráním |
| Popup načítání panel.css zvětší payload | Nízký | Nízký | Panel.css je už cached, popup je oddělený context |
| Break keyboard navigation | Nízký | Vysoký | Testovat ↑↓, Home/End, Esc po každé fázi |
| Popover positioning po toolbar reorganizaci | Střední | Střední | Ověřit pozice popoverů (top: 66px může změnit) |

---

## Doporučený pořadí implementace

1. **Fáze 1 (Tooltip)** — nejdůležitější bug fix, odemkne ostatní fáze
2. **Fáze 2 (Toolbar)** — rychlý vizuální win, snadná implementace
3. **Fáze 3 (Request List)** — největší UX improvement
4. **Fáze 5 (Empty States & Status Bar)** — rychlé vylepšení
5. **Fáze 4 (Detail Pane)** — smaller improvement
6. **Fáze 6 (Popup)** — nice to have
7. **Fáze 7 (Polish)** — final pass

Po každé fázi: `npm run build` → reload extension → test v DevTools panelu.
