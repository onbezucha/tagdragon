# DataLayer Tab — Implementation Specification
# TagDragon v1.5.0 Feature
# Approach A: Content Script Bridge (real-time, event-driven)

## 1. ARCHITECTURE OVERVIEW

### 1.1 Data Flow

```
Inspected Page (MAIN world)              Extension
──────────────────────────               ──────────
window.dataLayer.push()                  
  → interceptor                            
    → window.postMessage()  ──────────→  Content Script (ISOLATED world)
      { type: 'TAGDRAGON_DL_PUSH',        src/content/data-layer-bridge.ts
        source: 'gtm',                      chrome.runtime.sendMessage()
        data: {...},                      ──→ Background Service Worker
        timestamp: ...                      src/background/index.ts
        pushIndex: 42 }                    relay to DevTools via tab port
                                          ──→ DevTools Page
                                            src/devtools/index.ts
                                            panelBridge.sendToPanel()
                                          ──→ Panel Window
                                            src/panel/index.ts
                                            window.receiveDataLayerPush()
                                          ──→ DataLayer State
                                            src/panel/datalayer/state.ts
                                          ──→ DataLayer UI
                                            src/panel/datalayer/components/
```

### 1.2 Multi-Source Detection

The MAIN world script detects and intercepts ALL known data layer sources:

| Source | Global Variable | Detection | Interceptor Method |
|--------|----------------|-----------|-------------------|
| GTM | `window.dataLayer` | Check `Array.isArray()` | Monkey-patch `Array.prototype.push` |
| W3C Digital Data | `window.digitalData` | Check `typeof === 'object'` | `MutationObserver` + periodic snapshot |
| Tealium | `window.utag.data` | Check `typeof === 'object'` | Deep proxy wrapper |
| Adobe Launch | `window._satellite` | Check `typeof === 'object'` | `_satellite.track()` override + `dataLayerChanged` listener |
| Segment | `window.analytics` | Check `analytics.track` exists | `analytics.track()` wrapper |
| Custom | `window.__*` pattern scan | Regex on `Object.keys(window)` | Best-effort: periodic snapshot only |

### 1.3 New Entry Points (Rollup)

Two new build targets needed in `rollup.config.js`:

```js
{
  input: 'src/content/data-layer-main.ts',      // MAIN world
  output: { file: 'dist/data-layer-main.js', format: 'iife' },
},
{
  input: 'src/content/data-layer-bridge.ts',     // ISOLATED world  
  output: { file: 'dist/data-layer-bridge.js', format: 'iife' },
},
```

---

## 2. FILE STRUCTURE (NEW FILES)

```
src/
├── content/                              # NEW DIRECTORY
│   ├── data-layer-main.ts                # MAIN world — intercepts pushes
│   └── data-layer-bridge.ts              # ISOLATED world — postMessage relay
├── panel/
│   ├── datalayer/                        # NEW DIRECTORY
│   │   ├── state.ts                      # DataLayer state management
│   │   ├── types.ts                      # DataLayer-specific types
│   │   ├── push-list.ts                  # Push list rendering (equivalent to request-list.ts)
│   │   ├── push-detail.ts                # Push detail pane (equivalent to detail-pane.ts)
│   │   ├── diff-renderer.ts              # Diff highlighting between pushes
│   │   ├── ecommerce-formatter.ts        # E-commerce data special rendering
│   │   ├── correlation.ts                # Network ↔ DataLayer correlation engine
│   │   ├── source-detector.ts            # Detect available data layer sources
│   │   └── current-state.ts              # Current state snapshot view
│   ├── index.ts                          # MODIFIED — tab switching, receiveDataLayerPush()
│   └── utils/
│       └── dom.ts                        # MODIFIED — new DOM refs for DL tab
├── devtools/
│   ├── index.ts                          # MODIFIED — inject content scripts, relay DL messages
│   └── data-layer-relay.ts              # NEW — handles DL message relay from background
├── background/
│   └── index.ts                          # MODIFIED — relay DL messages between content ↔ devtools
├── types/
│   └── datalayer.ts                      # NEW — DataLayerPush, DiffEntry, DataLayerState types
└── shared/
    └── constants.ts                      # MODIFIED — new default config values
```

---

## 3. TYPES

### 3.1 DataLayerPush (new file `src/types/datalayer.ts`)

Types live in a dedicated file — do NOT add to `src/types/request.ts` (that file is scoped to network requests only).

