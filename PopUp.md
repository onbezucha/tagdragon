# TagDragon Popup — Technická implementační specifikace

**Verze:** 1.0  
**Datum:** 2026-03-20  
**Status:** Draft

---

## 1. Přehled

### 1.1 Účel

Popup okno poskytuje rychlý náhled do statistik zachycených tracking requestů bez nutnosti otevírat DevTools. Slouží jako "teploměr" aktivity a umožňuje základní akce.

### 1.2 Cíloví uživatelé

- **Vývojáři** — rychlá kontrola, zda tracking běží
- **Marketing specialisté** — ověření implementace bez technických detailů

### 1.3 Klíčové požadavky

| Požadavek | Priorita |
|-----------|----------|
| Zobrazení počtu zachycených requestů | High |
| Zobrazení detekovaných providerů s počty | High |
| Per-tab statistiky (ne globální) | High |
| Pause/Resume funkce | High |
| Indikátor stavu DevTools | High |
| Tlačítko "Otevřít DevTools" | High |
| Badge counter na ikoně | Medium |
| Konsistentní dark theme | Medium |

---

## 2. Architektura

### 2.1 Komponenty

```
┌─────────────────────────────────────────────────────────────┐
│                      CHROME EXTENSION                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   POPUP      │    │  BACKGROUND  │    │  DEVTOOLS    │  │
│  │              │    │  (service    │    │  PANEL       │  │
│  │  UI + logic  │◄──►│   worker)    │◄──►│              │  │
│  │              │    │              │    │  Full UI     │  │
│  └──────────────┘    │  - State     │    │  Filters     │  │
│         │            │  - Badge     │    │  Detail      │  │
│         │            │  - Relay     │    │              │  │
│         │            └──────┬───────┘    └──────────────┘  │
│         │                   │                              │
│         │            ┌──────▼───────┐                      │
│         │            │   STORAGE    │                      │
│         └───────────►│  (session)   │                      │
│                      └──────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Datový tok

```
┌─────────────┐    Network     ┌─────────────┐
│   Tab       │ ──────────────►│  DevTools   │
│  (page)     │                │  Panel      │
└─────────────┘                └──────┬──────┘
                                      │
                                      │ ParsedRequest
                                      ▼
                               ┌─────────────┐
                               │  Storage    │
                               │  (session)  │
                               └──────┬──────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
                   ┌─────────────┐         ┌─────────────┐
                   │  Popup      │         │  Background │
                   │  (read)     │         │  (badge)    │
                   └─────────────┘         └─────────────┘
```

### 2.3 State management strategie

**Rozhodnutí:** Data zůstávají v `chrome.storage.session` (nebo memory v background workeru). Popup čte data on-demand.

| Storage | Použití | Životnost |
|---------|---------|-----------|
| `chrome.storage.session` | Per-tab statistiky | Do zavření prohlížeče |
| `chrome.storage.local` | Nastavení, hidden providers | Trvalé |
| Memory (background) | Dočasná data, badge counter | Do restartu service workeru |

---

## 3. Struktura souborů

### 3.1 Nové soubory

```
TagDragon/
├── public/
│   └── popup.html              # HTML struktura popupu
├── src/
│   ├── popup/
│   │   ├── index.ts            # Hlavní logika popupu → dist/popup.js
│   │   ├── state.ts            # Lokální state popupu
│   │   ├── components/
│   │   │   ├── header.ts       # Header s tlačítky
│   │   │   ├── status-bar.ts   # Recording status + pause
│   │   │   ├── providers.ts    # Provider pills
│   │   │   ├── summary.ts      # Statistiky
│   │   │   └── actions.ts      # Quick actions
│   │   └── utils/
│   │       ├── format.ts       # Formátování čísel, velikostí
│   │       └── dom.ts          # DOM helpers
│   └── background/
│       ├── popup-bridge.ts     # Handler pro GET_POPUP_STATS
│       └── badge.ts            # Badge counter logika
└── styles/
    └── popup.css               # Tailwind input → dist/popup.css
