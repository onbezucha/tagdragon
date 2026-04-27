# Provider Deep Dive — TagDragon v1.6.1
# Kompletní průvodce pro rozhodování o datech každého provideru

---

## LEGENDA
- ✅ = Dobré, nechat jak je
- ⚠️ = K diskusi (může být šum nebo může mít hodnotu)
- ❌ = Šum, navrhuji odstranit
- ➕ = Chybí, navrhuji přidat
- 📦 = Má kategorizaci v categories.ts
- 🔲 = Nemá kategorizaci

---
---

## SKUPINA 1: GOOGLE STACK (4 provideré)

---

### 1.1 GA4 📦

**Current parseParams (28 explicit + dynamické):**
```
Event, Session ID, Session Count, Session Engaged, Hit Sequence, Engagement,
Client ID, User ID, ECID, Page, Page title, Referrer,
Measurement ID, GTM Version,
Consent State, Consent Defaults, Non-personalized Ads, DMA Compliance, DMA Consent,
Currency,
Screen Resolution, User Language
```

**Dynamické (pass-through):**
- `ep.*` / `epn.*` — Event Parameters
- `up.*` / `upn.*` — User Properties
- `pr*` — Product-scoped params

**➕ Chybějící high-value parametry:**
| Param | Surový klíč | Proč je důležitý |
|-------|-----------|-----------------|
| Transaction ID | `tid` v ecommerce kontextu, `ti` | Klíčové pro purchase debugging |
| Value | `ep.value` nebo `v` | Celková hodnota |
| Tax | `ep.tax` nebo `tt` | Daň |
| Shipping | `ep.shipping` nebo `ts` | Doprava |
| Coupon | `ep.coupon` nebo `tcc` | Slevový kód |
| Item ID | `ep.item_id` | ID produktu |
| Item Name | `ep.item_name` | Název produktu |
| Debug flag | `_dbg` | Zapnutý debug mode? |
| Firebase ID | `fid` | Firebase App Instance ID |
| First visit | `_fv` | First visit timestamp |
| New to service | `_nsi` | New user indicator |
| Session source | `_ss` | Session start flag |
| Google Signals | `_gs` | Google Signals |
| Traffic type | `tt` | Organic/Direct/Paid |
| gclid | `gclid` | Google Click ID |
| dclid | `dclid` | DoubleClick Click ID |
| gbraid | `gbraid` | iOS app conversion |
| wbraid | `wbraid` | iOS web conversion |
| srsltid | `srsltid` | Google Merchant Center |

**Poznámka:** GA4 už má `ep.*` pass-through, takže mnoho z těchto parametrů se už zobrazuje
v sekci "Event Parameters". Ale následující nejsou v `ep.*` a měly by být explicitní:
- `_dbg`, `fid`, `_fv`, `_nsi`, `_ss`, `_gs`, `tt`
- `gclid`, `dclid`, `gbraid`, `wbraid`, `srsltid` (campaign — kampaň existuje, ale parseParams je negeneruje)

**⚠️ Možný šum:**
- `Screen Resolution` — nízká hodnota pro tag debugging (už má defaultExpanded: false ✓)
- `User Language` — nízká hodnota
- `Engagement` — pokud je "0ms", je to šum

**Kategorie:** 📦 — 9 kategorií (hit, measurement, page, eventData, user, campaign, ecommerce, consent, device)

**OTÁZKA:** GA4 posílá desítky parametrů v `ep.*` — často 10-30 event params. Má smysl
přidat explicitní labels pro nejčastější ecommerce parametry, nebo je nechat jako surové `ep.*` klíče?

---

### 1.2 GA (UA) 🔲