```typescript
export type DataLayerSource =
  | 'gtm'
  | 'digitalData'
  | 'tealium'
  | 'adobe'
  | 'segment'
  | 'custom';

export interface DataLayerPush {
  readonly id: number;                      // Unique ID (Date.now() + random)
  readonly source: DataLayerSource;         // Which data layer source
  readonly sourceLabel: string;             // Display name: "GTM", "Tealium", etc.
  readonly pushIndex: number;               // Index in the dataLayer array
  readonly timestamp: string;               // ISO timestamp of the push
  readonly data: Record<string, unknown>;   // The pushed data object
  readonly cumulativeState: Record<string, unknown>; // Full state AFTER this push (optional, lazy)
  readonly diffFromPrevious: DiffEntry[] | null;     // Diff from previous push (optional, lazy)

  // E-commerce detection (computed)
  readonly _ecommerceType?: 'purchase' | 'checkout' | 'impression' | 'promo' | 'refund' | null;
  readonly _eventName?: string;             // Extracted event name

  // Search indexing
  _searchIndex?: string;
}

export interface DiffEntry {
  readonly key: string;
  readonly path: string;                    // Dot-notation path: "ecommerce.purchase.products"
  readonly type: 'added' | 'removed' | 'changed';
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

export interface DataLayerState {
  all: DataLayerPush[];
  map: Map<number, DataLayerPush>;          // keyed by id (number), consistent with ParsedRequest pattern
  filteredIds: Set<number>;
  selectedId: number | null;
  isPaused: boolean;
  sources: Set<DataLayerSource>;            // Detected sources on this page
  sourceLabels: Map<DataLayerSource, string>; // GTM-GTMXXXXX, etc.
  searchIndex: Map<string, DataLayerPush[]>;
}
```

### 3.2 Message Types (new in background/devtools communication)

**Important:** Content scripts do not know their own `tabId`. The background always reads `tabId` from `sender.tab.id` in the `onMessage` listener — content scripts MUST NOT include `tabId` in their messages.

```typescript
// Content → Background (tabId omitted — background reads from sender.tab.id)
interface DataLayerPushMessage {
  type: 'DATALAYER_PUSH';
  source: DataLayerSource;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
}

// Content → Background (source detection)
interface DataLayerSourcesMessage {
  type: 'DATALAYER_SOURCES';
  sources: DataLayerSource[];
  labels: Record<DataLayerSource, string>;
}

// DevTools → Background (request current state snapshot)
interface DataLayerSnapshotRequest {
  type: 'DATALAYER_SNAPSHOT_REQUEST';
  tabId: number;  // DevTools knows its tabId via chrome.devtools.inspectedWindow.tabId
}

// Content → Background (snapshot response)
interface DataLayerSnapshotResponse {
  type: 'DATALAYER_SNAPSHOT_RESPONSE';
  data: Record<string, unknown>;  // tabId omitted — background reads from sender.tab.id
}

// Background → DevTools port (all downstream messages include tabId, added by background)
interface DataLayerPushPortMessage {
  type: 'DATALAYER_PUSH';
  tabId: number;
  source: DataLayerSource;
  pushIndex: number;
  timestamp: string;
  data: Record<string, unknown>;
}
```

---

## 4. CONTENT SCRIPTS

### 4.1 MAIN World: `src/content/data-layer-main.ts`

**Purpose:** Runs in the page's JS context. Intercepts data layer pushes and sends them via `window.postMessage`.

**Key behaviors:**
1. **GTM interception:** Monkey-patch `Array.prototype.push` on the specific `dataLayer` array instance (NOT global Array.prototype to avoid affecting other arrays).
2. **Tealium interception:** Wrap `window.utag.data` with a Proxy that detects property changes.
3. **Adobe interception:** Override `_satellite.track()` and listen for `adobeDataLayer` changes.
4. **Segment interception:** Wrap `analytics.track()` and `analytics.page()`.
5. **W3C Digital Data:** MutationObserver on the `digitalData` object via Proxy.
6. **Custom scan:** On load, scan `Object.keys(window)` for patterns like `/^(dataLayer|dl|track|analytics|tag)/i`.

**Critical implementation detail for GTM:**

```typescript
// CORRECT: Only patch the specific dataLayer array instance
const originalPush = dataLayer.push.bind(dataLayer);
dataLayer.push = function(...args: any[]) {
  args.forEach(arg => {
    window.postMessage({
      type: 'TAGDRAGON_DL_PUSH',
      source: 'gtm',
      pushIndex: dataLayer.length,
      timestamp: new Date().toISOString(),
      data: arg,
    }, '*');
  });
  return originalPush(...args);
};

// Also replay existing items that were pushed before our script loaded
// (typically items 0..N are already in the array from page load)
```

**Replay strategy:**
- When script injects, `window.dataLayer` may already have N items
- Replay all existing items as "historical" pushes (with original timestamps if detectable)
- Mark replayed items with `isReplay: true` so UI can distinguish them
- For existing items without timestamps, use the page's `performance.timing.navigationStart` + estimated offset

### 4.2 ISOLATED World: `src/content/data-layer-bridge.ts`

**Purpose:** Listens for `window.postMessage` from MAIN world and relays to background via `chrome.runtime.sendMessage`.

