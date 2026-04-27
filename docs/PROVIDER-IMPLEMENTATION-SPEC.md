# TagDragon v1.7 — Provider Data Quality Implementation Spec

> Kompletní implementační specifikace pro vylepšení sběru dat u všech providerů.
> Vychází z hloubkového auditu všech 69 providerů.

---

## GLOBÁLNÍ PRAVIDLA

### G1: `URL: url` — Zakázáno

Žádný provider nesmí vracet `URL: url` (surová celá URL). Pravidlo:
- Pokud hodnota představuje **page URL** (např. `p.url`, `dl`, `mboxURL`), zobrazit jako `Page URL`
- Pokud hodnota představuje **API endpoint URL** — odstranit úplně
- Pokud hodnota představuje **page URL z JSON body** (např. `$current_url`, `context.page.url`) — zobrazit jako `Page URL`

**Postihovaní (13):**
`Segment`, `Tealium`, `Amplitude`, `Mixpanel` (přesunout `currentUrl` → `Page URL`), `Criteo`, `The Trade Desk`, `LinkedIn`, `Seznam Sklik`, `Adobe DTM`, `Adobe Launch (CN)`, `Piwik PRO TM`, `Adform`, `Scorecard` (není page URL — je to `rn` random number)

### G2: Cache Busters — Odstranit

Parametry sloužící výhradně jako cache busting se nezobrazují:
- `ord` (Adform)
- `rn` (Scorecard — pozor, tohle NENÍ page URL, je to random number)
- `ns__t` (Comscore timestamp/random)

### G3: Device Info — Sbalit

Následující params přesunout do collapsed kategorie (nebo rovnou odstranit, pokud provider nemá kategorizaci):
- Screen Resolution, Color Depth, Language — **odstranit** pokud nemají kategorii
- Pokud mají kategorii → `defaultExpanded: false` (už je to tak u GA4, Bing Ads, Adobe AA ✓)

### G4: Pass-through Pattern

Pro provideré s dynamickým množstvím params zavést jednotný vzor:
1. Explicitní labels pro známé klíče (whitelist)
2. Pass-through všech ostatních klíčů do "Other" / "Custom Data" sekce
3. Nikdy nezahazovat data, která mohou mít hodnotu

### G5: JSON Body Parsing — Standardizovat

Zavést sdílený helper `parsePostBodyJson()` pro konzistentní parsing:
```typescript
// src/providers/parse-helpers.ts
export function parsePostBodyJson(postRaw: unknown): Record<string, unknown> {
  if (!postRaw) return {};
  if (typeof postRaw === 'object' && !('text' in postRaw) && !('raw' in postRaw)) {
    return postRaw as Record<string, unknown>;
  }
  try {
    const har = postRaw as HARPostBody;
    const text = har?.text ?? (har?.raw?.[0]?.bytes ? atob(har.raw[0].bytes) : '');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
```

### G6: Flatten strategie pro CDP/Analytics

Pro vnořené JSON objekty (properties, traits, event_properties):
- **Top-level keys**: flatten do `Klíč: hodnota`
- **Vnořené objekty**: zachovat jako pretty-printed JSON string
- **Pole**: zachovat jako pretty-printed JSON array
- **Prefixy**: zachovat rozlišení event vs user properties
  - Amplitude: `ep.*` prefix pro event_properties, `up.*` pro user_properties
  - Segment: `properties.*` bez prefixu, `traits.*` s `(trait)` suffixem
  - Mixpanel: bez prefixu (všechno je v `properties.*`)

### G7: Hashed PII — Zobrazit jako-is

Hashed hodnoty (`em`, `ph`, `fn`, `ln`, `user_email_sha256` atd.) zobrazit v plném znění.
Pro debugging implementace je to kritické — uživatel potřebuje vidět, jestli se hash posílá.

---

## SMAZAT

### DEL-1: GA (UA) — Smazat provider

| Soubor | Akce |
|--------|------|
| `src/providers/google/ga-ua.ts` | Smazat soubor |
| `src/providers/index.ts` | Odstranit import a položku z `PROVIDERS` pole |
| `src/shared/categories.ts` | Odstranit `'GA (UA)'` kategorii |
| `src/shared/provider-groups.ts` | Odstranit z příslušné skupiny |

---

## FÁZE 1: QUICK WINS — Odstranění šumu (1 den)

### QW-1: Hromadné odstranění `URL: url`

| # | Soubor | Aktuální | Změna |
|---|--------|----------|-------|
| 1 | `src/providers/segment.ts` | `URL: url` | Odstranit |
| 2 | `src/providers/tealium.ts` | `URL: url` | Odstranit |
| 3 | `src/providers/amplitude.ts` | `URL: url` | Odstranit |
| 4 | `src/providers/mixpanel.ts` | `URL: currentUrl ?? url` | Změnit na `Page URL: $current_url` (pouze pokud existuje), odstranit fallback na `url` |
| 5 | `src/providers/criteo.ts` | `URL: url` | Odstranit |
| 6 | `src/providers/thetradedesk.ts` | `URL: url` | Odstranit |
| 7 | `src/providers/linkedin.ts` | `URL: url` | Odstranit |
| 8 | `src/providers/seznam-sklik.ts` | `URL: url` | Odstranit |
| 9 | `src/providers/adobe/dtm.ts` | `URL: url` | Odstranit |
| 10 | `src/providers/adobe/launch-china.ts` | `URL: url` | Odstranit |
| 11 | `src/providers/piwik-pro-tm.ts` | `URL: url` | Odstranit |
| 12 | `src/providers/adform.ts` | `URL: url` | Odstranit |