**Current parseParams (7):**
```
Hit type, Tracking ID, Client ID, Page, Page title, Event category, Event action, Event label
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| User ID | `uid` | User identification |
| Referrer | `dr` | Odkud uživatel přišel |
| Campaign Source | `cs` | Campaign tracking |
| Campaign Medium | `cm` | Campaign tracking |
| Campaign Name | `cn` | Campaign tracking |
| Campaign Keyword | `ck` | Campaign tracking |
| Transaction ID | `ti` | E-commerce |
| Revenue | `tr` | E-commerce |
| Shipping | `ts` | E-commerce |
| Tax | `tt` | E-commerce |
| Affiliation | `ta` | E-commerce |
| Currency | `cu` | E-commerce |
| Social Network | `sn` | Social tracking |
| Social Action | `sa` | Social tracking |
| Social Target | `st` | Social tracking |
| Page Load Time | `plt` | Performance |
| DNS Time | `dns` | Performance |
| Custom Dimensions | `cd[1-9]+` | Velmi často používané |
| Custom Metrics | `cm[1-9]+` | Méně časté |
| Content Group | `cg[1-5]` | Obsah |
| Product SKU | `pr[1-9]id` | Enhanced E-commerce |
| Product Name | `pr[1-9]nm` | Enhanced E-commerce |
| Product Price | `pr[1-9]pr` | Enhanced E-commerce |

**Kategorie:** 📦 — má kategorie (9), ale parseParams vrací jen 7 params —
kategorie jsou definované ale nemají co kategorizovat!

**OTÁZKA:** UA je legacy (Google ho ukončil v roce 2023). Kolik úsilí do něj investovat?
Stále existují migrace a někteří klienti ho mají.

---

### 1.3 GTM 🔲

**Current parseParams (4):**
```
Container ID, Preview Auth, Preview Env, Preview Cookies
```

**➕ Chybějící:**
| Param | Proč |
|-------|------|
| `auth` | Plný auth token |
| `m` | — |
| `cx` | — |

**Poznámka:** GTM container load request má minimum query params. Aktuální 4 je pravděpodobně kompletní.
`Preview Auth/Env/Cookies` se zobrazují pouze v Preview módu.

**Verdikt:** ✅ Kompletní. GTM load request nemá další params.

---

### 1.4 Google Ads 🔲

**Current parseParams (22):**
```
Conversion ID, Conversion Label, Conversion Type, Event, Conversion Value, Currency,
Transaction ID, Page Title, Page URL, Referrer, Google Click ID, wbraid, gbraid,
GTM Container, Advertiser User ID, Consent State, Consent Details, Non-Personalized,
DMA Compliance, DMA Consent, Cookie Present, E-Commerce Value, Product IDs, E-Commerce Type
```

**Poznámka:** Parsování `data` parametru (semicolons) — velmi dobré.

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Batch ID | `batch_id` | Batch processing |
| Optimisation | `opt` | Opt-out flag |
| Google Payment | `gpayment` | Payment info |

**⚠️ Možný šum:**
- `Cookie Present` — většinou "1"
- `Consent Details` (`gcd`) — velmi dlouhý string

**Verdikt:** Jeden z nejlepších providerů. Drobné přídavky.

---
---

## SKUPINA 2: SOCIAL & AD PIXELS (8 provideré)

---

### 2.1 Meta Pixel 📦

**Current parseParams (~25):**
```
Event, Action, Event ID, Event Count, Ordinal, Last Event Result,
Pixel ID, Pixel Version, Release,
URL, Referrer,
Value, Currency, Content IDs, Content Name, Content Type, Content Category, Num Items, Contents,
FBP, FBC,
Screen Resolution,
Timestamp, Page Load Time, Init Time, In iFrame, Click-Only, Consent Data Layer, Consent Flag, Experiments
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Predicted LTV | `cd[predicted_ltv]` | Meta optimization |
| Content Language | `cd[content_language]` | Vícejazyčné weby |
| Delivery Category | `cd[delivery_category]` | Doprava |
| Status | `cd[status]` | Registration event |
| Lead Type | `cd[external_id]` | Lead gen |
| Všechny ostatní `cd[*]` | `cd[...]` | Custom data — teď se zahazují |

**❌ Šum:**
| Param | Proč |
|-------|------|
| Ordinal | Interní počítadlo |
| Last Event Result | Interní Meta dedup |
| Release | SDK verze |
| In iFrame | Většinou "false" |
| Click-Only | Interní flag |
| Experiments | Interní A/B test |

**Poznámka:** Meta posílá obrovské množství `expv2[*]` parametrů — teď se slučují do jednoho
"Experiments" řádku. Navrhuji to přesunout do collapsed "Technical" kategorie.

**OTÁZKA:** Má smysl zachytávat všechny `cd[*]` parametry, nebo jen ty předem známé?
Na některých webech mohou být desítky custom `cd[*` params.

---

### 2.2 TikTok Pixel 🔲

**Current parseParams (13):**
```
Event, Timestamp, Pixel Code,
URL, Referrer,
Value, Currency, Content ID, Content Type, Content Name, Order ID, Search Query,
Click ID, User ID, Locale
```

**➕ Chybějící:**
| Param | Z JSON body | Proč |
|-------|-----------|------|
| Contents | `properties.contents` | Product list (pole objektů) |
| Quantity | `properties.quantity` | Množství |
| Description | `properties.description` | Popis |
| Phone | `context.user.phone` | Hashed PII |
| Email | `context.user.email` | Hashed PII |
| TT Pixel Cookie | `context.user.ttp` | Cookie matching |
| IP | `context.ip` | Geo |
| User Agent | `context.userAgent` | Device |
| Event ID | `properties.event_id` | Deduplikace |
| Všechny ostatní `properties.*` | dynamicky | Jádro TikTok trackingu |

**Verdikt:** Dobrý základ, ale chybí pass-through pro `properties.*`.

---

### 2.3 X (Twitter) Pixel 🔲