**Key behaviors:**
1. `window.addEventListener('message', ...)` — filter for `event.data.type === 'TAGDRAGON_DL_PUSH'`
2. `chrome.runtime.sendMessage({ type: 'DATALAYER_PUSH', tabId, ... })` — relay to background
3. On inject: detect available sources and send `DATALAYER_SOURCES` message
4. Handle `DATALAYER_SNAPSHOT_REQUEST` from background → eval in page → respond with `DATALAYER_SNAPSHOT_RESPONSE`

**Message schema:**
```typescript
// Incoming from MAIN world via postMessage
{ type: 'TAGDRAGON_DL_PUSH', source, pushIndex, timestamp, data }

// Outgoing to background via chrome.runtime.sendMessage (NO tabId — background reads sender.tab.id)
{ type: 'DATALAYER_PUSH', source, pushIndex, timestamp, data }
{ type: 'DATALAYER_SOURCES', sources, labels }
{ type: 'DATALAYER_SNAPSHOT_RESPONSE', data }
```

---

## 5. MANIFEST CHANGES

File location: `manifest.json` (root of repo, not in `public/`).

Add to the existing `"permissions"` array and the two new top-level keys:

```json
{
  "permissions": [
    "webRequest",
    "storage",
    "declarativeNetRequest",
    "cookies",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/data-layer-bridge.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["dist/data-layer-main.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Note:** `"scripting"` is required for `chrome.scripting.executeScript` used by the background to inject content scripts on demand (when DevTools opens on an already-loaded page that was loaded before the content script ran).

**Note:** The MAIN world script is NOT declared in `content_scripts` (that would be ISOLATED world). Instead, the ISOLATED bridge injects it dynamically:

```typescript
// In data-layer-bridge.ts (ISOLATED world)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('dist/data-layer-main.js');
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();  // onload is a property, not a method
```

---

## 6. BACKGROUND CHANGES (`src/background/index.ts`)

**New message handlers:**

1. **DATALAYER_PUSH** — Relay to DevTools page via the tab port
2. **DATALAYER_SOURCES** — Relay to DevTools page
3. **DATALAYER_SNAPSHOT_REQUEST** — Forward to content script
4. **DATALAYER_SNAPSHOT_RESPONSE** — Relay to DevTools page

**Port-based relay (like existing Adobe env switcher pattern):**
- DevTools connects with named port: `devtools_${tabId}` — this port already exists in `src/devtools/index.ts:13` but is currently discarded (`void _devToolsPort`). Background must be extended to store incoming port connections per tabId.
- Background stores port reference per tabId in a `Map<number, chrome.runtime.Port>`
- When DATALAYER_PUSH arrives from content script, background reads `sender.tab.id` and looks up the port

```typescript
// --- Add to background/index.ts ---

// Store DevTools ports per tabId (for relaying DataLayer messages)
const devToolsPorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  const match = port.name.match(/^devtools_(\d+)$/);
  if (!match) return;
  const tabId = Number(match[1]);
  devToolsPorts.set(tabId, port);
  port.onDisconnect.addListener(() => devToolsPorts.delete(tabId));
});

// New handlers in chrome.runtime.onMessage
// (tabId comes from sender.tab.id, NOT from message body)
if (message.type === 'DATALAYER_PUSH') {
  const tabId = sender.tab?.id;
  if (tabId == null) return;
  const port = devToolsPorts.get(tabId);
  if (port) {
    port.postMessage({ type: 'DATALAYER_PUSH', tabId, ...message });
  }
}

if (message.type === 'DATALAYER_SOURCES') {
  const tabId = sender.tab?.id;
  if (tabId == null) return;
  const port = devToolsPorts.get(tabId);
  if (port) {
    port.postMessage({ type: 'DATALAYER_SOURCES', tabId, ...message });
  }
}

if (message.type === 'DATALAYER_SNAPSHOT_RESPONSE') {
  const tabId = sender.tab?.id;
  if (tabId == null) return;
  const port = devToolsPorts.get(tabId);
  if (port) {
    port.postMessage({ type: 'DATALAYER_SNAPSHOT_RESPONSE', tabId, ...message });
  }
}

