# DataLayer Source Guide — Implementation Specification

## 1. Overview

**Goal:** Help TagDragon users understand what GTM, Tealium, Adobe, Segment, and W3C digitalData are, how to read their data, and how to practically use the DataLayer tab.

**Problem:** The current "📡 DataLayer sources" section in the Info popover shows only technical snippets like *"Intercepts .push() calls and replays existing array items"* — meaningless to anyone who isn't already a tag management specialist.

**Approach:** Lightweight combination of two changes:

1. **Approach A — Enriched Info Popover:** Expand `DATA_LAYER_SOURCES` data and the `renderDataLayerSources()` renderer to show user-friendly descriptions, typical events, data structure hints, and practical tips.
2. **Approach B — Source Badge Tooltips:** Add `data-tooltip` attributes to source badges (`.dl-push-badge`) in the push list rows, so users get instant context without opening the popover.

---

## 2. Data Model Changes

### 2.1 Expand `DATA_LAYER_SOURCES` in `src/shared/datalayer-constants.ts`

Add three new fields to each source entry:

| Field | Type | Purpose |
|-------|------|---------|
| `whatIs` | `string` | 1-2 sentence plain-English explanation of what this platform is |
| `howToRead` | `string` | Concise guide on how to interpret data from this source |
| `typicalEvents` | `string[]` | Common event names/patterns users will see |

**Updated type:**
```typescript
export const DATA_LAYER_SOURCES: ReadonlyArray<{
  id: DataLayerSource;
  label: string;
  globalVar: string;
  description: string;     // keep for backward compat (or remove)
  whatIs: string;          // NEW — what is this platform?
  howToRead: string;       // NEW — how to read its data
  typicalEvents: string[]; // NEW — common event names
}> = [ ... ];
```

### 2.2 Source Content

Each source gets carefully written content aimed at **marketing/analytics practitioners** who may not be tag management experts.

---

#### GTM (Google Tag Manager)

```
whatIs:
"Google's tag management platform. Lets marketers deploy and manage tracking
pixels, analytics code, and conversion tags without modifying the website source
code. Used by the majority of e-commerce and content sites worldwide."

howToRead:
"Each push to window.dataLayer represents an event or data update. Look for the
'event' key to identify what happened (page_view, purchase, etc.). E-commerce
data lives under the 'ecommerce' key. GTM variables reference dataLayer keys
to send data to Google Analytics, Google Ads, and other platforms."

typicalEvents:
["gtm.js", "gtm.dom", "gtm.load", "page_view", "purchase", "add_to_cart",
 "begin_checkout", "view_item", "generate_lead", "sign_up", "login"]
```

---

#### Tealium

```
whatIs:
"Enterprise tag management and customer data platform. Manages marketing tags
across websites and mobile apps. Often used by large enterprises as an
alternative to GTM due to its vendor-agnostic approach."

howToRead:
"utag.view() fires on page loads (like page_view). utag.link() fires on user
interactions (clicks, form submissions). The initial utag.data object contains
the page context — URL, content category, user ID, and other UDO (Universal
Data Object) properties."

typicalEvents:
["utag.view", "utag.link"]
```

---

#### Adobe (Adobe Experience Platform / Launch)

```
whatIs:
"Adobe's tag management and data collection platform. Part of Adobe Experience
Cloud — integrates with Adobe Analytics, Adobe Target, and Audience Manager.
Used by enterprise organizations invested in the Adobe marketing stack."

howToRead:
"adobeDataLayer pushes follow a schema with '@type' and 'eventInfo' keys.
The _satellite.track() calls represent direct tracking events fired by Adobe
Launch rules. Data is structured around the Adobe Client Data Layer (ACDL)
standard with event, component, and commerce schemas."

typicalEvents:
["_satellite.track()", "page-view", "user-info", "commerce:product-view",
 "commerce:purchase", "commerce:checkout", "cmp:show", "cmp:click"]
```

---

#### Segment

```
whatIs:
"Customer data platform that collects data from multiple sources and routes it
to analytics, marketing, and data warehouse tools. Acts as a single API for
tracking — you send data once, Segment delivers it everywhere."

howToRead:
"Each call wraps into {_method, name, properties}: 'track' for events
(e.g. 'Order Completed'), 'page' for page views, 'identify' for user traits,
and 'group' for account/company data. The 'properties' object contains the
event-specific data."

typicalEvents:
["Order Completed", "Product Viewed", "Cart Viewed", "Checkout Started",
 "Page View", "Identify", "Signed Up", "Login"]
```

---

#### W3C digitalData

```
whatIs:
"A W3C community standard for representing customer experience data on web
pages. Unlike push-based systems, digitalData is a static data object that
describes the current page state — page info, user, products, cart, etc."

howToRead:
"Each push represents a snapshot of the entire digitalData object at that
moment. Key sections: digitalData.page (current page info),
digitalData.user (visitor data), digitalData.product[] (products on page),
digitalData.cart (shopping cart), digitalData.transaction (order data).
Changes between snapshots show what the SPA updated."

typicalEvents:
["page.changed", "user.changed", "cart.updated", "transaction.completed"]
```

---

### 2.3 Tooltip Texts (Approach B)

Add a `SOURCE_TOOLTIPS` map for use on `.dl-push-badge` elements. These are deliberately short (1 line) since tooltips have limited space:

```typescript
export const SOURCE_TOOLTIPS: Record<DataLayerSource, string> = {
  gtm: 'Google Tag Manager — events via window.dataLayer.push()',
  tealium: 'Tealium iQ — events via utag.view() / utag.link()',
  adobe: 'Adobe Launch — events via adobeDataLayer / _satellite.track()',
  segment: 'Segment CDP — events via analytics.track() / page()',
  digitalData: 'W3C Customer Data Layer — page state snapshots',
  custom: 'Custom data layer source',
};
```

---

## 3. UI Changes

### 3.1 Info Popover — `src/panel/components/info-popover.ts`

**Function:** `renderDataLayerSources()`

Current rendering produces:
```
[GTM]  window.dataLayer
Intercepts .push() calls and replays existing array items
```

**New rendering:**
```
[GTM]  window.dataLayer
Google's tag management platform. Lets marketers deploy tracking pixels and
analytics code without modifying website source code.

▸ How to read: Look for the 'event' key. E-commerce data is under 'ecommerce'.
▸ Common: gtm.js · page_view · purchase · add_to_cart · begin_checkout
```

**Implementation:**
- Replace `description` with `whatIs` as the main text
- Add a "▸ How to read:" line with `howToRead` text
- Add a "▸ Common:" line with `typicalEvents` joined by ` · ` separator
- Keep the `globalVar` code element as-is

### 3.2 Info Popover — CSS in `public/panel.html`

Add styles for the new sub-sections:

```css
/* Enhanced source card */
.info-dl-source {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.info-dl-source:last-child {
  border-bottom: none;
}

/* "How to read" sub-line */
.info-dl-source-howto {
  font-size: 12px;
  color: var(--text-2);
  padding-left: 68px;
  margin-top: 2px;
  line-height: 1.4;
}
.info-dl-source-howto strong {
  color: var(--text-1);
  font-weight: 600;
}

/* "Common events" tags */
.info-dl-source-events {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 68px;
  margin-top: 4px;
}
.info-dl-source-events-label {
  font-size: 11px;
  color: var(--text-2);
  align-self: center;
}
.info-dl-source-event-tag {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-2);
  background: var(--bg-2);
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--border);
}
```

### 3.3 Push List Badge Tooltips — `src/panel/datalayer/components/push-list.ts`

In `createDlPushRow()`, add `data-tooltip` to the badge element:

```typescript
import { SOURCE_TOOLTIPS } from '@/shared/datalayer-constants';

// In createDlPushRow(), after creating badgeEl:
const badgeEl = row.querySelector<HTMLElement>('.dl-push-badge');
if (badgeEl) {
  badgeEl.textContent = badge;
  badgeEl.style.background = color + '22';
  badgeEl.style.color = color;
  badgeEl.style.border = `1px solid ${color}55`;
  badgeEl.dataset.tooltip = SOURCE_TOOLTIPS[push.source] ?? '';
}
```

No changes to the tooltip system (`src/panel/utils/tooltip.ts`) — it already reads `data-tooltip` via event delegation and will pick up the new attributes automatically.

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `src/shared/datalayer-constants.ts` | Add `whatIs`, `howToRead`, `typicalEvents` to `DATA_LAYER_SOURCES`. Add `SOURCE_TOOLTIPS` export. |
| `src/panel/components/info-popover.ts` | Update `renderDataLayerSources()` to render the new fields. |
| `src/panel/datalayer/components/push-list.ts` | Add `data-tooltip` to `.dl-push-badge` in `createDlPushRow()`. Import `SOURCE_TOOLTIPS`. |
| `public/panel.html` | Add CSS for `.info-dl-source-howto` and `.info-dl-source-events` |

**No changes to:**
- `src/panel/utils/tooltip.ts` — already handles `data-tooltip` via delegation
- `src/types/datalayer.ts` — no type changes needed
- `src/content/data-layer-main.ts` — interception logic unchanged

---

## 5. Implementation Order

1. **Data layer** — Update `datalayer-constants.ts` with all new content and `SOURCE_TOOLTIPS`
2. **CSS** — Add new styles to `panel.html`
3. **Popover renderer** — Update `renderDataLayerSources()` in `info-popover.ts`
4. **Badge tooltips** — Add `data-tooltip` in `push-list.ts`
5. **Test** — Open panel, check Info popover → DataLayer sources section, verify tooltips on badges

---

## 6. Content Principles

- **English only** — all UI strings stay en-US
- **Concise but complete** — aim for 2 sentences max per section
- **Action-oriented** — tell users what to *look for*, not just what something *is*
- **No jargon without explanation** — "UDO" is not explained, "GTM variables reference dataLayer keys" is actionable
- **No marketing fluff** — "industry-leading platform" etc. has no place here
- **Accurate** — descriptions must match actual behavior of the interception code in `data-layer-main.ts`

---

## 7. Future Enhancements (Out of Scope)

These are **not** part of this spec but worth noting for later:

- **Empty state guide:** When no DataLayer source is detected, show cards explaining each source and how to enable it (currently shows nothing)
- **External docs page:** A dedicated tagdragon.net/docs/datalayer page with screenshots, detailed examples, and video walkthroughs
- **Source comparison table:** Side-by-side comparison of GTM vs Tealium vs Adobe vs Segment for users choosing a platform
- **Interactive examples:** Clickable example pushes in the Info popover that populate the DataLayer tab with sample data for learning
- **DataLayer health check:** Automated validation that checks if common issues are present (e.g. missing event names, duplicate ecommerce data)