**Current parseParams (10):**
```
Event, Event ID, Pixel ID, Page URL, Partner, User ID, Sale Amount, Order Quantity,
Version, Type, Transaction ID
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Document Title | `tw_document_title` | Page title |
| Conversion ID | `tw_conversion_id` | Conversion dedup |
| Email Hash | `em` | User matching |
| Phone Hash | `ph` | User matching |
| First Name Hash | `fn` | User matching |
| Last Name Hash | `ln` | User matching |

**❌ Šum:**
- `Version` — většinou stejná
- `Type` — většinou stejná

---

### 2.4 Pinterest Pixel 🔲

**Current parseParams (12):**
```
Event, Event Type, Tag ID, Network Provider, GTM Version,
URL, Referrer,
Value, Currency,
Screen Resolution, Platform, Is EU,
Timestamp
```

**Poznámka:** Komplexní parsování JSON blobů `ed`, `pd`, `ad` — velmi dobrá práce.

**➕ Chybějící:**
| Param | Z `ed` JSON | Proč |
|-------|-----------|------|
| Order ID | `ed.order_id` | Purchase tracking |
| Line Items | `ed.line_items` | Product detail |
| Search Query | `ed.search_query` | Search tracking |
| Lead Type | `ed.lead_type` | Lead tracking |
| Custom Data | `ed.*` pass-through | Všechny ostatní |

**Verdikt:** Jeden z nejlépe zpracovaných social pixelů.

---

### 2.5 Reddit Pixel 🔲

**Current parseParams (8):**
```
Account ID, Event, Custom Event Name, Item Count, Value, Value (Decimal),
Currency, Products, Conversion ID
```

**Verdikt:** ✅ Kompletní pro Reddit. Malý pixel, málo params.

---

### 2.6 Snapchat Pixel 🔲

**Current parseParams (6):**
```
Event, Pixel ID, Page URL, Price, Currency, Email
```

**➕ KRITICKY chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Transaction ID | `transaction_id` | Deduplikace — SNAP HO NUTNĚ VYŽADUJE |
| Item IDs | `item_ids` | Product IDs |
| Item Category | `item_category` | Kategorie produktů |
| Number Items | `number_items` | Počet položek |
| Value | `value` | Celková hodnota (máme Price, ale chybí Value) |
| Phone Hash | `user_phone_sha256` | User matching |
| Email Hash | `user_email_sha256` | Hashed email |
| Page Title | `page_title` | Název stránky |
| UTM params | `utm_*` | Campaign tracking |
| Client IP | `client_ip_address` | Optional |

**Verdikt:** Nejhorší z major social pixelů. Potřebuje kompletní rewrite.

---

### 2.7 Spotify Pixel 🔲

**Current parseParams (3):**
```
Event, Pixel ID, GDPR
```

**Verdikt:** ✅ OK. Spotify Pixel posílá minimum dat.

---

### 2.8 Amazon Ads 🔲

**Current parseParams (5):**
```
Event, Page Type, Slot, Ref, Ad ID
```

**Verdikt:** ✅ OK pro základ. Amazon Ads pixel posílá relativně málo dat.

---
---

## SKUPINA 3: CDP / EVENT STREAMING (5 provideré)

---

### 3.1 Segment 🔲

**Current parseParams (5):**
```
Type, Event, Anonymous ID, User ID, URL
```

**➕ KRITICKY chybějící:**
| Param | Zdroj | Proč |
|-------|------|------|
| Properties | POST body `properties.*` | **JÁDRO Segmentu** |
| Traits | POST body `traits.*` | User attributes pro identify |
| Context Page URL | POST body `context.page.url` | Page context |
| Context Referrer | POST body `context.page.referrer` | Referrer |
| Campaign UTM | POST body `context.campaign.*` | Campaign |
| Integrations | POST body `integrations` | Které destinations |
| Message ID | POST body `messageId` | Dedup |
| Timestamp | POST body `timestamp` | Kdy |
| Write Key | z URL path nebo POST body | API key (už je, ale z URL) |
| User Agent | POST body `context.userAgent` | Device |
| IP | POST body `context.ip` | Geo |

**❌ Šum:**
- `URL: url` — celá API URL včetně write key v path — **bezpečnostní riziko!**

**Verdikt:** Segment je CDP — to znamená, že v POST body posílá CELÝ event payload.
Aktuálně se parsuje jen URL query string, ne JSON body. To je kritické chybějící funkcionalita.

**OTÁZKA:** Segment může posílat velmi velké JSON payloady (stovky properties).
Jak zobrazit? Jako flat `properties.klíč: hodnota`? Nebo jako JSON tree?

---

### 3.2 RudderStack 🔲

**Current parseParams (5):**
```
Type, Event, User ID, Anonymous ID, Write Key
```

**➕ Chybí:** Stejné jako Segment — RudderStack je Segment-kompatibilní.
Potřebuje JSON body parsing pro properties, traits, context.

**Verdikt:** Lepší než Segment (parsuje JSON body), ale stále chybí properties/traits.

---

### 3.3 mParticle 🔲

**Current parseParams (5):**
```
Event, Event Type, User ID, Environment, API Key
```

**➕ Chybějící:**
| Param | Z JSON body | Proč |
|-------|-----------|------|
| Custom Attributes | `events[0].data.custom_attributes` | Event data |
| User Attributes | `user_attributes` | User profile |
| Device Info | `device_info.*` | Device |
| Application Info | `application_info.*` | App |
| SDK Version | `sdk` | SDK |
| Další events | `events[1+]` | Batch — teď jen events[0] |
| Batch ID | `batch_id` | Identifikace |

---

### 3.4 Tealium iQ 🔲

**Current parseParams (4):**
```
Account, Profile, Event, URL
```

**➕ KRITICKY chybějící:**
| Param | Proč |
|-------|------|
| Všechny UDO proměnné | Tealium iQ posílá celý Universal Data Object jako query params — typicky 30-100+ parametrů |
| `tealium_event` | Event type (oddělené od iQ) |
| Page URL | `cp.url` nebo podobné |
| Referrer | `cp.referrer` |
| UTM parametry | Campaign tracking |
| `_all_` visitors | Visitor data |

**❌ Šum:**
- `URL: url` — surová celá URL

**Poznámka:** Tealium iQ request vypadá takto:
`collect.tealiumiq.com/v/i/event?tealium_account=X&tealium_profile=Y&tealium_event=page_view&cp.URL=...&cp.referrer=...&...`
Typicky 30-100+ dalších parametrů. Aktuálně zachytíme jen 4 z nich.

**Verdikt:** Jeden z nejchudších providerů. Potřebuje pass-through všech query params.

---

### 3.5 Tealium EventStream 🔲

**Current parseParams (4):**
```
Event, Visitor ID, Account, Profile
```

**➕ Chybějící:**
| Param | Proč |
|-------|------|
| Custom attributes | EventStream posílá event attributes |
| Integration data | Které integrace |
| Source connector | Z jakého zdroje |

---
---

## SKUPINA 4: ANALYTICS PLATFORMS (10 provideré)

---

### 4.1 Amplitude 🔲

**Current parseParams (6):**
```
Event, User ID, Device ID, Session ID, API Key, Revenue, URL
```

**➕ Chybějící:**
| Param | Z JSON body | Proč |
|-------|-----------|------|
| Event Properties | `events[0].event_properties.*` | **JÁDRO Amplitude** |
| User Properties | `events[0].user_properties.*` | **JÁDRO Amplitude** |
| Groups | `events[0].groups` | Account-level |
| Plan | `events[0].plan.*` | Taxonomy |
| IP | `events[0].ip` | Geo |
| Country | `events[0].country` | Geo |
| Region | `events[0].region` | Geo |
| City | `events[0].city` | Geo |
| DMA | `events[0].dma` | US DMA |
| Language | `events[0].language` | Jazyk |
| Platform | `events[0].platform` | Web/Mobile |
| OS | `events[0].os_name` + `os_version` | Device |
| Device Brand | `events[0].device_brand` | Device |
| Device Model | `events[0].device_model` | Device |
| Version Name | `events[0].version_name` | App verze |

**❌ Šum:**
- `URL: url` — celá API URL

**Verdikt:** Amplitude má velmi bohaté JSON body s event_properties a user_properties.
Tyto jsou absolutně klíčové a momentálně se vůbec nezobrazují.

---

### 4.2 Mixpanel 🔲

**Current parseParams (4):**
```
Event, Distinct ID, Token, URL
```

**Poznámka:** Parsuje base64-encoded `data` parametr — dobrý přístup.
Ale nerozbaluje `properties.*` z decoded JSON.

**➕ Chybějící:**
| Param | Z base64 JSON | Proč |
|-------|-------------|------|
| Properties.* | `properties.*` | **JÁDRO Mixpanelu** |
| Browser | `properties.$browser` | Device |
| OS | `properties.$os` | Device |
| Device | `properties.$device` | Device |
| Referrer | `properties.$referrer` | Acquisition |
| Referring Domain | `properties.$referring_domain` | Acquisition |
| City | `properties.$city` | Geo |
| Region | `properties.$region` | Geo |
| Country Code | `properties.mp_country_code` | Geo |
| Time | `properties.time` | Timestamp |
| Source | `properties.$source` | Event source |
| Initial Referrer | `properties.$initial_referrer` | First visit |
| Search Engine | `properties.$search_engine` | Organic |

**⚠️ `URL`:** `currentUrl ?? url` — pokud je to `$current_url`, je to page URL (OK).
Pokud je to `url` (API endpoint), je to šum. Ale kód to řeší správně — priorita `$current_url`.

---

### 4.3 Matomo 🔲

**Current parseParams (7):**
```
Site ID, Action, URL, Event Category, Event Action, Event Name, Revenue, User ID
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| E-commerce ID | `ec_id` | E-commerce order |
| E-commerce Items | `ec_items` | Product list (JSON) |
| Goal ID | `idgoal` | Goal tracking |
| Revenue Subtotal | `ec_st` | Subtotal |
| Revenue Tax | `ec_tx` | Tax |
| Revenue Shipping | `ec_sh` | Shipping |
| Revenue Discount | `ec_dt` | Discount |
| Campaign Name | `_rcn` | Campaign |
| Campaign Keyword | `_rck` | Campaign keyword |
| Search Category | `search_cat` | Site search |
| Search Count | `search_count` | Site search |
| Custom Variable | `cvar` | Custom vars JSON |
| Dimension | `dimension[1-9]+` | Custom dimensions |
| UID | `uid` | ✅ Už je |