### QW-2: Odstranění cache busters a device šumu

| # | Soubor | Co odstranit |
|---|--------|-------------|
| 1 | `src/providers/adform.ts` | `Cache Buster: p.ord` |
| 2 | `src/providers/adform.ts` | `Language`, `Resolution`, `Color Depth` (z `Set1` parsování) |
| 3 | `src/providers/scorecard.ts` | `URL: p['rn']` — je to random number, ne page URL |

### QW-3: Přejmenování `URL` → `Page URL`

Tam, kde `URL` představuje page URL (ale chybí prefix "Page"):

| # | Soubor | Aktuální | Změna |
|---|--------|----------|-------|
| 1 | `src/providers/matomo.ts` | `URL: p['url']` | `Page URL: p['url']` |
| 2 | `src/providers/piwik-pro.ts` | `URL: p.url` | `Page URL: p.url` |
| 3 | `src/providers/parsely.ts` | `URL: p.url` | `Page URL: p.url` |

### QW-4: Piwik PRO TM — Extrahovat data z URL path

**Soubor:** `src/providers/piwik-pro-tm.ts`

Aktuální:
```typescript
parseParams(url: string): Record<string, string | undefined> {
  return { URL: url };
}
```

Nový:
```typescript
parseParams(url: string): Record<string, string | undefined> {
  const match = url.match(/([a-z0-9-]+)\.piwik\.pro\/([a-f0-9-]+)\/([a-f0-9]+)\.js/);
  return {
    'Account ID': match?.[2],
    'Container ID': match?.[3],
    'Request Type': 'Library Load',
  };
}
```

### QW-5: Meta Pixel — Odstranit interní params

**Soubor:** `src/providers/meta/pixel.ts`

Odstranit z return objektu:
- `Ordinal: p.o`
- `'Last Event Result': p.ler`
- `Release: p.r`
- `'In iFrame': p.if`
- `'Click-Only': p.coo`

### QW-6: X (Twitter) Pixel — Odstranit šum

**Soubor:** `src/providers/twitter-pixel.ts`

Odstranit z return objektu:
- `Version: p['version']`
- `Type: p['type']`

---

## FÁZE 2: KRITICKÉ REWRITES (3–5 dní)

### CR-1: Segment — Kompletní rewrite

**Soubor:** `src/providers/segment.ts`

**Přístup:** Parsovat JSON POST body pro všechny typy volání.

```typescript
parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
  const body = parsePostBodyJson(postRaw);
  const str = (v: unknown) => v != null ? String(v) : undefined;

  const result: Record<string, string | undefined> = {
    // Core
    Type: str(body.type),                    // track | page | identify | group | alias
    Event: str(body.event),                  // Jen pro track
    'User ID': str(body.userId),
    'Anonymous ID': str(body.anonymousId),
    'Message ID': str(body.messageId),
    Timestamp: str(body.timestamp),
    'Write Key': maskKey(extractWriteKey(url)),
  };

  // Context
  const ctx = (body.context as Record<string, unknown>) ?? {};
  const page = (ctx.page as Record<string, unknown>) ?? {};
  const campaign = (ctx.campaign as Record<string, unknown>) ?? {};

  if (page.url) result['Page URL'] = str(page.url);
  if (page.title) result['Page Title'] = str(page.title);
  if (page.referrer) result['Referrer'] = str(page.referrer);
  if (campaign.source) result['Campaign Source'] = str(campaign.source);
  if (campaign.medium) result['Campaign Medium'] = str(campaign.medium);
  if (campaign.name) result['Campaign Name'] = str(campaign.name);
  if (ctx.userAgent) result['User Agent'] = str(ctx.userAgent);
  if (ctx.ip) result['IP'] = str(ctx.ip);

  // Integrations
  if (body.integrations && typeof body.integrations === 'object') {
    const integs = Object.entries(body.integrations)
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    if (integs.length > 0) result['Disabled Destinations'] = integs.join(', ');
  }

  // Properties (track/page calls) — flat pass-through
  const props = (body.properties as Record<string, unknown>) ?? {};
  for (const [key, value] of Object.entries(props)) {
    result[titleCase(key)] = formatJsonValue(value);
  }

  // Traits (identify/group calls) — flat pass-through
  const traits = (body.traits as Record<string, unknown>) ?? {};
  for (const [key, value] of Object.entries(traits)) {
    result[`${titleCase(key)} (trait)`] = formatJsonValue(value);
  }

  return result;
}
```

**Helper funkce:**
- `maskKey(key)`: Zobrazí prvních 8 znaků + "..."
- `titleCase(key)`: `order_id` → `Order Id`
- `formatJsonValue(value)`: String/number → string, Object/Array → pretty-printed JSON

---

### CR-2: Tealium iQ — Kompletní rewrite

**Soubor:** `src/providers/tealium.ts`

**Přístup:** Explicitní labels pro známé prefixy + pass-through všeho ostatního.