// DATALAYER_SNAPSHOT_REQUEST comes from DevTools (tabId is in message body)
if (message.type === 'DATALAYER_SNAPSHOT_REQUEST') {
  // Forward to content script in target tab
  chrome.tabs.sendMessage(message.tabId, { type: 'DATALAYER_SNAPSHOT_REQUEST' });
}
```

---

## 7. DEVTOOLS CHANGES (`src/devtools/index.ts`)

**Current state:** `src/devtools/index.ts:13` already creates the port `devtools_${tabId}` but discards it with `void _devToolsPort`. This must be changed — retain the reference and attach a message listener.

**New responsibilities:**

1. **Retain port reference and listen for DataLayer messages:**
   ```typescript
   // CHANGE: was `const _devToolsPort = ...; void _devToolsPort;`
   // NOW: retain reference and attach listener
   const devToolsPort = chrome.runtime.connect({ name: `devtools_${tabId}` });

   devToolsPort.onMessage.addListener((msg) => {
     if (msg.type === 'DATALAYER_PUSH') {
       sendDataLayerPushToPanel(msg);
     }
     if (msg.type === 'DATALAYER_SOURCES') {
       sendDataLayerSourcesToPanel(msg.sources, msg.labels);
     }
     if (msg.type === 'DATALAYER_SNAPSHOT_RESPONSE') {
       sendDataLayerSnapshotToPanel(msg.data);
     }
   });
   ```

2. **Inject content scripts** via background when panel first opens:
   ```typescript
   // In panel.onShown callback (after setPanelWindow):
   chrome.runtime.sendMessage({ type: 'INJECT_DATALAYER', tabId });
   ```
   Background handles `INJECT_DATALAYER` by calling `chrome.scripting.executeScript` to inject `data-layer-bridge.js` into the inspected tab if not already present. This requires adding `"scripting"` to `manifest.json` permissions.

3. **New file: `src/devtools/data-layer-relay.ts`** — `sendDataLayerPushToPanel`, `sendDataLayerSourcesToPanel`, `sendDataLayerSnapshotToPanel` helpers that call into `panelWindow`. Keeps `devtools/index.ts` clean.

**Panel bridge extension (`src/devtools/panel-bridge.ts`):**
- Extend `PanelWindow` interface:
  ```typescript
  interface PanelWindow extends Window {
    receiveRequest: (data: ParsedRequest) => void;           // existing
    receiveDataLayerPush: (data: DataLayerPush) => void;     // NEW
    receiveDataLayerSources: (                               // NEW
      sources: DataLayerSource[],
      labels: Record<DataLayerSource, string>
    ) => void;
    receiveDataLayerSnapshot: (data: Record<string, unknown>) => void; // NEW
    _getHeavyData?: (requestId: number) => HeavyData | null;
    _clearHeavyData?: () => void;
    _deleteHeavyData?: (ids: number[]) => void;
  }
  ```

---

## 8. PANEL UI CHANGES

### 8.1 Top-Level Tab Switcher

**Location:** Inside the existing `#toolbar` div, at the very left (before Clear button).

**HTML structure (added to `panel.html`):**
```html
<div id="tab-switcher">
  <button class="tab-btn active" data-view="network">
    <svg><!-- network icon --></svg>
    <span>Network</span>
  </button>
  <button class="tab-btn" data-view="datalayer">
    <svg><!-- layers icon --></svg>
    <span>DataLayer</span>
  </button>
</div>
```

**CSS:** Tab buttons styled similarly to existing `.dtab` but in toolbar context. Active tab gets accent underline.

**Behavior:**
- Clicking switches between `#network-view` and `#datalayer-view` containers
- Only ONE view is visible at a time (`display: none` / `display: grid`)
- Each view has its own toolbar section, filter bar, list pane, detail pane
- State is preserved when switching (both views stay in memory)

### 8.2 Panel HTML Restructure

**Grid layout constraint:** `panel.html` sets `body { display: grid; grid-template-rows: 36px auto 1fr 24px; }` — 4 rows: toolbar, filter bar, content, status bar. The filter bar row is `auto` (collapses when hidden). `#dl-filter-bar` replaces (not adds to) the filter bar slot — only one filter bar is visible at a time, so the grid row count stays at 4.

```html
<body>
  <!-- ROW 1: TOOLBAR (shared, toolbar sections swap per-view) -->
  <div id="toolbar">
    <div class="toolbar-section">
      <!-- TAB SWITCHER (always visible) -->
      <div id="tab-switcher">...</div>

      <!-- NETWORK TOOLBAR (visible when network tab active) -->
      <div id="network-toolbar" class="view-toolbar">...</div>

      <!-- DATALAYER TOOLBAR (visible when datalayer tab active) -->
      <div id="datalayer-toolbar" class="view-toolbar" style="display:none;">...</div>
    </div>
    <div class="toolbar-section">
      <!-- Shared buttons (theme, settings, info) -->
    </div>
  </div>

  <!-- ROW 2: FILTER BAR (one shown at a time, grid row stays auto) -->
  <div id="filter-bar" class="view-filter">...</div>
  <div id="dl-filter-bar" class="view-filter" style="display:none;">...</div>

  <!-- ROW 3: CONTENT (existing #main stays; datalayer-view added as sibling, hidden by default) -->
  <div id="main">
    <!-- existing list-pane, splitter, detail-pane — unchanged -->
  </div>
  <div id="datalayer-view" style="display:none; overflow:hidden;">
    <div id="dl-main">
      <div id="dl-list-pane">
        <div id="dl-push-list">
          <div id="dl-empty-state">
            <!-- Empty state for DataLayer -->
          </div>
        </div>
      </div>
      <div id="dl-splitter">...</div>
      <div id="dl-detail-pane" class="hidden">
        <!-- DataLayer detail content -->
      </div>
    </div>
  </div>

  <!-- ROW 4: STATUS BAR (contextual) -->
  <div id="status-bar">...</div>
</body>

<!-- CSS addition needed: -->
<style>
  /* Both #main and #datalayer-view occupy the same grid row 3 */
  #main, #datalayer-view {
    grid-row: 3;
    grid-column: 1;
    overflow: hidden;
  }
</style>
```