**Verdikt:** Solidní základ, ale chybí e-commerce detail a custom dimensions.

---

### 4.4 Piwik PRO TM 🔲

**Current parseParams (1):**
```
URL
```

**❌ Šum:** `URL: url` — jediný parametr. Provider má nulovou hodnotu.

**➕ Jediné možné:**
| Param | Zdroj | Proč |
|-------|------|------|
| Container ID | z URL path `piwik.pro/{account}/{container}.js` | Jediné rozumné info |

**Verdikt:** Nejhorší provider. TM load request má jen URL path, žádné query params.
Ale extrakce container ID z path by dala alespoň nějakou hodnotu.

---

### 4.5 Piwik PRO 🔲

**Current parseParams (7):**
```
Site ID, Action, URL, Event Category, Event Action, Event Name, User ID
```

**➕ Chybí:** Podobné jako Matomo — e-commerce, dimensions, search.

---

### 4.6 AT Internet 🔲

**Current parseParams (6):**
```
Site Name, Level 2, Page, Campaign, Hit Type, Click
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Referrer | `ref` | Odkud uživatel přišel |
| Visitor ID | `idclient` | Identifikace |
| User ID | `uid` | UserID |
| Custom Object | `xto` | Campaign detail |
| E-commerce | `cmd` | E-commerce |
| Product View | `pview` | Product |
| Goal | `gclick` | Goal |

---

### 4.7 Parse.ly 🔲

**Current parseParams (5):**
```
URL, Referrer, Action, Site ID, Timestamp
```

**Verdikt:** ✅ OK. Parse.ly posílá minimum params.

---

### 4.8 Webtrends 🔲

**Current parseParams (5):**
```
Site Name, Scene, URI, Server, Visitor ID
```

**Verdikt:** ✅ OK. Webtrends posílá minimum.

---

### 4.9 Comscore 🔲

**Current parseParams (16+):**
```
Type, Client ID, Version, Integration Type, Page URL, Page Title, Referrer,
Timestamp, GDPR, GDPR Purposes, GDPR LI, GDPR Country,
Campaign ID, Fingerprint ID, Config, Segment
+ extra c* params (pass-through)
```

**Poznámka:** Správný pass-through vzor — známé params s labels + extra `c*` params.

**⚠️ Možný šum:**
- `Timestamp` (`ns__t`) — cache buster / timestamp
- Extra `c*` params — mohou být desítky kryptických parametrů

**Verdikt:** Dobrý vzor pass-through. Inspirace pro další provideré.

---

### 4.10 Scorecard 🔲

**Current parseParams (4):**
```
Publisher, Site, Segment, URL
```

**⚠️ Poznámka:** `URL: rn` — tohle vypadá jako cache buster (rn = random number), ne page URL!
Pokud je to `rn`, je to šum, ne page URL.

---
---

## SKUPINA 5: SESSION REPLAY / UX (6 provideré)

---

### 5.1 Hotjar 🔲

**Current parseParams (1):**
```
Site ID
```

**➕ Chybějící:** Hotjar posílá komprimovaná/binární data.
Z URL by šlo vytáhnout:
| Param | Zdroj | Proč |
|-------|------|------|
| User ID | URL path nebo query | Identifikace |
| Session ID | URL path | Session |
| Hotjar Version | URL path | Verze |

**Verdikt:** Omezené daty. Minimální, ale víc z URL pravděpodobně nejde rozumně vytáhnout.

---

### 5.2 Microsoft Clarity Tag 🔲

**Current parseParams (3):**
```
Project ID, Request Type, _eventName
```

**Verdikt:** ✅ Perfektní pro library load.

---

### 5.3 Microsoft Clarity 🔲

**Current parseParams (30+):**
```
Version, Project ID, User ID, Session ID, Page Number, Sequence, Duration (ms),
Upload Type, Is Last Payload, Platform, Page URL,
Event Count, Event Types,
+ Click, Scroll, DoubleClick, Custom Event, Ping, Input, Visibility, Navigation,
  ScriptError, Form Submit, Consent, Metric: *, Dim: *, Variable: *, Upload, Upgrade, Limit