```typescript
// Známé Tealium prefixy a jejich labels
const TEALIUM_PREFIX_MAP: Record<string, string> = {
  'tealium_event': 'Event',
  'tealium_account': 'Account',
  'tealium_profile': 'Profile',
  'tealium_visitor_id': 'Visitor ID',
  'cp.URL': 'Page URL',
  'cp.referrer': 'Referrer',
  'cp.title': 'Page Title',
  'ut.source': 'Campaign Source',
  'ut.medium': 'Campaign Medium',
  'ut.campaign': 'Campaign Name',
  'ut.term': 'Campaign Term',
  'ut.content': 'Campaign Content',
  'meta.URL': 'Meta URL',
  'meta.referrer': 'Meta Referrer',
  'js_page.URL': 'JS Page URL',
};

// Klíče, které se mají přeskočit (interní Tealium system params)
const SKIP_KEYS = new Set([
  'tealium_library_name', 'tealium_random', 'tealium_session_id',
  'tealium_timestamp', 'tealium_datasource', 'teaConnectionType',
  'data_source', 'post_time'
]);

parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
  const p = getParams(url, postBody);
  const result: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(p)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value === undefined || value === '') continue;

    const label = TEALIUM_PREFIX_MAP[key];
    if (label) {
      result[label] = value;
    } else {
      // Pass-through se zachováním klíče
      result[key] = value;
    }
  }

  return result;
}
```

---

### CR-3: Adobe Target — Kompletní rewrite

**Soubor:** `src/providers/adobe/target.ts`

**Přístup:** Parsovat URL params + JSON POST body.

```typescript
parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
  const p = getParams(url, postRaw);
  const body = parsePostBodyJson(postRaw);
  const req = (body.request as Record<string, unknown>) ?? {};
  const id = (req.id as Record<string, unknown>) ?? {};
  const ctx = (req.context as Record<string, unknown>) ?? {};
  const address = (ctx.address as Record<string, unknown>) ?? {};
  const str = (v: unknown) => v != null ? String(v) : undefined;

  // Client code z URL path: /rest/v1/delivery?client=CODE
  const clientMatch = url.match(/client=([^&]+)/);
  const clientCode = clientMatch?.[1] ?? str(body.client);

  const result: Record<string, string | undefined> = {
    // IDs
    'Client Code': clientCode,
    'Request ID': str(req.requestId),
    'Session ID': str(body.sessionId),
    'TNT ID': str(id.tntId),
    MCID: str(id.marketingCloudVisitorId),
    'Third Party ID': str(id.thirdPartyId),
    'Customer ID': str(id.customerId),

    // Context
    Channel: str(ctx.channel),
    'Page URL': str(address.url) ?? p.mboxURL,
    Referrer: str(address.referringUrl) ?? p.referrer,
    Host: str((ctx.browser as Record<string, unknown>)?.host) ?? p.mboxHost,
    'User Agent': str(ctx.userAgent),
    'Environment ID': str(body.environmentId),

    // Mboxes
    ...extractMboxes(req.execute as Record<string, unknown>, 'Execute'),
    ...extractMboxes(req.prefetch as Record<string, unknown>, 'Prefetch'),

    // Integration
    'EC Analytics': str((req.experienceCloud as Record<string, unknown>)
      ?.(req.experienceCloud as Record<string, unknown>).analytics
        ?.(req.experienceCloud as Record<string, unknown>).analytics.logging : undefined),
  };

  return result;
}

function extractMboxes(
  container: Record<string, unknown>,
  prefix: string
): Record<string, string | undefined> {
  const mboxes = container?.mboxes as Array<Record<string, unknown>> | undefined;
  if (!mboxes || mboxes.length === 0) return {};

  const names = mboxes.map(m => String(m.name ?? '?')).join(', ');
  const result: Record<string, string | undefined> = {
    [`${prefix} Mboxes (${mboxes.length})`]: names,
  };

  // Detail pro každý mbox (parametry)
  for (const mbox of mboxes) {
    const params = mbox.parameters as Record<string, unknown> | undefined;
    if (params && Object.keys(params).length > 0) {
      result[`${prefix}: ${mbox.name}`] = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
    }
  }

  return result;
}
```

---

### CR-4: Amplitude — Kompletní rewrite

**Soubor:** `src/providers/amplitude.ts`

```typescript
parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
  const p = getParams(url, postRaw);
  const body = parsePostBodyJson(postRaw);
  const events = Array.isArray(body.events)
    ? body.events as Record<string, unknown>[]
    : [];
  const e = events[0] ?? {};
  const str = (v: unknown) => v != null ? String(v) : undefined;

  const result: Record<string, string | undefined> = {
    // Core
    Event: str(e.event_type) ?? p.event_type,
    'User ID': str(e.user_id) ?? p.user_id,
    'Device ID': str(e.device_id) ?? p.device_id,
    'Session ID': str(e.session_id) ?? p.session_id,
    'API Key': str(body.api_key) ?? p.api_key,
    Revenue: str(e.revenue),
    Time: e.time ? new Date(Number(e.time)).toISOString() : undefined,
  };

  // Device / Geo
  if (e.platform) result['Platform'] = str(e.platform);
  if (e.os_name) result['OS'] = [e.os_name, e.os_version].filter(Boolean).join(' ');
  if (e.device_brand) result['Device'] = [e.device_brand, e.device_model].filter(Boolean).join(' ');
  if (e.version_name) result['App Version'] = str(e.version_name);
  if (e.country) result['Country'] = str(e.country);
  if (e.region) result['Region'] = str(e.region);
  if (e.city) result['City'] = str(e.city);
  if (e.ip) result['IP'] = str(e.ip);
  if (e.language) result['Language'] = str(e.language);

  // Event Properties — flat pass-through s ep. prefixem
  const ep = (e.event_properties as Record<string, unknown>) ?? {};
  for (const [key, value] of Object.entries(ep)) {
    result[`ep.${key}`] = formatJsonValue(value);
  }

  // User Properties — flat pass-through s up. prefixem
  const up = (e.user_properties as Record<string, unknown>) ?? {};
  for (const [key, value] of Object.entries(up)) {
    result[`up.${key}`] = formatJsonValue(value);
  }

  // Groups
  if (e.groups && typeof e.groups === 'object') {
    result['Groups'] = JSON.stringify(e.groups);
  }

  return result;
}
```