### 8.3 DataLayer Toolbar

```html
<div id="datalayer-toolbar" class="view-toolbar">
  <button id="dl-btn-clear" title="Clear all DataLayer pushes">🗑</button>
  <div class="toolbar-separator"></div>
  <input type="checkbox" id="dl-chk-pause">
  <label for="dl-chk-pause">Pause</label>
  <div class="toolbar-separator"></div>
  <div class="filter-wrap">
    <svg><!-- search icon --></svg>
    <input type="text" id="dl-filter-input" placeholder="Filter by event, key, or value...">
    <button id="dl-btn-clear-filter">×</button>
  </div>
  <div class="toolbar-separator"></div>
  <!-- Source filter dropdown -->
  <div id="dl-source-filter">
    <button id="btn-dl-source" class="quick-btn" title="Filter by source">
      <svg><!-- filter icon --></svg>
    </button>
    <!-- Source popover (similar to provider-popover) -->
    <div id="dl-source-popover">
      <!-- Source pills: GTM, Tealium, Adobe, Segment, Custom -->
    </div>
  </div>
  <div class="toolbar-separator"></div>
  <button id="dl-btn-export" title="Export DataLayer">
    <svg><!-- download icon --></svg>
    <span>Export</span>
  </button>
</div>
```

### 8.4 DataLayer Push List

Each row in the push list shows:

```
┌─────────────────────────────────────────────────┐
│ #42  🟢 GTM    purchase    5 keys    12:34:56   │
│      ecommerce.purchase · transaction_id: T1234 │
├─────────────────────────────────────────────────┤
│ #43  🟡 Custom  page_view   3 keys    12:34:57  │
│      page_type: home · page_title: Homepage     │
├─────────────────────────────────────────────────┤
│ #44  🔵 Adobe  view_item   8 keys    12:34:58  │
│      ⚠ Missing required field: item_id         │
└─────────────────────────────────────────────────┘
```

**Row elements:**
- Push index number (monospace)
- Source badge (colored dot + label, similar to provider badge)
- Event name (bold, if present)
- Key count
- Timestamp
- Preview line: first 2-3 meaningful key-value pairs
- Warning icon if health check fails

**Row CSS class:** `.dl-push-row` (parallels `.req-row`)

**Color coding for sources:**
| Source | Color | Badge |
|--------|-------|-------|
| GTM | #E8710A (orange) | GTM |
| Tealium | #2C7A7B (teal) | TEAL |
| Adobe | #E53E3E (red) | ADOBE |
| Segment | #3182CE (blue) | SEG |
| Digital Data | #38A169 (green) | W3C |
| Custom | #718096 (gray) | CUSTOM |

### 8.5 DataLayer Detail Pane

When a push is selected, the detail pane shows:

```
┌─────────────────────────────────────────────────────┐
│  🟢 GTM · #42 · purchase           12:34:56  [×]  │
├─────────────────────────────────────────────────────┤
│  [Push Data] [Diff] [Current State] [Correlation]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▸ Event                                            │
│    event: "purchase"                                │
│    event_id: "abc123"                               │
│                                                     │
│  ▸ E-Commerce (detected)                           │
│    transaction_id: "T1234"                          │
│    value: 149.99                                    │
│    currency: "USD"                                  │
│    ┌──────────────────────────────────────────┐     │
│    │ Products (2):                            │     │
│    │ 1. SKU-001 · Widget · 2× · 49.99 USD    │     │
│    │ 2. SKU-002 · Gadget · 1× · 50.01 USD    │     │
│    └──────────────────────────────────────────┘     │
│                                                     │
│  ▸ User                                             │
│    user_id: "U12345"                                │
│    user_email: "***" (redacted)                     │
│                                                     │
│  ▸ Page                                             │
│    page_title: "Checkout Complete"                  │
│    page_location: "https://..."                     │
│                                                     │
│  ▸ Other (3 keys)                                   │
│    gtm.uniqueEventId: 42                            │
│    ...                                              │
└─────────────────────────────────────────────────────┘
```

### 8.6 Detail Pane Sub-Tabs

Four tabs in the DataLayer detail pane:

1. **Push Data** — The raw pushed data, organized into collapsible categories (Event, E-Commerce, User, Page, Other)
2. **Diff** — Visual diff from previous push (added = green, removed = red, changed = yellow)
3. **Current State** — Full cumulative dataLayer state AFTER this push (read-only snapshot)
4. **Correlation** — Network requests that fired within ±2 seconds of this push

---

## 9. FEATURE DETAILS

### 9.1 Diff Highlighting