+ _eventName
```

**Poznámka:** 369 řádků dekódovací logiky. Nejlepší provider v projektu.

**⚠️ Potenciální šum:**
- `Ping [n]` — opakuje se každých pár vteřin. Při dlouhé session desítky ping eventů.
- `Upload [n]` — interní diagnostics
- `Limit [n]` — interní limity

**❌ Šum při fallback:**
- `URL: url` — jen pokud payload nelze parsovat (gzip). V ten moment je to OK jako fallback.

**Verdikt:** Vzorový provider. Jediný návrh — možnost filtrovat/sbalit Ping eventy.

---

### 5.4 FullStory 🔲

**Current parseParams (3):**
```
User ID, Display Name, Email
```

**Verdikt:** ✅ OK. FullStory posílá identifikaci uživatele, což je nejdůležitější.

---

### 5.5 Crazy Egg 🔲

**Current parseParams (2):**
```
Account ID, Page URL
```

**Verdikt:** ✅ OK. Minimum, ale Crazy Egg posílá minimum užitečných dat.

---

### 5.6 Glassbox 🔲

**Current parseParams (3):**
```
Session ID, Customer ID, Page URL
```

**Verdikt:** ✅ OK.

---

### 5.7 Medallia DXA 🔲

**Current parseParams (3):**
```
Event, Session ID, Site ID
```

**Verdikt:** ✅ OK.

---
---

## SKUPINA 6: A/B TESTING (4 provideré)

---

### 6.1 Optimizely 🔲

**Current parseParams (6):**
```
User ID, Account ID, Project ID, Experiment ID, Variation ID, Event, Revenue
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Campaign ID | `campaignId` | Campaign |
| Variation Name | z POST body | Lidský název |
| Experiment Name | z POST body | Lidský název |
| Event Properties | z POST body | Event data |

**Poznámka:** Optimizely posílá data v JSON POST body. Aktuálně se parsuje jen URL.
Měl by se přidat JSON body parsing.