```

### 3.2 Modifikované soubory

| Soubor | Změna |
|--------|-------|
| `manifest.json` | Přidat `action` konfiguraci |
| `rollup.config.js` | Přidat popup entry point |
| `src/background/index.ts` | Import popup-bridge, badge |
| `src/devtools/index.ts` | Synchronizace pause stavu |

---

## 4. Manifest změny

### 4.1 manifest.json

```json
{
  "manifest_version": 3,
  "name": "TagDragon",
  "version": "1.4.0",
  "description": "...",
  
  "action": {
    "default_popup": "public/popup.html",
    "default_icon": {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png"
    },
    "default_title": "TagDragon - Request Tracker"
  },
  
  "devtools_page": "public/devtools.html",
  "background": {
    "service_worker": "dist/background.js"
  },
  "permissions": [
    "webRequest",
    "storage",
    "declarativeNetRequest",
    "cookies",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
}
```

### 4.2 Poznámky

- `action` nahrazuje `browser_action` z MV2
- `activeTab` permission pro přístup k aktuálnímu tabu bez `host_permissions`
- Badge se nastavuje přes `chrome.action.setBadgeText()`

---

## 5. Datové struktury

### 5.1 PopupStats (odpověď z background)

```typescript
// src/types/popup.ts

export interface ProviderStats {
  name: string;
  color: string;
  count: number;
}

export interface TabPopupStats {
  tabId: number;
  url: string;
  hostname: string;
  title: string;
  
  // Stav
  isDevToolsOpen: boolean;
  isPaused: boolean;
  
  // Statistiky
  totalRequests: number;
  totalSize: number;        // bytes
  avgDuration: number;      // ms
  successRate: number;      // 0-100
  
  // Providers
  providers: ProviderStats[];
  
  // Timestamps
  firstRequest: string | null;   // ISO string
  lastRequest: string | null;    // ISO string
  
  // Pro "Top N + others" pattern
  topProviders: ProviderStats[];
  otherProvidersCount: number;
  otherProvidersTotal: number;
}

export interface PopupMessageRequest {
  type: 'GET_POPUP_STATS';
  tabId?: number;  // pokud chybí, použije activeTab
}

export interface PopupMessageResponse {
  ok: boolean;
  data?: TabPopupStats;
  error?: string;
}
```

### 5.2 Storage schema

```typescript
// chrome.storage.session klíče

interface SessionStorageSchema {
  // Per-tab statistiky
  'popup_stats': Record<number, TabPopupStats>;  // tabId → stats
  
  // Pause stav per tab
  'paused_tabs': number[];  // array of tabIds
  
  // Globální pause
  'global_paused': boolean;
  
  // Last activity timestamp
  'last_activity': string;  // ISO timestamp
}
```

---

## 6. UI Specifikace

### 6.1 Rozměry

| Vlastnost | Hodnota | Poznámka |
|-----------|---------|----------|
| Šířka | 320px | Fixed |
| Min výška | 200px | Empty state |
| Max výška | 500px | S overflow scroll |
| Padding | 12px | Všude |
| Gap | 8px | Mezi sekcemi |

### 6.2 HTML struktura

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=320">
  <title>TagDragon</title>
  <link rel="stylesheet" href="../dist/popup.css">
</head>
<body>
  <div id="app">
    <!-- Header -->
    <header class="header">
      <div class="header-brand">
        <span class="brand-icon">🐉</span>
        <span class="brand-name">TagDragon</span>
      </div>
      <div class="header-actions">
        <button id="btn-settings" title="Nastavení">⚙️</button>
        <button id="btn-devtools" title="Otevřít DevTools">📊</button>
      </div>
    </header>
    
    <!-- DevTools Warning (podmíněně) -->
    <div id="devtools-warning" class="warning hidden">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">DevTools nejsou otevřeny</span>
      <button id="btn-open-devtools">Otevřít</button>
    </div>
    
    <!-- Adobe Redirect Warning (podmíněně) -->
    <div id="adobe-warning" class="warning hidden">
      <span class="warning-icon">🔄</span>
      <span class="warning-text">Adobe redirect: <span id="adobe-env">DEV</span></span>
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-indicator">
        <span id="status-dot" class="dot recording"></span>
        <span id="status-text">Recording</span>
      </div>
      <button id="btn-pause" class="btn-pause">
        <span class="pause-icon">⏸</span>
        <span class="pause-text">Pause</span>
      </button>
    </div>
    
    <!-- Providers Section -->
    <section class="providers-section">
      <h3 class="section-title">Detekované providery</h3>
      <div id="providers-empty" class="empty-state hidden">
        Žádné requesty zachyceny
      </div>
      <div id="providers-list" class="providers-list">
        <!-- Dynamicky generováno -->
      </div>
      <button id="btn-show-all" class="btn-show-all hidden">
        Zobrazit všechny (<span id="others-count">0</span>)
      </button>
    </section>
    
    <!-- Summary Section -->
    <section class="summary-section">
      <h3 class="section-title">Souhrn</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Celkem requestů</span>
          <span id="total-requests" class="summary-value">0</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Přeneseno dat</span>
          <span id="total-size" class="summary-value">0 B</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Průměrná odezva</span>
          <span id="avg-duration" class="summary-value">0 ms</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Úspěšnost</span>
          <span id="success-rate" class="summary-value">0%</span>
        </div>
      </div>
      <div class="last-activity">
        Poslední aktivita: <span id="last-activity">-</span>
      </div>
    </section>
    
    <!-- Actions -->
    <section class="actions-section">
      <button id="btn-clear" class="btn-action btn-danger">
        <span class="btn-icon">🗑️</span>
        <span>Vyčistit vše</span>
      </button>
    </section>
    
    <!-- Footer -->
    <footer class="footer">
      <span class="footer-version">v1.4.0</span>
      <a href="#" id="btn-help" class="footer-link">Nápověda</a>
    </footer>
  </div>
  
  <script src="../dist/popup.js"></script>
</body>
</html>
```

### 6.3 CSS proměnné (sdílené s panelem)

```css
/* styles/popup.css - Tailwind input */

:root {
  /* Sdílené s panelem - konzistentní theme */
  --bg-0: #1e1e1e;
  --bg-1: #252526;
  --bg-2: #2d2d30;
  --text-0: #cccccc;
  --text-1: #9d9d9d;
  --border: #3c3c3c;
  --accent: #e8710a;
  --accent-muted: rgba(232, 113, 10, 0.2);
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;
  
  /* Popup specifické */
  --popup-width: 320px;
  --popup-padding: 12px;
  --popup-gap: 8px;
}

/* Base */
body {
  width: var(--popup-width);
  margin: 0;
  padding: 0;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-0);
  background-color: var(--bg-0);
}

#app {
  display: flex;
  flex-direction: column;
  gap: var(--popup-gap);
  padding: var(--popup-padding);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--popup-gap);
  border-bottom: 1px solid var(--border);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.brand-icon {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

/* Buttons */
button {
  background: none;
  border: 1px solid var(--border);
  padding: 6px 12px;
  cursor: pointer;
  color: var(--text-0);
  border-radius: 4px;
  transition: all 150ms;
  font-size: 12px;
}

button:hover {
  background-color: var(--bg-2);
  border-color: var(--text-1);
}

button:active {
  transform: scale(0.98);
}

.btn-pause {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
}

.btn-danger:hover {
  background-color: rgba(244, 67, 54, 0.1);
  border-color: var(--error);
  color: var(--error);
}

/* Warnings */
.warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: rgba(255, 152, 0, 0.1);
  border: 1px solid var(--warning);
  border-radius: 4px;
  font-size: 12px;
}

.warning.hidden {
  display: none;
}

/* Status Bar */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: var(--bg-1);
  border-radius: 4px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--success);
}

.dot.paused {
  background-color: var(--warning);
}

.dot.recording {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Providers */
.providers-section {
  /* ... */
}

.providers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--bg-1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms;
  min-width: 60px;
}

.provider-pill:hover {
  background-color: var(--bg-2);
  transform: translateY(-1px);
}

.provider-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-1);
}

.provider-count {
  font-size: 16px;
  font-weight: 700;
}

/* Summary */
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background-color: var(--bg-1);
  border-radius: 4px;
}

.summary-label {
  font-size: 11px;
  color: var(--text-1);
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
}

.last-activity {
  font-size: 11px;
  color: var(--text-1);
  text-align: center;
  margin-top: 4px;
}

/* Footer */
.footer {
  display: flex;
  justify-content: space-between;
  padding-top: var(--popup-gap);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-1);
}

.footer-link {
  color: var(--accent);
  text-decoration: none;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-1);
}

/* Utilities */
.hidden {
  display: none !important;
}
```

---

## 7. Komunikace Popup ↔ Background

### 7.1 Message typy

```typescript
// src/shared/message-types.ts

export type PopupMessageType = 
  | 'GET_POPUP_STATS'
  | 'PAUSE_RECORDING'
  | 'RESUME_RECORDING'
  | 'CLEAR_REQUESTS'
  | 'OPEN_DEVTOOLS'
  | 'GET_ADOBE_REDIRECT_STATUS';

export interface PopupMessage {
  type: PopupMessageType;
  tabId?: number;
  payload?: unknown;
}
```

### 7.2 Background handler

```typescript
// src/background/popup-bridge.ts

import type { PopupMessage, TabPopupStats } from '@/types/popup';

export function initPopupBridge(): void {
  chrome.runtime.onMessage.addListener((message: PopupMessage, sender, sendResponse) => {
    
    // GET_POPUP_STATS - vrátí statistiky pro aktuální tab
    if (message.type === 'GET_POPUP_STATS') {
      handleGetPopupStats(message.tabId)
        .then(data => sendResponse({ ok: true, data }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
      return true; // async response
    }
    
    // PAUSE_RECORDING
    if (message.type === 'PAUSE_RECORDING') {
      handlePauseRecording(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    
    // RESUME_RECORDING
    if (message.type === 'RESUME_RECORDING') {
      handleResumeRecording(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    
    // CLEAR_REQUESTS
    if (message.type === 'CLEAR_REQUESTS') {
      handleClearRequests(message.tabId)
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    
    // OPEN_DEVTOOLS - programaticky otevřít DevTools (nelze přímo)
    if (message.type === 'OPEN_DEVTOOLS') {
      // Chrome neumožňuje programově otevřít DevTools
      // Můžeme jen zobrazit notifikaci/instrukci
      sendResponse({ 
        ok: false, 
        error: 'Cannot open DevTools programmatically. Press F12 or right-click → Inspect.' 
      });
      return false;
    }
  });
}

async function handleGetPopupStats(tabId?: number): Promise<TabPopupStats> {
  // Pokud není tabId, použij active tab
  const targetTabId = tabId ?? await getActiveTabId();
  
  // Načti statistiky ze storage
  const stats = await loadTabStats(targetTabId);
  
  // Zjisti, zda jsou DevTools otevřeny
  const isDevToolsOpen = await checkDevToolsStatus(targetTabId);
  
  return {
    ...stats,
    isDevToolsOpen,
  };
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab.id;
}

async function loadTabStats(tabId: number): Promise<TabPopupStats> {
  const result = await chrome.storage.session.get('popup_stats');
  const allStats = result.popup_stats ?? {};
  return allStats[tabId] ?? createEmptyStats(tabId);
}

function createEmptyStats(tabId: number): TabPopupStats {
  return {
    tabId,
    url: '',
    hostname: '',
    title: '',
    isDevToolsOpen: false,
    isPaused: false,
    totalRequests: 0,
    totalSize: 0,
    avgDuration: 0,
    successRate: 100,
    providers: [],
    topProviders: [],
    otherProvidersCount: 0,
    otherProvidersTotal: 0,
    firstRequest: null,
    lastRequest: null,
  };
}
```

### 7.3 Aktualizace statistik při novém requestu

```typescript
// src/devtools/index.ts - upraveno

import { updatePopupStats } from '@/background/popup-bridge';

// V request handleru
function onRequestCaptured(request: ParsedRequest): void {
  // ... existující logika ...
  
  // Aktualizuj statistiky pro popup
  updatePopupStatsForTab(tabId, request);
}

// src/background/popup-bridge.ts

export async function updatePopupStatsForTab(
  tabId: number, 
  request: ParsedRequest
): Promise<void> {
  const result = await chrome.storage.session.get('popup_stats');
  const allStats: Record<number, TabPopupStats> = result.popup_stats ?? {};
  
  const stats = allStats[tabId] ?? createEmptyStats(tabId);
  
  // Update counts
  stats.totalRequests++;
  stats.totalSize += request.size;
  stats.lastRequest = request.timestamp;
  if (!stats.firstRequest) stats.firstRequest = request.timestamp;
  
  // Update provider stats
  const providerIndex = stats.providers.findIndex(p => p.name === request.provider);
  if (providerIndex >= 0) {
    stats.providers[providerIndex].count++;
  } else {
    stats.providers.push({
      name: request.provider,
      color: request.color,
      count: 1,
    });
  }
  
  // Sort providers by count
  stats.providers.sort((a, b) => b.count - a.count);
  
  // Update "top + others"
  const TOP_N = 5;
  stats.topProviders = stats.providers.slice(0, TOP_N);
  if (stats.providers.length > TOP_N) {
    stats.otherProvidersCount = stats.providers.length - TOP_N;
    stats.otherProvidersTotal = stats.providers
      .slice(TOP_N)
      .reduce((sum, p) => sum + p.count, 0);
  } else {
    stats.otherProvidersCount = 0;
    stats.otherProvidersTotal = 0;
  }
  
  // Save
  allStats[tabId] = stats;
  await chrome.storage.session.set({ popup_stats: allStats });
  
  // Update badge
  updateBadgeForTab(tabId, stats.totalRequests);
}
```

---

## 8. Badge Counter

### 8.1 Implementace

```typescript
// src/background/badge.ts

const BADGE_COLOR = '#e8710a'; // TagDragon orange

export function initBadge(): void {
  // Nastav výchozí barvu
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  
  // Sleduj změnu aktivního tabu
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    await updateBadgeForActiveTab();
  });
  
  // Sleduj zavření tabu - vyčisti statistiky
  chrome.tabs.onRemoved.addListener(async (tabId) => {
    await cleanupTabStats(tabId);
  });
}

export async function updateBadgeForTab(tabId: number, count: number): Promise<void> {
  // Zjisti, zda je tento tab aktivní
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (activeTab?.id === tabId) {
    await setBadgeCount(count);
  }
}

export async function updateBadgeForActiveTab(): Promise<void> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    await setBadgeCount(0);
    return;
  }
  
  const stats = await loadTabStats(activeTab.id);
  await setBadgeCount(stats.totalRequests);
}

async function setBadgeCount(count: number): Promise<void> {
  const text = count > 999 ? '999+' : count.toString();
  await chrome.action.setBadgeText({ text });
}

async function cleanupTabStats(tabId: number): Promise<void> {
  const result = await chrome.storage.session.get('popup_stats');
  const allStats = result.popup_stats ?? {};
  delete allStats[tabId];
  await chrome.storage.session.set({ popup_stats: allStats });
}
```

### 8.2 Badge stavy

| Stav | Text | Barva | Poznámka |
|------|------|-------|----------|
| Žádné requesty | `""` (empty) | - | Nezobrazuje se |
| 1-999 requestů | `"142"` | Orange | Normální |
| 1000+ requestů | `"999+"` | Orange | Maximum |
| Pauznuto | `"⏸"` | Yellow | Volitelné |

---

## 9. Pause/Resume

### 9.1 Chování

| Akce | Efekt |
|------|-------|
| **Pause v popupu** | Pauzne zachytávání pro aktuální tab |
| **Pause v DevTools** | Synchronizuje se do popupu |
| **Resume** | Pokračuje v zachytávání |
| **Data při pauze** | Zachovají se, nepřepisují |

### 9.2 Implementace

```typescript
// src/background/popup-bridge.ts

async function handlePauseRecording(tabId?: number): Promise<void> {
  const targetTabId = tabId ?? await getActiveTabId();
  
  // Ulož do storage
  const result = await chrome.storage.session.get('paused_tabs');
  const pausedTabs: number[] = result.paused_tabs ?? [];
  
  if (!pausedTabs.includes(targetTabId)) {
    pausedTabs.push(targetTabId);
    await chrome.storage.session.set({ paused_tabs: pausedTabs });
  }
  
  // Informuj DevTools panel (pokud je otevřen)
  await notifyDevTools(targetTabId, { type: 'RECORDING_PAUSED', tabId: targetTabId });
  
  // Aktualizuj stats
  const stats = await loadTabStats(targetTabId);
  stats.isPaused = true;
  await saveTabStats(targetTabId, stats);
}

async function handleResumeRecording(tabId?: number): Promise<void> {
  const targetTabId = tabId ?? await getActiveTabId();
  
  // Odeber ze storage
  const result = await chrome.storage.session.get('paused_tabs');
  const pausedTabs: number[] = result.paused_tabs ?? [];
  const index = pausedTabs.indexOf(targetTabId);
  
  if (index >= 0) {
    pausedTabs.splice(index, 1);
    await chrome.storage.session.set({ paused_tabs: pausedTabs });
  }
  
  // Informuj DevTools panel
  await notifyDevTools(targetTabId, { type: 'RECORDING_RESUMED', tabId: targetTabId });
  
  // Aktualizuj stats
  const stats = await loadTabStats(targetTabId);
  stats.isPaused = false;
  await saveTabStats(targetTabId, stats);
}

export async function isTabPaused(tabId: number): Promise<boolean> {
  const result = await chrome.storage.session.get('paused_tabs');
  const pausedTabs: number[] = result.paused_tabs ?? [];
  return pausedTabs.includes(tabId);
}

async function notifyDevTools(tabId: number, message: unknown): Promise<void> {
  // Pošli zprávu do DevTools panelu přes content script nebo přímo
  // Toto závisí na architektuře komunikace
  try {
    await chrome.runtime.sendMessage({
      type: 'BROADCAST_TO_DEVTOOLS',
      tabId,
      payload: message,
    });
  } catch {
    // DevTools může být zavřený, ignoruj
  }
}
```

### 9.3 Synchronizace s DevTools

```typescript
// src/panel/index.ts

// Při změně pause stavu v panelu
function handlePauseToggle(): void {
  const newPausedState = !getIsPaused();
  setIsPaused(newPausedState);
  
  // Synchronizuj s background
  chrome.runtime.sendMessage({
    type: newPausedState ? 'PAUSE_RECORDING' : 'RESUME_RECORDING',
    tabId: getCurrentTabId(),
  }).catch(() => {});
}

// Poslouchej změny z popupu
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RECORDING_PAUSED') {
    setIsPaused(true);
    updatePauseUI();
  }
  if (message.type === 'RECORDING_RESUMED') {
    setIsPaused(false);
    updatePauseUI();
  }
});
```

---

## 10. DevTools Status Detection

### 10.1 Problém

Chrome neumožňuje přímo zjistit, zda jsou DevTools otevřeny pro daný tab.

### 10.2 Řešení

**Přístup:** Udržuj stav v background storage. DevTools panel při otevření/zavření aktualizuje storage.

```typescript
// src/devtools/index.ts

// Při inicializaci panelu
async function initDevToolsPanel(): Promise<void> {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  
  // Označ DevTools jako otevřené
  await chrome.storage.session.set({
    [`devtools_open_${tabId}`]: true,
  });
  
  // Při zavření panelu
  window.addEventListener('unload', async () => {
    await chrome.storage.session.remove(`devtools_open_${tabId}`);
  });
  
  // ... zbytek inicializace ...
}

// src/background/popup-bridge.ts

export async function checkDevToolsStatus(tabId: number): Promise<boolean> {
  const result = await chrome.storage.session.get(`devtools_open_${tabId}`);
  return result[`devtools_open_${tabId}`] === true;
}
```

### 10.3 UI indikátor

```
┌─────────────────────────────────────────┐
│ ⚠️ DevTools nejsou otevřeny             │
│                                         │
│ Pro zachytávání requestů otevřete       │
│ DevTools (F12 nebo pravé tlačítko →     │
│ Prozkoumat).                            │
│                                         │
│         [📊 Otevřít DevTools]           │
│         (zobrazí instrukce)             │
└─────────────────────────────────────────┘
```

---

## 11. Provider Pills Interakce

### 11.1 Kliknutí na pill

Kliknutí na provider pill otevře DevTools s přednastaveným filtrem na tento provider.

```typescript
// src/popup/components/providers.ts

function renderProviderPill(provider: ProviderStats): HTMLElement {
  const pill = document.createElement('div');
  pill.className = 'provider-pill';
  pill.style.borderLeftColor = provider.color;
  pill.style.borderLeftWidth = '3px';
  
  pill.innerHTML = `
    <span class="provider-name">${provider.name}</span>
    <span class="provider-count">${provider.count}</span>
  `;
  
  pill.addEventListener('click', () => {
    openDevToolsWithFilter(provider.name);
  });
  
  return pill;
}

async function openDevToolsWithFilter(providerName: string): Promise<void> {
  // Ulož filter do storage pro DevTools panel
  await chrome.storage.session.set({
    pending_filter: {
      provider: providerName,
      timestamp: Date.now(),
    },
  });
  
  // Zobraz instrukce (nelze otevřít DevTools programově)
  showNotification('Stiskněte F12 pro otevření DevTools s filtrem na ' + providerName);
}
```

### 11.2 Hover efekt

```css
.provider-pill:hover {
  background-color: var(--bg-2);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

---

## 12. Rollup konfigurace

### 12.1 rollup.config.js

```javascript
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const config = (input, output) => ({
  input,
  output: {
    file: output,
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
});

export default [
  config('src/background/index.ts', 'dist/background.js'),
  config('src/devtools/index.ts', 'dist/devtools.js'),
  config('src/panel/index.ts', 'dist/panel.js'),
  config('src/popup/index.ts', 'dist/popup.js'),  // ← NOVÉ
];
```

---

## 13. Testovací scénáře

### 13.1 Funkční testy

| # | Scénář | Očekávaný výsledek |
|---|--------|-------------------|
| 1 | Otevřít popup bez zachycených requestů | Empty state, "0 requestů" |
| 2 | Zachytit request, otevřít popup | Zobrazí provider, count: 1 |
| 3 | Pause v popupu | Status se změní, badge = ⏸ |
| 4 | Resume v popupu | Status se změní, badge = count |
| 5 | Klik na provider pill | Instrukce pro otevření DevTools |
| 6 | Přepnout na jiný tab | Badge aktualizuje count |
| 7 | Zavřít tab | Statistiky se vyčistí |
| 8 | Otevřít DevTools, pause v panelu | Popup zobrazí paused stav |
| 9 | Clear v popupu | Všechna data vymazána, badge = "" |
| 10 | 1000+ requestů | Badge = "999+" |

### 13.2 Edge cases

| # | Scénář | Řešení |
|---|--------|--------|
| 1 | `chrome://` URL | Zobraz "Tato stránka nemůže být sledována" |
| 2 | Service worker restart | Obnovit badge z session storage |
| 3 | Více oken | Per-window active tab tracking |
| 4 | Rychlé přepínání tabů | Debounce badge aktualizací |

---

## 14. Budoucí rozšíření (v2)

| Feature | Priorita | Závislost |
|---------|----------|-----------|
| Request timeline v popupu | Medium | Více místa, lazy loading |
| Comparison mode (před/po) | Low | Storage strategie |
| Custom provider patterns | Medium | Settings UI |
| Alert rules (error rate) | Low | Background processing |
| Keyboard shortcuts | Low | manifest.json commands |
| Light/dark theme toggle | Low | CSS variables |

---

## 15. Časový odhad

| Fáze | Úkoly | Čas |
|------|-------|-----|
| **Fáze 1: Základ** | manifest, HTML, CSS base | 2h |
| **Fáze 2: Logika** | popup/index.ts, komponenty | 3h |
| **Fáze 3: Background** | popup-bridge, badge | 2h |
| **Fáze 4: Integrace** | Synchronizace s DevTools | 2h |
| **Fáze 5: Polish** | Styling, empty states, edge cases | 2h |
| **Fáze 6: Testování** | Manuální testy, bugfixes | 2h |
| **CELKEM** | | **~13h** |

---

## 16. Otevřené otázky

| # | Otázka | Možnosti |
|---|--------|----------|
| 1 | Maximum providerů v seznamu? | 5, 10, nebo všechny s scroll |
| 2 | Badge při pauze? | ⏸ symbol, nebo prázdné |
| 3 | Clear potvrzení? | Ano/Ne dialog, nebo rovnou |
| 4 | Storage limit handling? | LRU eviction, nebo warn |

---

## 17. Závěr

Tento dokument definuje kompletní technickou specifikaci pro implementaci popup okna v TagDragon. Klíčové body:

- **Architektura:** Popup čte data z `chrome.storage.session`, background worker spravuje badge a synchronizaci
- **State management:** Per-tab statistiky, sdílený pause stav
- **UI:** Minimalistický dashboard s provider pills, statistikami a akcemi
- **Komunikace:** Message passing mezi popup ↔ background ↔ DevTools

**Další krok:** Schválení specifikace a zahájení implementace Fáze 1.