**Kategorizace (přidat do `categories.ts`):**
```typescript
Amplitude: {
  hit: { label: 'Hit Info', icon: '📊', order: 1, defaultExpanded: true,
    patterns: [/^Event$/, /^Time$/, /^Revenue$/] },
  user: { label: 'User', icon: '👤', order: 2, defaultExpanded: true,
    patterns: [/^User ID$/, /^Device ID$/, /^Session ID$/] },
  eventData: { label: 'Event Properties', icon: '⚡', order: 3, defaultExpanded: true,
    patterns: [], prefixMatch: ['ep.'] },
  userData: { label: 'User Properties', icon: '🔧', order: 4, defaultExpanded: true,
    patterns: [], prefixMatch: ['up.'] },
  device: { label: 'Device & Geo', icon: '💻', order: 5, defaultExpanded: false,
    patterns: [/^Platform$/, /^OS$/, /^Device$/, /^Country$/, /^Region$/, /^City$/, /^IP$/, /^Language$/, /^App Version$/] },
  config: { label: 'Config', icon: '🔑', order: 6, defaultExpanded: false,
    patterns: [/^API Key$/, /^Groups$/] },
},
```

---

### CR-5: Mixpanel — Kompletní rewrite

**Soubor:** `src/providers/mixpanel.ts`

```typescript
parseParams(url: string, postRaw: unknown): Record<string, string | undefined> {
  const p = getParams(url, postRaw);
  const str = (v: unknown) => v != null ? String(v) : undefined;

  // Základ z URL params
  let eventName = p.event;
  let distinctId: string | undefined;
  let token: string | undefined;

  // Decode base64 data param
  const decoded = decodeMixpanelData(p.data);

  // Pass-through všech properties z decoded JSON
  const result: Record<string, string | undefined> = {};

  if (decoded) {
    eventName = str(decoded.event) ?? eventName;
    const props = (decoded.properties as Record<string, unknown>) ?? {};
    distinctId = str(props.distinct_id);
    token = str(props.token);

    // Všechny properties jako flat pass-through
    for (const [key, value] of Object.entries(props)) {
      // Přeskočit interní systémové params, které už máme explicitně
      if (key === 'distinct_id' || key === 'token') continue;

      // Smazat $ prefix pro čistší display
      const displayKey = key.startsWith('$') ? key.slice(1) : key;
      result[titleCase(displayKey)] = formatJsonValue(value);
    }
  }

  // Core (vždy na začátek)
  const core: Record<string, string | undefined> = {
    Event: eventName,
    'Distinct ID': distinctId,
    Token: token,
  };

  return { ...core, ...result };
}

function decodeMixpanelData(data: string | undefined): Record<string, unknown> | null {
  if (!data) return null;
  try {
    const decoded = JSON.parse(atob(data));
    return Array.isArray(decoded) ? decoded[0] as Record<string, unknown> : decoded;
  } catch {
    return null;
  }
}
```

**Kategorizace (přidat do `categories.ts`):**
```typescript
Mixpanel: {
  hit: { label: 'Hit Info', icon: '📊', order: 1, defaultExpanded: true,
    patterns: [/^Event$/, /^Distinct ID$/, /^Token$/, /^Time$/] },
  properties: { label: 'Properties', icon: '⚡', order: 2, defaultExpanded: true,
    patterns: [/^(?!Distinct ID$|Token$|Event$|Time$).*/] },
},
```

---

### CR-6: Snapchat Pixel — Kompletní rewrite

**Soubor:** `src/providers/snapchat-pixel.ts`

```typescript
parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
  const p = getParams(url, postBody);
  const body = parsePostBodyJson(postBody);
  const str = (v: unknown) => v != null ? String(v) : undefined;

  return {
    // Core
    Event: str(body.event_type) ?? p.event_type,
    'Pixel ID': str(body.pixel_id) ?? p.pixel_id,

    // Page
    'Page URL': str(body.page_url) ?? p.page_url,
    'Page Title': str(body.page_title),

    // E-commerce
    Value: str(body.value) ?? p.value,
    Currency: str(body.currency) ?? p.currency,
    'Transaction ID': str(body.transaction_id),
    'Item IDs': body.item_ids ? JSON.stringify(body.item_ids) : undefined,
    'Item Category': str(body.item_category),
    'Number Items': str(body.number_items),
    Price: str(body.price) ?? p.price,

    // User Matching
    'Email (SHA256)': str(body.user_email_sha256) ?? p.user_email,
    'Phone (SHA256)': str(body.user_phone_sha256),

    // Campaign
    'UTM Source': str(body.utm_source),
    'UTM Medium': str(body.utm_medium),
    'UTM Campaign': str(body.utm_campaign),
  };
}
```