---

### 6.2 Dynamic Yield 🔲

**Current parseParams (4):**
```
DY ID, Session ID, Event, Section
```

**Verdikt:** ✅ OK. Malý provider.

---

### 6.3 Omniconvert 🔲

**Current parseParams (3):**
```
Event, Experiment ID, Variation ID
```

**Verdikt:** ✅ OK. Minimum.

---

### 6.4 Split.io 🔲

**Current parseParams (4):**
```
Event, Key, Traffic Type, Value
```

**Poznámka:** Správně parsuje JSON POST body.

**Verdikt:** ✅ OK.

---
---

## SKUPINA 7: ADOBE STACK (8 provideré)

---

### 7.1 Adobe Server-Side (AEP Web SDK) 📦

**Current parseParams (30+):**
```
Datastream ID, Request type, Event type,
Page name, Page URL, Channel, Server, Events, Link name, Link type, Campaign, Referrer,
+ eVars (1-250), Props (1-75), Lists (1-3),
ECID,
Screen, Screen orient
```

**➕ Chybějící:**
| Param | Z XDM | Proč |
|-------|-------|------|
| Timestamp | `xdm.timestamp` | Kdy |
| eventType description | `xdm.eventType` | Lidský popis typu |
| Browser | `xdm.environment.browserDetails.*` | Browser |
| OS | `xdm.environment.operatingSystem` | OS |
| Place Context | `xdm.placeContext.*` | Geo |
| Product List Items | `xdm.productListItems[]` | E-commerce |
| Commerce | `xdm.commerce.*` | Purchase/checkout |
| Identity Map (full) | `xdm.identityMap.*` | Všechny identity |
| Target Data | `data.__adobe.target.*` | Target integration |
| AAM Data | `data.__adobe.aam.*` | AAM integration |

**❌ Šum:**
- `Screen orient` — nízká hodnota

---

### 7.2 Adobe Heartbeat 🔲

**Current parseParams (4):**
```
Event Type, Stream Name, Channel, Stream ID
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Publisher | `s:sp:pub` | Publisher |
| SDK Version | `s:sp:sdk` | SDK |
| Player Name | `s:sp:pln` | Player |
| Video Length | `s:sp:len` | Délka videa |
| Bitrate | `s:sp:brt` | Kvalita |
| FPS | `s:sp:fps` | Frame rate |
| Ad Length | `s:sp:ad:len` | Ad info |

**Verdikt:** Heartbeat posílá poměrně dost params. Aktuálně zachycujeme jen 4.

---

### 7.3 Adobe Target 🔲

**Current parseParams (6):**
```
Mbox, Session ID, TNT ID, MCID, Host, Page URL
```

**➕ KRITICKY chybějící:**
| Param | Zdroj | Proč |
|-------|------|------|
| Client Code | URL path | Account |
| Request ID | POST body `request.id` | Identifikace |
| Context | POST body `context.*` | Browser/page info |
| Execute Mboxes | POST body `execute.mboxes[]` | Jaké mboxy se vykonaly |
| Prefetch | POST body `request.prefetch.*` | Prefetched content |
| Experience | POST body `experience.*` | Zobrazená experience |
| Offers | POST body `offers[]` | Vrácené offers |

**Poznámka:** Adobe Target posílá **komplexní JSON POST body** s mboxes, experiences, offers.
Aktuálně parsujeme jen URL query string. To je kritické chybějící funkcionalita pro Target debugging.

---

### 7.4 Adobe ECID 🔲

**Current parseParams (4):**
```
MID, Org ID, Version, Response
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Blob | `d_blob` | ECID blob (pokud není v AAM path) |
| Device Co-op | `dpv` | Device co-op version |
| Platform Type | `d_ptype` | Platform |
| Region | `dcs_region` | Data center |

---

### 7.5 Adobe AAM 📦

**Current parseParams (20+):**
```
Request Type, Account,
+ STANDARD_PARAMS s labels (caller, callback, cid, ciic, coppa, cts, dpid, dpuuid, dst, ...),
+ Experience Cloud ID,
+ d_* params s labels (Blob, Org ID, Version),
+ c_* pass-through,
+ p_* pass-through
```

**Poznámka:** Velmi dobrý přístup — labels pro známé, pass-through pro zbytek.

**⚠️ Šum:**
- `c_*` params — mohou být desítky kryptických parametrů
- `p_*` params — stejné

**Verdikt:** Dobrý vzor. Jedna z mála "pass-through" implementací, která funguje.

---

### 7.6 Adobe DTM 🔲

**Current parseParams (3):**
```
Org ID (partial), Property hash, URL
```

**❌ Šum:** `URL: url`

**Poznámka:** DTM je legacy (nahrazeno Launch/Tags). Tento request je jen library load —
nemá query params kromě URL. Org ID a Property hash jsou extrahovány z URL path (dobré).

**Verdikt:** Přijatelný, ale odstranit `URL: url`.

---

### 7.7 Adobe Launch (CN) 🔲

**Current parseParams (3):**
```
Type, Environment, Library ID, URL
```

**❌ Šum:** `URL: url`

**Verdikt:** Dobré (extrakce z URL path). Odstranit `URL: url`.

---

### 7.8 Adobe Client-Side (AA) 📦