**Algorithm:**
```
For each push N:
  previousState = cumulative state after push N-1 (or {} if N=0)
  currentState = cumulative state after push N
  
  diff = deepDiff(previousState, currentState)
  
  For each leaf key:
    if key not in previousState → type: 'added' (green)
    if key not in currentState → type: 'removed' (red)
    if value changed → type: 'changed' (yellow, show old → new)
```

**Deep diff implementation notes:**
- Handle nested objects with dot-notation paths
- For arrays: diff by index, show added/removed items
- For e-commerce product arrays: diff by item_id if present, otherwise by index
- Limit diff display to first 50 changes (with "show all" toggle)

**Visual rendering:**
```html
<div class="diff-entry diff-added">
  <span class="diff-key">ecommerce.purchase.actionField.revenue</span>
  <span class="diff-value">"149.99"</span>
  <span class="diff-badge">+ NEW</span>
</div>
<div class="diff-entry diff-changed">
  <span class="diff-key">page_title</span>
  <span class="diff-old">"Home"</span>
  <span class="diff-arrow">→</span>
  <span class="diff-new">"Checkout"</span>
</div>
```

### 9.2 E-Commerce Data Formatting

**Detection patterns (GA4 + UA + custom):**

```typescript
const ECOMMERCE_PATTERNS = {
  purchase: {
    ga4: (d: any) => d.event === 'purchase' && d.ecommerce,
    ua: (d: any) => d.ecommerce?.purchaseActionField?.action === 'purchase',
  },
  checkout: {
    ga4: (d: any) => d.event?.startsWith('begin_checkout') || d.event?.startsWith('add_shipping'),
    ua: (d: any) => d.ecommerce?.checkout?.actionField?.step != null,
  },
  impression: {
    ga4: (d: any) => d.event === 'view_item_list' && d.ecommerce?.items,
    ua: (d: any) => d.ecommerce?.impressions,
  },
  promo: {
    ga4: (d: any) => d.event === 'select_promotion',
    ua: (d: any) => d.ecommerce?.promoView || d.ecommerce?.promoClick,
  },
};
```

**Product table rendering:**
```html
<div class="ecommerce-products">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>ID/SKU</th>
        <th>Name</th>
        <th>Category</th>
        <th>Variant</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td class="mono">SKU-001</td>
        <td>Widget Pro</td>
        <td>Electronics</td>
        <td>Blue</td>
        <td>2</td>
        <td class="mono">49.99 USD</td>  <!-- currency taken from ecommerce.currency field -->
      </tr>
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6">Total</td>
        <td class="mono">149.99 USD</td>  <!-- currency taken from ecommerce.currency field -->
      </tr>
    </tfoot>
  </table>
</div>
```

### 9.3 Network ↔ DataLayer Correlation

**Approach:** Time-window correlation

```typescript
interface CorrelatedRequest {
  request: ParsedRequest;
  delayMs: number;  // Time between push timestamp and request timestamp
}

function findCorrelatedRequests(
  push: DataLayerPush,
  requests: ParsedRequest[],
  windowMs: number = 2000  // ±2 seconds
): CorrelatedRequest[] {
  const pushTime = new Date(push.timestamp).getTime();
  return requests
    .filter(r => {
      const reqTime = new Date(r.timestamp).getTime();
      const diff = reqTime - pushTime;
      return diff >= -500 && diff <= windowMs; // Push can trigger request 0-2s later
      // Allow -500ms for requests that were already in flight
    })
    .map(r => ({
      request: r,
      delayMs: new Date(r.timestamp).getTime() - pushTime,
    }))
    .sort((a, b) => a.delayMs - b.delayMs);
}
```

**UI rendering in Correlation tab:**
```html
<div class="correlation-list">
  <div class="correlation-header">
    Network requests within 2s of this push
  </div>
  <div class="correlation-item" data-request-id="12345">
    <span class="correlation-delay">+12ms</span>
    <span class="correlation-badge" style="background: #E8710A22; color: #E8710A;">GA4</span>
    <span class="correlation-event">page_view</span>
    <span class="correlation-url">google-analytics.com/g/collect?...</span>
    <button class="correlation-goto" title="View in Network tab">→</button>
  </div>
</div>
```

**"Go to Network" button behavior:**
- When clicked, switch to Network tab
- Find and select the correlated request
- Highlight it briefly with an animation

### 9.4 Search & Filter

**DataLayer-specific filters:**

| Filter | Type | Description |
|--------|------|-------------|
| Text search | Input | Searches event name, keys, values (same as network) |
| Source | Multi-select pills | Filter by GTM/Tealium/Adobe/Segment/Custom |
| Event name | Dropdown (dynamic) | Filter by specific event name (auto-populated from captured pushes) |
| Has key | Input | Filter pushes that contain a specific key |
| E-commerce | Toggle | Show only pushes with e-commerce data |

**Implementation:** Reuse the existing filter architecture pattern from `src/panel/utils/filter.ts` and `src/panel/components/filter-bar.ts`, adapted for DataLayer types.

### 9.5 Export

**Export formats:**