---

## FÁZE 3: HIGH-VALUE ROZŠÍŘENÍ (2–3 dny)

### HV-1: RudderStack — Stejné jako Segment

**Soubor:** `src/providers/rudderstack.ts`

Použít identický přístup jako Segment (CR-1). RudderStack API je Segment-kompatibilní.
Kopie pass-through logiky pro `properties.*`, `traits.*`, `context.*`.

---

### HV-2: mParticle — Přidat event data

**Soubor:** `src/providers/mparticle.ts`

Přidat do existujícího parseParams:
```typescript
// Po existujícím kódu přidat:

// Custom Attributes
const customAttrs = data?.custom_attributes as Record<string, unknown> | undefined;
if (customAttrs) {
  for (const [key, value] of Object.entries(customAttrs)) {
    result[titleCase(key)] = formatJsonValue(value);
  }
}

// User Attributes
const userAttrs = body.user_attributes as Record<string, unknown> | undefined;
if (userAttrs) {
  for (const [key, value] of Object.entries(userAttrs)) {
    result[`${titleCase(key)} (user)`] = formatJsonValue(value);
  }
}

// Product Action
const productAction = data?.product_action as Record<string, unknown> | undefined;
if (productAction) {
  result['Product Action'] = str(productAction.action);
  if (productAction.products) {
    result['Products'] = JSON.stringify(productAction.products, null, 2);
  }
}

// Device + App
result['SDK Version'] = str(body.sdk);
result['Batch ID'] = str(body.batch_id);
```

---

### HV-3: Adobe Server-Side — Přidat XDM commerce

**Soubor:** `src/providers/adobe/aep-websdk.ts`

Přidat za existující kód:
```typescript
// XDM Commerce
const commerce = (xdm.commerce as Record<string, unknown>) ?? {};
if (commerce.order) {
  const order = commerce.order as Record<string, unknown>;
  if (order.purchaseID) result['Purchase ID'] = str(order.purchaseID);
  if (order.priceTotal) result['Price Total'] = str(order.priceTotal);
  if (order.currencyCode) result['Order Currency'] = str(order.currencyCode);
}

// Product List Items
const productListItems = xdm.productListItems as Array<Record<string, unknown>> | undefined;
if (productListItems && productListItems.length > 0) {
  result['Products'] = JSON.stringify(productListItems, null, 2);
}

// Commerce actions
const commerceActions = ['productListAdds', 'productListOpens', 'productListRemovals',
  'productListReopens', 'productListViews', 'purchases', 'saveForLaters'];
for (const action of commerceActions) {
  const val = commerce[action];
  if (val && typeof val === 'object') {
    result[titleCase(action)] = formatJsonValue(val);
  }
}

// Browser details
const browser = (xdm.environment?.browserDetails as Record<string, unknown>) ?? {};
if (browser.browserName) result['Browser'] = str(browser.browserName);
if (browser.browserVersion) result['Browser Version'] = str(browser.browserVersion);

// Remove Screen orient (šum)
delete result['Screen orient'];
```

---

### HV-4: Criteo — Pass-through

**Soubor:** `src/providers/criteo.ts`

```typescript
parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
  const p = getParams(url, postBody);
  const body = parsePostBodyJson(postBody);
  const str = (v: unknown) => v != null ? String(v) : undefined;

  const result: Record<string, string | undefined> = {
    Account: p.a ?? str(body.a),
    Event: p.e ?? str(body.e),
  };

  // E-commerce
  if (p.item) result['Product IDs'] = p.item;
  if (p.price) result['Price'] = p.price;
  if (p.id) result['Transaction ID'] = p.id;
  if (p.quantity) result['Quantity'] = p.quantity;
  if (p.zip) result['Zip Code'] = p.zip;

  // JSON body data
  if (body?.customer_email) result['Email (hashed)'] = str(body.customer_email);

  // dp params pass-through
  for (const [key, value] of Object.entries(p)) {
    if (key.startsWith('dp.') && value) {
      result[key] = value;
    }
  }

  return result;
}
```

---

### HV-5: GA4 — Přidat chybějící params

**Soubor:** `src/providers/google/ga4.ts`

Přidat do existujícího decoded objektu:
```typescript
// Po existujících parametrech přidat:

// Campaign (kategorie už existuje, ale parseParams negeneruje)
if (p.gclid) decoded['gclid'] = p.gclid;
if (p.dclid) decoded['dclid'] = p.dclid;
if (p.gbraid) decoded['gbraid'] = p.gbraid;
if (p.wbraid) decoded['wbraid'] = p.wbraid;
if (p.srsltid) decoded['srsltid'] = p.srsltid;

// Debug
if (p._dbg) decoded['_dbg'] = p._dbg;
if (p.fid) decoded['fid'] = p.fid;

// Engagement — zobrazit jen non-zero
if (p._et && Number(p._et) > 0) decoded['Engagement'] = `${p._et}ms`;
// (nahrazuje stávající řádek, který zobrazuje i "0ms")
```

---

## FÁZE 4: STŘEDNÍ PRIORITA (2–3 dny)