**Current parseParams (20+):**
```
Hit type, Report suite, Page name, Page URL, Referrer, Visitor ID,
Events, Products, Campaign, Channel, Server, Link name, Link URL,
Resolution, Color depth, JavaScript ver, AppMeasurement,
+ eVars (1-250), Props (1-75),
+ Context data (JSON)
```

**Poznámka:** Hybridní vzor — whitelist základní + loop eVars/props + context data.
Jeden z lépe zpracovaných Adobe providerů.

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| List Variables | `list1`–`list3` | V kategoriích jsou, ale v parseParams chybí explicitní zpracování |
| Hierarchies | `h1`–`h5` | Hierarchical variables |
| Action | `pe` → `lnk_o/d/e` | Už řešeno jako Hit type ✓ |
| Browser Height | `bh` | Viewport |
| Browser Width | `bw` | Viewport |
| Web Browser | `b` | Browser type |

**❌ Šum:**
- `Resolution` — nízká hodnota (už má kategorii s defaultExpanded: false)
- `Color depth` — nízká hodnota
- `JavaScript ver` — nízká hodnota

---
---

## SKUPINA 8: MARKETING / DSP (13 provideré)

---

### 8.1 Bing Ads (UET) 📦

**Current parseParams (14):**
```
Event, Tag ID, Tag Manager, UET Version,
URL, Page Title, Referrer,
Machine ID, Session ID, Visit ID, Click ID,
Screen Resolution, Color Depth, Language,
Load Time, Consent
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Goal Value | `gv` | Conversion value |
| Goal Currency | `gc` | Měna |
| Event Category | `ec` | Custom events |
| Event Action | `ea` | Custom events |
| Event Label | `el` | Custom events |
| Event Value | `ev` | Custom events |
| E-commerce revenue | `revenue` | Revenue |
| E-commerce items | `items` | Product data |
| Page View ID | `pvid` | Page view |
| UID | `uid` | User ID |

**⚠️ Šum:**
- `Color Depth` — irelevantní
- `Language` — nízká hodnota

---

### 8.2 The Trade Desk 🔲

**Current parseParams (5):**
```
Advertiser ID, Universal Pixel ID, Value, Order ID, URL
```

**❌ Šum:** `URL: url`

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Transaction | `tda` | Dedup |
| Match ID | `tm` | User matching |
| Conversion Type | `tdu` | Conversion type |
| Custom Data | `tx`, `ty` | Custom tracking |

---

### 8.3 Adform 🔲

**Current parseParams (15):**
```
Tracking ID, Page Name, Tracking Mode, Order ID, Conversion Value, Banner ID,
Page URL, Referrer, Language, Resolution, Color Depth,
Custom Var 1-5, GDPR, GDPR Consent, Cache Buster, URL
```

**❌ Šum:**
- `Cache Buster` (`ord`) — náhodné číslo
- `URL: url` — surová URL
- `Language` — nízká hodnota
- `Resolution` — nízká hodnota
- `Color Depth` — nízká hodnota

**➕ Chybějící:** Nic významného — Adform je docela kompletní.

---

### 8.4 DoubleClick 🔲

**Current parseParams (5):**
```
Advertiser ID, Activity Type, Activity, Click ID, Order ID
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Quantity | `qty` | Množství |
| Revenue | `cost` | Revenue value |
| Custom Variables | `u1`–`u50` | **Velmi důležité** pro Floodlight debugging |
| Transaction | `tran` | Transaction ID |
| Device ID | `dc_lat`, `dc_rdid` | ID matching |
| Match Item | `match` | Item matching |
| Tag Type | `tag` | Floodlight tag type |

**Poznámka:** `u1`–`u50` jsou custom Floodlight variables — velmi často používané
pro kampaňový tracking. Měly by být v outputu.

---

### 8.5 Criteo 🔲

**Current parseParams (3):**
```
Account, Event, URL
```

**❌ Šum:** `URL: url`

**➕ KRITICKY chybějící:**
| Param | Proč |
|-------|------|
| Product IDs (`item`) | Jaké produkty |
| Price | Cena |
| Transaction ID | Deduplikace |
| Customer Email | Hashed PII |
| Quantity | Množství |
| `dp` params | Criteo data layer |

**Verdikt:** Jeden z nejchudších marketing providerů.

---

### 8.6 HubSpot 🔲

**Current parseParams (6):**
```
Hub ID, Event, Page URL, Page Title, Campaign, Source
```

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| User Token | `hutk` | HubSpot user token |
| Session Count | `hssc` | HubSpot session |
| Long-term Cookie | `hstc` | HubSpot tracking |
| Page View Dedup | `_n` | Dedup |
| Form Fields | z POST body | Při form submissions |

---

### 8.7 Outbrain 🔲

**Current parseParams (4):**
```
Event, Click ID, Order Value, Currency
```

**Verdikt:** ✅ OK. Malý pixel.

---

### 8.8 Teads 🔲

**Current parseParams (3):**
```
Event, Pixel ID, Time on Site
```

**Verdikt:** ✅ OK.

---

### 8.9 RTB House 🔲

**Current parseParams (3):**
```
Event, User ID, Category
```

**Verdikt:** ✅ OK.

---

### 8.10 Zemanta 🔲

**Current parseParams (3):**
```
Event, Campaign ID, Order ID
```