1. **JSON** — Full push history with all data
   ```json
   {
     "exportedAt": "2025-01-15T12:00:00Z",
     "pageUrl": "https://example.com",
     "sources": ["gtm", "tealium"],
     "pushes": [
       {
         "id": 42,
         "source": "gtm",
         "pushIndex": 42,
         "timestamp": "2025-01-15T12:34:56Z",
         "data": { "event": "purchase", ... }
       }
     ]
   }
   ```

2. **CSV** — Flattened push data (one row per push, columns for common keys)
   ```csv
   id,timestamp,source,event,transaction_id,value,currency,...
   42,2025-01-15T12:34:56Z,gtm,purchase,T1234,149.99,USD,...
   ```

3. **Copy single push** — Copy selected push data as JSON to clipboard

---

## 10. STATE MANAGEMENT

### 10.1 DataLayer State (`src/panel/datalayer/state.ts`)

Parallels the existing `src/panel/state.ts` pattern:

```typescript
// State containers
const dlState: DataLayerState = {
  all: [],
  map: new Map(),
  filteredIds: new Set(),
  selectedId: null,
  isPaused: false,
  sources: new Set(),
  sourceLabels: new Map(),
  searchIndex: new Map(),
};

// Batching (reuse existing pattern)
let dlPending: DataLayerPush[] = [];
let dlRafId: number | null = null;
```

### 10.2 Integration with existing state

The existing `src/panel/state.ts` remains UNCHANGED for network requests. DataLayer state lives in a separate module. The tab switcher in `panel/index.ts` determines which state and UI is active.

**Shared concerns:**
- `AppConfig` — shared (sort order, timestamp format, export format apply to both views)
- Pause state — independent per view (can pause network but not datalayer, or vice versa)
- Theme — shared (already global via CSS custom properties)

---

## 11. PANEL INTEGRATION (`src/panel/index.ts`)

### 11.1 New global functions

```typescript
declare global {
  interface Window {
    receiveRequest: (data: ParsedRequest) => void;          // existing
    receiveDataLayerPush: (data: DataLayerPush) => void;    // NEW
    receiveDataLayerSources: (sources: DataLayerSource[], labels: Record<DataLayerSource, string>) => void; // NEW
  }
}
```

### 11.2 Tab switching logic

```typescript
let activeView: 'network' | 'datalayer' = 'network';

function switchView(view: 'network' | 'datalayer'): void {
  activeView = view;
  
  // Toggle toolbar sections
  document.getElementById('network-toolbar')!.style.display = view === 'network' ? '' : 'none';
  document.getElementById('datalayer-toolbar')!.style.display = view === 'datalayer' ? '' : 'none';
  
  // Toggle filter bars
  DOM.filterBar.classList.toggle('visible', view === 'network' && hasActiveFilters());
  document.getElementById('dl-filter-bar')?.classList.toggle('visible', view === 'datalayer' && dlHasActiveFilters());
  
  // Toggle main views
  document.getElementById('network-view')!.style.display = view === 'network' ? '' : 'none';
  document.getElementById('datalayer-view')!.style.display = view === 'datalayer' ? '' : 'none';
  
  // Update tab buttons
  document.querySelectorAll('#tab-switcher .tab-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.view === view);
  });
  
  // Update status bar
  if (view === 'network') {
    updateStatusBar(stats.visibleCount, stats.totalSize, stats.totalDuration);
  } else {
    updateDataLayerStatusBar();
  }
}
```

### 11.3 DataLayer push receiver

```typescript
window.receiveDataLayerPush = function(push: DataLayerPush): void {
  if (dlState.isPaused) return;
  
  // Index and store
  indexDataLayerPush(push);
  dlState.all.push(push);
  dlState.map.set(push.id, push);          // id is number — no String() conversion needed

  // Prune if needed
  dlPruneIfNeeded();

  // Filter
  const isVisible = dlMatchesFilter(push);
  if (isVisible) dlState.filteredIds.add(push.id);
  
  // Queue for batched rendering
  dlPending.push({ data: push, isVisible });
  if (!dlRafId) {
    dlRafId = requestAnimationFrame(dlFlushPending);
  }
};
```

---

## 12. IMPLEMENTATION PHASES

### Phase 1: Infrastructure (Day 1-2)
- [ ] Create `src/types/datalayer.ts` — DataLayerPush, DiffEntry, DataLayerState types
- [ ] Create `src/content/data-layer-main.ts` — GTM interception only (simplest source)
- [ ] Create `src/content/data-layer-bridge.ts` — postMessage relay (no tabId in messages)
- [ ] Update `manifest.json` — add `"scripting"` permission, `content_scripts`, `web_accessible_resources`
- [ ] Update `rollup.config.js` — two new build targets
- [ ] Update `src/background/index.ts` — `devToolsPorts` map + `onConnect` listener + DATALAYER_* handlers (read tabId from `sender.tab.id`)
- [ ] Update `src/devtools/index.ts` — retain port reference, attach `onMessage` listener
- [ ] Create `src/devtools/data-layer-relay.ts` — injection orchestration + panel bridge helpers
- [ ] Extend `src/devtools/panel-bridge.ts` — `PanelWindow` interface + DataLayer send functions