### MD-1: Meta Pixel — Přidat `cd[*]` pass-through

**Soubor:** `src/providers/meta/pixel.ts`

Přidat na konec parseParams:
```typescript
// Pass-through všech cd[*] params, které nejsou ve whitelistu
const knownCd = new Set([
  'cd[value]', 'cd[currency]', 'cd[content_ids]', 'cd[content_name]',
  'cd[content_type]', 'cd[content_category]', 'cd[num_items]', 'cd[contents]',
  'cd[predicted_ltv]', 'cd[delivery_category]',
]);
for (const [key, value] of Object.entries(p)) {
  if (key.startsWith('cd[') && !knownCd.has(key) && value) {
    decoded[key.slice(3, -1)] = value;  // odstranit cd[...] wrapper
  }
}
```

---

### MD-2: TikTok — Přidat properties pass-through

**Soubor:** `src/providers/tiktok.ts`

Přidat do return objektu:
```typescript
// Pass-through všech properties.*
for (const [key, value] of Object.entries(props)) {
  if (!['url', 'value', 'currency', 'content_id', 'content_type',
        'content_name', 'order_id', 'search_string'].includes(key)) {
    result[titleCase(key)] = formatJsonValue(value);
  }
}

// TikTok Pixel Cookie
if (ctxUser.ttp) result['TT Cookie ID'] = str(ctxUser.ttp);
```

---

### MD-3: Matomo — Přidat e-commerce a dimensions

**Soubor:** `src/providers/matomo.ts`

Přidat do return objektu:
```typescript
// E-commerce
'Order ID': p.ec_id,
'Items': p.ec_items ? JSON.stringify(JSON.parse(p.ec_items), null, 2) : undefined,
'Goal ID': p.idgoal,
'Subtotal': p.ec_st,
'Tax': p.ec_tx,
'Shipping': p.ec_sh,
'Discount': p.ec_dt,

// Campaign
'Campaign Name': p._rcn,
'Campaign Keyword': p._rck,

// Search
'Search Category': p.search_cat,
'Search Count': p.search_count,
```

A přidat dynamický loop pro `dimension[1-9]+`:
```typescript
for (const [key, value] of Object.entries(p)) {
  if (/^dimension\d+$/.test(key) && value) {
    result[titleCase(key)] = value;
  }
}
```

---

### MD-4: Piwik PRO — Stejné jako Matomo

**Soubor:** `src/providers/piwik-pro.ts`

Analogické přidání e-commerce a dimensions.

---

### MD-5: AT Internet — Přidat visitor ID a pass-through

**Soubor:** `src/providers/at-internet.ts`

Přidat do return objektu:
```typescript
Referrer: p.ref,
'Visitor ID': p.idclient,
'User ID': p.uid,
'Custom Object': p.xto,
'Search Keywords': p.ise,
```

A přidat pass-through pro ostatní params (AT Internet jich může posílat desítky):
```typescript
const knownKeys = new Set(['x2', 's2', 'p', 'xtor', 'type', 'clic', 'ref', 'idclient', 'uid', 'xto', 'ise']);
for (const [key, value] of Object.entries(p)) {
  if (!knownKeys.has(key) && value) {
    result[key] = value;
  }
}
```

---

### MD-6: Bing Ads — Přidat e-commerce a custom events

**Soubor:** `src/providers/microsoft/bing-ads.ts`

Přidat do return objektu:
```typescript
// Custom Events
'Event Category': p.ec,
'Event Action': p.ea,
'Event Label': p.el,
'Event Value': p.ev,

// E-commerce
'Goal Value': p.gv,
'Goal Currency': p.gc,
'Revenue': p.revenue,
```

Odstranit šum:
```typescript
// Odstranit:
// 'Color Depth': ...
// 'Language': ...
```

---

### MD-7: DoubleClick — Přidat custom variables

**Soubor:** `src/providers/doubleclick.ts`

Přidat do return objektu:
```typescript
Quantity: p.qty,
Revenue: p.cost,
Transaction: p.tran,
Tag: p.tag,
```

A přidat pass-through pro `u1`–`u50`:
```typescript
for (const [key, value] of Object.entries(p)) {
  if (/^u\d+$/.test(key) && value) {
    result[`Custom: ${key}`] = value;
  }
}
```

---

### MD-8: Optimizely — Přidat JSON body parsing

**Soubor:** `src/providers/optimizely.ts`

Přidat JSON body parsing:
```typescript
const body = parsePostBodyJson(postRaw);
const snapshots = Array.isArray(body.snapshots)
  ? body.snapshots as Record<string, unknown>[]
  : [];

if (snapshots.length > 0) {
  const snap = snapshots[0];
  const decisions = snap.decisions as Array<Record<string, unknown>> | undefined;
  const events = snap.events as Array<Record<string, unknown>> | undefined;

  if (decisions?.length) {
    const names = decisions.map(d => `${d.variationName ?? d.variationId}`)
      .join(', ');
    result['Variations'] = names;
  }

  if (events?.length) {
    const evtNames = events.map(e => String(e.eventName ?? ''))
      .filter(Boolean).join(', ');
    if (evtNames) result['Body Events'] = evtNames;
  }
}

result['Client Version'] = str(body.clientVersion);
result['Visitor ID'] = str(body.visitorId);
```

---