**Verdikt:** ✅ OK.

---

### 8.11 Sojern 🔲

**Current parseParams (3):**
```
Event, Partner ID, Type
```

**Verdikt:** ✅ OK.

---

### 8.12 Vibes 🔲

**Current parseParams (2):**
```
Event, Campaign ID
```

**Verdikt:** ✅ OK.

---

### 8.13 Invoca 🔲

**Current parseParams (3):**
```
Event, Transaction ID, Campaign ID
```

**Verdikt:** ✅ OK.

---

### 8.14 Brevo 🔲

**Current parseParams (3):**
```
Event, Contact ID, Email
```

**Verdikt:** ✅ OK.

---
---

## SKUPINA 9: VISITOR IDENTIFICATION / ABM (3 provideré)

---

### 9.1 LinkedIn 🔲

**Current parseParams (3):**
```
Partner ID, Conversion, URL
```

**❌ Šum:** `URL: url`

**➕ Chybějící:**
| Param | Klíč | Proč |
|-------|-----|------|
| Conversion Hash | `ch` | Pro konverzní tracking |
| Time | `time` | Timestamp |
| Conversion ID | `_litr` | Conversion tracking |
| Version | `v` | Verze |
| Page URL | z referrer nebo context | Kde se stalo |

**Verdikt:** Velmi chudý pro major platformu.

---

### 9.2 Demandbase 🔲

**Current parseParams (4):**
```
Company ID, Company, Key, Page Type
```

**Verdikt:** ✅ OK.

---

### 9.3 6Sense 🔲

**Current parseParams (4):**
```
Company ID, Domain, Token, IP
```

**Verdikt:** ✅ OK.

---
---

## SKUPINA 10: CUSTOMER ENGAGEMENT / CRM (3 provideré)

---

### 10.1 Braze 🔲

**Current parseParams (5):**
```
App ID, Event, User ID, Session ID, SDK Version
```

**Poznámka:** Parsuje JSON body pro event name — dobré.

**➕ Chybějící:**
| Param | Z JSON body | Proč |
|-------|-----------|------|
| Event Properties | `events[0].properties.*` | Event data |
| User Attributes | `attributes.*` | User profile |
| Purchase Properties | `purchases[0].properties.*` | Purchase data |
| Platform | z body | Web/Mobile |

---

### 10.2 Lytics 🔲

**Current parseParams (4):**
```
Event, User ID, URL, Client ID
```

**⚠️ Poznámka:** `URL: p.url` — pokud je to page URL, je to OK (není šum).

---

### 10.3 Indicative 🔲

**Current parseParams (3):**
```
Event, User ID, API Key
```

**➕ Chybějící:**
| Param | Z JSON body | Proč |
|-------|-----------|------|
| Properties | body `properties.*` | Event properties |
| Event Name | už je ✓ | — |

---
---

## SKUPINA 11: TAG MANAGERS (1 provider)

---

### 11.1 Ensighten 🔲

**Current parseParams (3):**
```
Bootstrap, Client, Space
```

**Verdikt:** ✅ OK pro tag manager.

---
---

## SKUPINA 12: OSTATNÍ (2 provideré)

---

### 12.1 Seznam Sklik 🔲

**Current parseParams (6):**
```
Type, ID, Value, Page URL, Consent, User ID, URL
```

**❌ Šum:** `URL: url`

**Verdikt:** Jinak OK. JSON parsing `ids` pro udid — dobré.

---

### 12.2 Merkury 🔲

**Current parseParams (3):**
```
Event, Merkury ID, Segment
```

**Verdikt:** ✅ OK.

---
---

## SUMMARY: PRIORITY MATRIX

### Kritické (největší dopad na uživatele):

| # | Provider | Problém | Typ úpravy |
|---|----------|---------|-----------|
| 1 | **Segment** | JSON body parsing chybí úplně | ➕ Kompletní |
| 2 | **Tealium iQ** | Zachycuje 4 z 30-100+ params | ➕ Pass-through |
| 3 | **Adobe Target** | JSON body parsing chybí úplně | ➕ Kompletní |
| 4 | **Amplitude** | Properties chybí úplně | ➕ Kompletní |
| 5 | **Mixpanel** | Properties chybí úplně | ➕ Kompletní |
| 6 | **Snapchat** | Zachycuje 6 z ~15+ params | ➕ Rewrite |
| 7 | **GA4** | Chybějící ecommerce + campaign | ➕ Přidat |

### Rychlé wins (odstranění šumu):

| # | Provider | Co odstranit |
|---|----------|-------------|
| 1 | **13 providerů** | `URL: url` — surová URL |
| 2 | **Adform** | `Cache Buster` |
| 3 | **Meta** | `Ordinal`, `Release`, `Last Event Result`, `In iFrame`, `Click-Only` |
| 4 | **Scorecard** | `URL: rn` (je to random number, ne URL) |

### Kategorizace (kde by pomohla):

| Provider | Proč |
|----------|------|
| TikTok | 13+ params bez strukturace |
| Pinterest | 12+ params bez strukturace |
| Google Ads | 22+ params bez strukturace |
| Bing Ads | 14+ params bez strukturace |
| Adobe Target | Po přidání JSON body |
| Amplitude | Po přidání properties |