### Phase 2: UI Shell (Day 2-3)
- [ ] Add tab switcher to `panel.html` toolbar
- [ ] Restructure `panel.html` — add `#datalayer-view` as sibling to `#main`, update CSS grid for filter bar row
- [ ] Add DataLayer toolbar HTML + CSS
- [ ] Implement tab switching logic in `panel/index.ts`
- [ ] Create `src/panel/datalayer/types.ts`
- [ ] Create `src/panel/datalayer/state.ts`
- [ ] Add DataLayer DOM refs to `src/panel/utils/dom.ts`

### Phase 3: Push List (Day 3-4)
- [ ] Create `src/panel/datalayer/push-list.ts` — row rendering, visibility, navigation
- [ ] Create empty state for DataLayer
- [ ] Implement DataLayer-specific search/filter
- [ ] Implement batched rendering for DataLayer pushes
- [ ] Add DataLayer status bar updates

### Phase 4: Detail Pane (Day 4-5)
- [ ] Create `src/panel/datalayer/push-detail.ts` — tab switching, content rendering
- [ ] Implement "Push Data" tab — categorized key-value display
- [ ] Create `src/panel/datalayer/ecommerce-formatter.ts` — product table rendering
- [ ] Implement copy-to-clipboard for DataLayer values

### Phase 5: Diff & Current State (Day 5-6)
- [ ] Create `src/panel/datalayer/diff-renderer.ts` — deep diff algorithm + visual rendering
- [ ] Create `src/panel/datalayer/current-state.ts` — cumulative state snapshot view
- [ ] Implement "Diff" tab in detail pane
- [ ] Implement "Current State" tab in detail pane

### Phase 6: Correlation (Day 6-7)
- [ ] Create `src/panel/datalayer/correlation.ts` — time-window correlation engine
- [ ] Implement "Correlation" tab in detail pane
- [ ] Implement "Go to Network" cross-tab navigation
- [ ] Visual highlight animation for correlated requests

### Phase 7: Multi-Source Support (Day 7-8)
- [ ] Add Tealium interception to `data-layer-main.ts`
- [ ] Add Adobe interception to `data-layer-main.ts`
- [ ] Add Segment interception to `data-layer-main.ts`
- [ ] Add W3C Digital Data support
- [ ] Add custom source scanning
- [ ] Create `src/panel/datalayer/source-detector.ts`
- [ ] Source filter UI in toolbar

### Phase 8: Export & Polish (Day 8-9)
- [ ] Implement JSON export
- [ ] Implement CSV export
- [ ] Implement copy single push
- [ ] DataLayer health check warnings
- [ ] Keyboard shortcuts for DataLayer tab
- [ ] Source label display (GTM-GTMXXXXX)

### Phase 9: Testing & Edge Cases (Day 9-10)
- [ ] Test with pages that don't have dataLayer
- [ ] Test with multiple GTM containers
- [ ] Test with very large dataLayer (>1000 pushes)
- [ ] Test with deeply nested e-commerce data
- [ ] Test with Adobe Launch data layer
- [ ] Test CSP-restricted pages
- [ ] Test cross-origin iframes
- [ ] Performance profiling with rapid pushes

---

## 13. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSP blocks inline script injection | Content script won't load in MAIN world | Fallback to `eval()` via `chrome.scripting.executeScript` with `world: 'MAIN'` |
| page `dataLayer` not yet initialized when script runs | Miss initial pushes | Retry detection with `setTimeout` + `MutationObserver` on `<script>` tags |
| Multiple GTM containers overwrite `dataLayer.push` | Second container's push not captured | Use `Object.defineProperty` with a wrapper that calls all registered interceptors |
| Large dataLayer (10k+ items) causes memory issues | Panel becomes slow | Implement virtual scrolling for push list, limit stored pushes (configurable) |
| `window.postMessage` data size limits | Large push data may be truncated | Chunk large messages or use `chrome.runtime.sendMessage` directly from MAIN world via `chrome.scripting` |
| Race condition: push before interceptor installed | Miss early pushes | Replay all existing dataLayer items on script inject |
| Extension updates break content scripts | MAIN world script outdated | Version handshake between MAIN and ISOLATED scripts |

---

## 14. FUTURE CONSIDERATIONS (Post-MVP)

- **DataLayer validation rules** — User-configurable schema validation (e.g., "every purchase must have transaction_id")
- **DataLayer comparison** — Compare dataLayer between two page loads or environments
- **DataLayer debugger** — Inject custom pushes for testing
- **DataLayer recording** — Record and replay push sequences
- **Integration with GTM preview mode** — Show which GTM tags fired for each push
- **DataLayer merge visualization** — Show how GTM merges data across pushes