### MD-9: Dynamic Yield — Přidat JSON body parsing

**Soubor:** `src/providers/dynamic-yield.ts`

Analogicky k Optimizely — přidat decision/variation data z POST body.

---

### MD-10: Braze — Přidat properties pass-through

**Soubor:** `src/providers/braze.ts`

Přidat do return objektu po existujícím JSON parsing:
```typescript
// Event properties
if (Array.isArray(body.events) && body.events.length > 0) {
  const props = body.events[0].properties as Record<string, unknown> | undefined;
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      result[`ep.${key}`] = formatJsonValue(value);
    }
  }
}
```

---

## FÁZE 5: MALÉ PŘIDAVKY (1 den)

### SM-1: X (Twitter) Pixel — Přidat params

**Soubor:** `src/providers/twitter-pixel.ts`

Přidat:
```typescript
'Page Title': p.tw_document_title,
'Conversion ID': p.tw_conversion_id,
'Email (hashed)': p.em,
'Phone (hashed)': p.ph,
'First Name (hashed)': p.fn,
'Last Name (hashed)': p.ln,
```

---

### SM-2: Pinterest — Přidat drobnosti

**Soubor:** `src/providers/pinterest.ts`

V `ed` JSON parsing přidat:
```typescript
edOrderId = ed['order_id'] != null ? String(ed['order_id']) : undefined;
edSearchQuery = ed['search_query'] != null ? String(ed['search_query']) : undefined;
edLeadType = ed['lead_type'] != null ? String(ed['lead_type']) : undefined;
```

A do return:
```typescript
'Order ID': edOrderId,
'Search Query': edSearchQuery,
'Lead Type': edLeadType,
```

---

### SM-3: LinkedIn — Přidat params

**Soubor:** `src/providers/linkedin.ts`

Přidat:
```typescript
'Conversion Hash': p.ch,
Time: p.time,
'Conversion ID': p._litr,
Version: p.v,
```

---

### SM-4: Adobe ECID — Přidat params

**Soubor:** `src/providers/adobe/ecid.ts`

Přidat:
```typescript
Blob: p.d_blob,
'Device Co-op': p.dpv,
'Platform': p.d_ptype,
'Region': p.dcs_region,
```

---

### SM-5: Adobe Client-Side — Přidat list vars + hierarchies

**Soubor:** `src/providers/adobe/analytics.ts`

Přidat za existující eVars/props loop:
```typescript
// List Variables
const lists: Record<string, string> = {};
for (let i = 1; i <= 3; i++) {
  if (p[`l${i}`]) lists[`list${i}`] = p[`l${i}`];
}
if (Object.keys(lists).length > 0) Object.assign(result, lists);

// Hierarchies
for (let i = 1; i <= 5; i++) {
  if (p[`h${i}`]) result[`hier${i}`] = p[`h${i}`];
}
```

---

### SM-6: Adobe Heartbeat — Přidat video metadata

**Soubor:** `src/providers/adobe/heartbeat.ts`

Přidat:
```typescript
Publisher: p['s:sp:pub'],
'SDK Version': p['s:sp:sdk'],
'Player Name': p['s:sp:pln'],
'Video Length': p['s:sp:len'] ? `${p['s:sp:len']}s` : undefined,
Bitrate: p['s:sp:brt'],
FPS: p['s:sp:fps'],
```

---

### SM-7: Hotjar — Přidat request type

**Soubor:** `src/providers/hotjar.ts`

```typescript
parseParams(url: string): Record<string, string | undefined> {
  const p = getParams(url);
  const typeMatch = url.match(/hotjar\.com\/([^?/]+)/);
  return {
    'Site ID': p.hjid || p.siteId,
    'Request Type': typeMatch?.[1],
  };
}
```

---

### SM-8: FullStory — Přidat org/session ID

**Soubor:** `src/providers/fullstory.ts`

```typescript
// Přidat extrakci z URL path
const orgMatch = url.match(/fullstory\.com\/rec\/([^/]+)/);
const sessionMatch = url.match(/session[/:]([^/?]+)/);

return {
  'User ID': p.uid,
  'Display Name': p.displayName,
  Email: p.email,
  'Org ID': orgMatch?.[1],
  'Session ID': sessionMatch?.[1],
};
```

---

### SM-9: Clarity — Komprese Ping eventů

**Soubor:** `src/providers/microsoft/clarity.ts`

V `decodeAnalyticsEvents()`:
```typescript
// Ping komprese: místo jednotlivých Ping [n] sbalit do jednoho
let pingCount = 0;
let pingGap: string | undefined;

for (let i = 0; i < events.length; i++) {
  const ev = events[i];
  if (!Array.isArray(ev) || ev.length < 2) continue;
  const eventType = Number(ev[1]);

  if (eventType === 25) { // Ping
    pingCount++;
    pingGap = ev[2] != null ? String(ev[2]) : undefined;
    continue;  // nepřidávat jednotlivé Ping [n]
  }

  // ... existující switch pro ostatní typy ...
}

// Na konec přidat komprimovaný Ping
if (pingCount > 0) {
  params[`Pings`] = `${pingCount}× (gap: ${pingGap ?? '?'}ms)`;
}
```

---

### SM-10: HubSpot — Přidat cookie params

**Soubor:** `src/providers/hubspot.ts`

Přidat:
```typescript
'User Token': p.hutk,
'Session Count': p.hssc,
'Long-term Cookie': p.hstc,
```

---

### SM-11: Scorecard — Opravit URL

**Soubor:** `src/providers/scorecard.ts`

Odstranit `URL: p['rn']` (je to random number). Přidat reálné page data, pokud existují:
```typescript
return {
  Publisher: p.c1,
  Site: p.c2,
  Segment: p.c4,
  // rn je cache buster — nezobrazovat
};
```

---

### SM-12: The Trade Desk — Přidat params

**Soubor:** `src/providers/thetradesk.ts`

Přidat:
```typescript
'Transaction ID': p.tda,
'Match ID': p.tm,
'Conversion Type': p.tdu,
'Custom X': p.tx,
'Custom Y': p.ty,
```

---

### SM-13: Indicative — Přidat properties

**Soubor:** `src/providers/indicative.ts`

Přidat do JSON body parsing:
```typescript
const props = body.properties as Record<string, unknown> | undefined;
if (props) {
  for (const [key, value] of Object.entries(props)) {
    result[titleCase(key)] = formatJsonValue(value);
  }
}
```

---

### SM-14: Tealium EventStream — Pass-through

**Soubor:** `src/providers/tealium-eventstream.ts`

Přidat pass-through ostatních params:
```typescript
const knownKeys = new Set(['tealium_event', 'tealium_visitor_id', 'tealium_account', 'tealium_profile']);
for (const [key, value] of Object.entries(p)) {
  if (!knownKeys.has(key) && value) {
    result[key] = value;
  }
}
```

---

## KATEGORIZACE — PŘIDÁNÍ DO categories.ts

Pro nové a rozšířené provideré přidat kategorie:

| Provider | Priorita | Kategorie |
|----------|----------|-----------|
| Amplitude | Fáze 2 | hit, user, eventData (ep.*), userData (up.*), device, config |
| Mixpanel | Fáze 2 | hit, properties |
| Segment | Fáze 2 | core, context, properties, traits |
| Tealium iQ | Fáze 2 | core, pageContext (cp.*), campaign (ut.*), custom |
| Bing Ads | Fáze 4 | hit, page, events, ecommerce, identity, technical |
| TikTok | Fáze 4 | hit, page, ecommerce, user, properties |
| Pinterest | Fáze 5 | hit, pixel, page, ecommerce, device, technical |

---

## HELPER FUNKCE — NOVÝ SOUBOR

**Soubor:** `src/providers/parse-helpers.ts` (nový)

```typescript
import type { HARPostBody } from '@/types/har';

/**
 * Standardized JSON POST body parser.
 * Handles string, object, and HAR format post bodies.
 */
export function parsePostBodyJson(postRaw: unknown): Record<string, unknown> {
  if (!postRaw) return {};
  if (typeof postRaw === 'string') {
    try { return JSON.parse(postRaw); } catch { return {}; }
  }
  if (typeof postRaw === 'object' && !('text' in postRaw) && !('raw' in postRaw)) {
    return postRaw as Record<string, unknown>;
  }
  try {
    const har = postRaw as HARPostBody;
    const text = har?.text ?? (har?.raw?.[0]?.bytes ? atob(har.raw[0].bytes) : '');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Convert snake_case/camelCase to Title Case for display.
 * "order_id" → "Order Id", "productName" → "Product Name"
 */
export function titleCase(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-./]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format JSON value for display.
 * Primitives → string, Objects/Arrays → pretty-printed JSON.
 */
export function formatJsonValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Mask API key for display: first 8 chars + "..."
 */
export function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 12) return key;
  return key.slice(0, 8) + '...';
}
```

---

## TIMELINE

| Fáze | Obsah | Doba | Celkem |
|------|-------|------|--------|
| Fáze 1 | Quick wins — odstranění šumu | 1 den | 1 den |
| Fáze 2 | Kritické rewrites (Segment, Tealium, Target, Amplitude, Mixpanel, Snapchat) | 3–5 dní | 4–6 dní |
| Fáze 3 | High-value rozšíření (RudderStack, mParticle, Adobe SS, Criteo, GA4) | 2–3 dny | 6–9 dní |
| Fáze 4 | Střední priorita (Meta, TikTok, Matomo, AT Internet, Bing, DC, Optimizely, Braze) | 2–3 dny | 8–12 dní |
| Fáze 5 | Malé přidavky (13 drobných providerů) | 1 den | 9–13 dní |

**Celkový odhad: 9–13 pracovních dní**

---

## CHECKLIST — CO NEZMIŇOVAT (27 providerů)

Tito provideré zůstávají beze změny:

- [x] GTM
- [x] Google Ads
- [x] Reddit Pixel
- [x] Spotify Pixel
- [x] Amazon Ads
- [x] Parse.ly
- [x] Webtrends
- [x] Comscore
- [x] Microsoft Clarity Tag
- [x] Crazy Egg
- [x] Glassbox
- [x] Medallia DXA
- [x] Omniconvert
- [x] Split.io
- [x] Adobe AAM
- [x] Demandbase
- [x] 6Sense
- [x] Lytics
- [x] Ensighten
- [x] Merkury
- [x] Outbrain
- [x] Teads
- [x] RTB House
- [x] Zemanta
- [x] Sojern
- [x] Vibes
- [x] Invoca
- [x] Brevo
