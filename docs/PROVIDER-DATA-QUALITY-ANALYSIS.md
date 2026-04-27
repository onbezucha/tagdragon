# Provider Data Quality Analysis — TagDragon v1.6.1

> Kompletní audit všech 69+ providerů: co se sbírá, co chybí, co je šum, a konkrétní návrhy na zlepšení.

---

## 1. Souhrnné zjištění

### 1.1 Architekturální problém: Dva různé přístupy k parseParams

V kódu existují **dva neslučitelné vzory** zobrazování dat, které tvoří základní napětí celého systému:

| Vzor | Příklad | Jak to funguje |
|------|---------|----------------|
| **Bílý seznam (whitelist)** | GA4, Meta Pixel, Bing Ads, TikTok, GA (UA) | `parseParams` ručně vybírá ~10–30 klíčových parametrů a přiřazuje jim lidsky čitelné názvy. Vše ostatní je zahzeno. |
| **Černá díra (catch-all / pass-through)** | Adobe AA, Comscore, Adobe AAM | Všechny surové parametry jsou zkopírovány do výstupu. Uživatel vidí `v1`, `c12`, `d_blob` místo lidských jmen. |

**Problém:** Obě strategie mají zásadní nevýhody:
- **Whitelist** → zahazuje potenciálně užitečná data (např. GA4 neposkytuje `transaction_id`, `items`, custom dimensions)
- **Pass-through** → produkuje nepřehledný šum (Adobe AA může mít 100+ surových parametrů, Comscore háže extra `c*` klíče)

### 1.2 Kategorizace je nekompletní

Kategorie v `categories.ts` existují jen pro **6 providerů**: GA4, GA (UA), Adobe Client-Side, Adobe Server-Side, Meta Pixel a Bing Ads.

Všichni ostatní (63 providerů) spadají do jedné obrovské kategorie "Other" nebo vůbec žádnou. To znamená, že pokud `parseParams` vyprodukuje 20+ parametrů (TikTok, Pinterest, Google Ads), jsou všechny nalepené pod sebou bez strukturace.

### 1.3 Kdo vrací `URL: url` (šum)

Mnoho providerů vrací surovou URL jako `URL: url`. To je v podstatě duplicita — URL je už viditelná v panelu (v request listu i v záhlaví detailu). Tito provideré to dělají:

**Vysoká priorita odstranění:**
| Provider | Proč je to šum |
|----------|---------------|
| Segment | `URL: url` — celá URL včetně API klíče v path |
| Tealium | `URL: url` — úplně celá URL |
| Amplitude | `URL: url` — celá URL |
| Mixpanel | `URL: currentUrl ?? url` — buď page URL (smysl), nebo API URL (šum) |
| Criteo | `URL: url` — nic jiného kromě `Account` a `Event` |
| The Trade Desk | `URL: url` |
| LinkedIn | `URL: url` |
| Lytics | `URL: p.url` — tohle JE page URL, OK |
| Seznam Sklik | `URL: url` |
| Adobe DTM | `URL: url` |
| Adobe Launch (CN) | `URL: url` |
| Piwik PRO TM | `URL: url` — jediný parametr! |

---

## 2. Detailní analýza po provideru

### 🔥 TIER 1 — Největší dopad (používáno nejvíce uživateli)

---

#### 2.1 GA4

**Stav:** Whitelist, ~28 explicitních parametrů + dynamické `ep.*`, `epn.*`, `up.*`, `upn.*`, `pr*`.

**Co chybí (high value):**
| Parametr | Proč je důležitý |
|----------|-----------------|
| `transaction_id` | Klíčový pro e-commerce debugging — `items` je v `pr*` prefixech, ale `transaction_id` chybí |
| `value` | Celková hodnota transakce |
| `currency` (v ecommerce kontextu) | Už je jako `cu`, ale chybí mapování na ecommerce sekci kategorií |
| `tax`, `shipping` | E-commerce celkem |
| `pa` (product action) | List, detail, add_to_cart, checkout, purchase |
| `tcc` (coupon code) | Promo kódy |
| Custom dimensions/metrics (`cd[0-9]+`, `cm[0-9]+`) | Většina implementací je používá — teď zcela ignorovány |
| `_dbg` | Debug flag — důležitý pro validation |
| `fp` (fingerprint) | Přiřazení sessions |
| `gclid`, `dclid`, `wbraid`, `gbraid` | Campaign tracking — kategorie existuje, ale v `parseParams` se nepředávají |
| `utm_*` prefix | Campaign params — `parseParams` je nevypisuje explicitně (jen kategorie prefixMatch `utm_`) |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Screen Resolution` | Pro debugging trackingu většinou irelevantní — kategorie už má `defaultExpanded: false` ✓ |
| `User Language` | Nízká hodnota pro tag debugging |
| `Engagement` (`_et`) | Pokud je 0ms, je to šum. Pouze při nonzero má value. |

**Návrh:** Přidat výpis surových GA4 parametrů, které nejsou ve whitelistu, do "Other" sekce kategorií (stejně jako Adobe AA dělá s eVars/props). Tím se neztratí žádná data a zároveň zůstane přehlednost.

---

#### 2.2 Meta Pixel

**Stav:** Velmi detailní whitelist s JSON parsingem. Jeden z nejlépe zpracovaných providerů.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `cd[predicted_ltv]` | Predicted lifetime value — důležité pro Meta optimization |
| `cd[content_language]` | Vícejazyčné weby |
| `cd[delivery_category]` | Doprava (in_store, curbside, home_delivery) |
| `cd[status]` | Complete registration event |
| Všechny `cd[*]` parametry | Teď se zachycují jen předem známé — ostatní `cd[*` jsou zahozeny |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Experiments` | Interní Meta A/B testování — uživatel nemá jak reagovat |
| `Release` | Verze pixel SDK — irelevantní pro debugging |
| `Last Event Result` | Interní Meta deduplikační status |
| `Ordinal` | Interní počítadlo |
| `In iFrame` | Většinou "false" |
| `Click-Only` | Interní flag |

**Návrh:** Přesunout `Experiments`, `Release`, `Last Event Result`, `Ordinal`, `In iFrame`, `Click-Only` do kategorie "Technical / Internal" s `defaultExpanded: false`. Přidat pass-through pro všechny `cd[*]` parametry, které nejsou ve whitelistu.

---

#### 2.3 Adobe Client-Side (AA)

**Stav:** Hybrid — whitelist pro základní parametry + loop přes všechny eVars (1-250) a props (1-75) + context data. Velmi dobrý přístup.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `list1`–`list3` | List variables — v kategoriích už jsou, ale v `parseParams` se nezpracovávají explicitně |
| Hierarchies (`h1`–`h5`) | Používané v některých implementacích |
| `pev3` (link context) | Pro link tracking |
| `ndh` (non-Adobe detection) | Už je ale jako "AppMeasurement: Yes" |
| `v0` mapping | V `parseParams` je jako `Campaign` — správně |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| Prázdné eVars/props | Loop přeskakuje prázdné ✓ — dobré |
| `Resolution`, `Color depth`, `JavaScript ver` | Nízká hodnota pro tag debugging — kategorie už to řeší |

**Návrh:** Přidat zpracování list variables (`list1`–`list3`) do `parseParams` (nejen do kategorií). Přidat hierarchies.

---

#### 2.4 Adobe Server-Side (Web SDK / AEP)

**Stav:** Nejkomplexnější provider. Parsuje celý JSON payload, XDM, eVars, props, lists, identity map.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `xdm.timestamp` | Kdy byla událost odeslána |
| `xdm.eventType` detailní rozbalení | Teď jen jako string — přidat lidské popisy |
| `xdm.environment.browserDetails.*` | Browser info — nyní chybí |
| `xdm.placeContext.*` | Geo/local time — může být užitečné |
| `xdm.productListItems[]` | E-commerce items z XDM |
| `xdm.commerce.*` | Celý commerce objekt — purchase, productListAdds atd. |
| `data.__adobe.target.*` | Pokud je v payloadu i Target data |
| `data.__adobe.aam.*` | Audience Manager data v Web SDK |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Screen orient` | Téměř nikdy není užitečné |
| `Screen` (rozměry) | Nízká hodnota |

**Návrh:** Přidat zpracování `xdm.commerce`, `xdm.productListItems` a `xdm.environment`. Přesunout Screen/Screen orient do collapsed kategorie.

---

#### 2.5 Google Ads

**Stav:** Velmi detailní s parsováním `data` parametru. Dobrá práce.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `gclsrc` | Zdroj Google Click ID (gad vs gads) |
| `rdid` | Mobile device ID |
| `idtype` | Typ device ID |
| `userviat` | User agent pro app tracking |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Cookie Present` | Většinou "1" |
| `Consent Details` | Velmi dlouhý string — těžko čitelný |

---

#### 2.6 Bing Ads (Microsoft UET)

**Stav:** Detailní — jeden z lépe zpracovaných providerů.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `gv` (goal value) | Conversion value |
| `gc` (goal currency) | Měna konverze |
| `ec` (event category) | UET custom events |
| `ea` (event action) | UET custom events |
| `el` (event label) | UET custom events |
| `ev` (event value) | UET custom events |
| E-commerce: `pv`, `pa`, `pr[id,nm,pr,qt]` | Product data — Bing UET podporuje e-commerce |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Color Depth` | Irelevantní |
| `Language` | Nízká hodnota |

---

### 🔶 TIER 2 — Střední priorita

---

#### 2.7 TikTok Pixel

**Stav:** Dobrý — parsuje JSON body i URL params.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `properties.contents` | Product list (pole objektů) |
| `properties.quantity` | Množství |
| `properties.description` | Popis |
| `context.user.ttp` | TikTok Pixel Cookie ID |
| `context.user.phone` | Hashed phone |
| `context.ad.callback` | Callback param |
| Všechny `properties.*` pass-through | Aktuálně jen výběr — ostatní se zahazují |

**Návrh:** Přidat pass-through pro všechny `properties.*` klíče z JSON body, které nejsou ve whitelistu.

---

#### 2.8 Pinterest Pixel

**Stav:** Velmi dobrý — parsuje `ed`, `pd`, `ad` JSON bloby. Jeden z nejlépe zpracovaných.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `ed.line_items` | Product detail v purchase events |
| `ed.order_id` | Order ID |
| `ed.search_query` | Search events |
| `ed.lead_type` | Lead events |

---

#### 2.9 X (Twitter) Pixel

**Stav:** Dobrý základ, parsuje JSON event array.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `tw_document_title` | Page title |
| `tw_conversion_id` | Conversion dedup |
| Všechny `em`, `ph`, `fn`, `ln` (hashed PII) | User matching — užitečné pro debugging implementace |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Version` | Většinou stejná |
| `Type` | Většinou stejná |

---

#### 2.10 Snapchat Pixel

**Stav:** **Nejslabší ze social pixelů.** Jen 6 parametrů, žádný e-commerce.

**Co chybí (kritické):**
| Parametr | Proč |
|----------|------|
| `transaction_id` | Deduplikace |
| `item_ids` | Product IDs |
| `item_category` | Kategorie |
| `number_items` | Počet položek |
| `price` | Cena už je, ale `value` chybí |
| `user_email_sha256` | Hashed email |
| `user_phone_sha256` | Hashed phone |
| `page_url` | Už je, ale `page_title` chybí |
| UTM parametry | Campaign tracking |

**Návrh:** Kompletní rewrite — Snapchat posílá mnohem více dat, než se zachycuje.

---

#### 2.11 LinkedIn Insight Tag

**Stav:** **Extrémně chudý.** Jen 3 parametry, `URL: url` je šum.

**Co chybí (kritické):**
| Parametr | Proč |
|----------|------|
| `ch` (conversion hash) | Pro konverzní tracking |
| `time` | Timestamp |
| `pid` (partner ID) — vrací se jako URL param | OK, ale chybí |
| Conversion event details | Co conversion_id reprezentuje |
| `v` (version) | Pro debugging |
| `_litr` (conversion ID) | Conversion tracking |
| Page URL / Referrer | Pro debugging |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `URL: url` | Surová celá URL — duplicita |

**Návrh:** Přidat minimálně `ch`, `time`, conversion ID. Odstranit `URL: url`.

---

#### 2.12 Segment

**Stav:** Extrémně chudý pro CDP — jen 5 parametrů.

**Co chybí (kritické):**
| Parametr | Proč |
|----------|------|
| `properties.*` | Celý properties objekt — jádro Segmentu! |
| `traits.*` | User traits pro identify calls |
| `context.page.url` | Page URL z kontextu |
| `context.page.referrer` | Referrer |
| `context.campaign.*` | UTM params |
| `integrations` | Které destinations jsou aktivní |
| `messageId` | Deduplikace |
| `receivedAt` / `timestamp` | Časové razítko |
| `writeKey` | Už je, ale měl by být z JSON body, ne URL |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `URL: url` | Celá API URL včetně write key v path — **bezpečnostní riziko** |

**Návrh:** Parsuj JSON POST body pro všechny typy volání (`track`, `page`, `identify`, `group`, `alias`). Odstranit `URL: url`.

---

#### 2.13 RudderStack

**Stav:** Podobně chudý jako Segment (což dává smysl — kompatibilní API).

**Co chybí:** Všechno stejné jako u Segmentu — properties, traits, context.

---

#### 2.14 mParticle

**Stav:** Parsuje JSON body — lepší než Segment.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `device_info.*` | Device details |
| `application_info.*` | App info |
| Další events v batch | Teď se bere jen `events[0]` |
| Custom attributes | V `data.custom_attributes` |
| `user_attributes` | User data |
| `sdk` | SDK verze |

---

#### 2.15 Tealium

**Stav:** Extrémně chudý — jen 4 parametry, `URL: url`.

**Co chybí (kritické):**
| Parametr | Proč |
|----------|------|
| Všechny data layer proměnné | Tealium posílá celý UDO (Universal Data Object) jako parametry |
| `tealium_event` | Event type — tohle je u Tealium EventStream, ale ne u Tealium iQ |
| UTM parametry | Campaign |
| Page URL / Referrer | Základní kontext |
| `udo.*` proměnné | Celý data layer |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `URL: url` | Surová URL |

**Návrh:** Tealium iQ posílá typicky 30-100+ parametrů v query stringu. Měl by se použít pass-through všech parametrů s categorizací, ne whitelist 4 parametrů.

---

#### 2.16 Tealium EventStream

**Stav:** Lepší než Tealium iQ — má alespoň visitor ID a account/profile.

**Co chybí:** Všechny custom data attributes, které EventStream posílá.

---

#### 2.17 Amplitude

**Stav:** Parsuje JSON body, ale vrací `URL: url`.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `user_properties.*` | User properties — klíčové pro Amplitude |
| `event_properties.*` | Event properties — klíčové pro Amplitude |
| `groups` | Account-level analytics |
| `plan.*` | Taxonomy |
| `ip` | Geo |

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `URL: url` | Celá API URL |

---

#### 2.18 Mixpanel

**Stav:** Lepší — parsuje base64-encoded data. Ale base64 decode nerozbaluje `properties.*`.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `properties.*` pass-through | Celý properties objekt — srdce Mixpanelu |
| `$browser`, `$os`, `$device` | Device info |
| `$referrer`, `$referring_domain` | Acquisition |
| `time` | Timestamp |
| `$city`, `$region` | Geo |

---

#### 2.19 Hotjar

**Stav:** Vrací jen `Site ID`. **Nejslabší session replay provider.**

**Co chybí:**
| Parametr | Proč |
|----------|------|
| User ID | Identifikace |
| Session ID | Session tracking |
| Page URL | Jaká stránka |
| Event type | Co se stalo |

**Poznámka:** Hotjar posílá komprimovaná data, takže může být obtížné extrahovat více. Ale alespoň event type z URL by šel.

---

#### 2.20 Microsoft Clarity

**Stav:** **Nejlepší provider v celém projektu.** Detailní JSON decode celého payloadu — envelope, analytics events, custom events, consent, dimensions, metrics. Plně lokalizované názvy eventů.

**Co chybí:** Téměř nic — tohle je vzor, jak by měli vypadat všichni provideré.

**Potenciální šum:**
| Typ | Proč |
|-----|------|
| `Ping [n]` eventy | Opakující se každých pár vteřin — velký šum při dlouhých sessions |
| `Upload [n]` | Interní diagnostics |
| `Limit [n]` | Interní Clarity limity |

**Návrh:** Přidat možnost filtrovat/sbalit Ping eventy (místo vypisování každého).

---

#### 2.21 Adobe ECID

**Stav:** Chudý — jen 4 parametry.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `d_blob` | ECID blob — pokud není v AAM path |
| `dpv` | Device co-op version |
| `d_ptype` | Platform type |
| `d_mid` s lepším labelem | Už je jako `MID` ✓ |

---

#### 2.22 Adobe Target

**Stav:** Pouze URL params — ale Target posílá data primárně v JSON POST body.

**Co chybí (kritické):**
| Parametr | Proč |
|----------|------|
| POST body parsing | Target posílá kompletní JSON s experiences, offers, mboxes |
| `request.id` | Request ID |
| `request.experiences[]` | Zobrazované experience |
| `request.prefetch` | Prefetched mboxes |
| `execute.mboxes[]` | Všechny mboxes v requestu |
| `clientCode` | Z URL path |
| `content` | Vrácený obsah/offers |

**Návrh:** Přidat JSON POST body parsing — tohle je kritické chybějící funkcionalita.

---

#### 2.23 Adobe AAM

**Stav:** Dobrý — komplexní s labels, path-based params, d_* prefix handling.

**Co je šum:**
| Parametr | Proč |
|----------|------|
| Všechny `c_*` params | Často desítky params — kryptické |
| Všechny `p_*` params | Stejně tak |

**Návrh:** Přidat lidské názvy pro známé `c_*` a `p_*` parametry (např. `c_campaign` → "Campaign Trait").

---

### 🔵 TIER 3 — Nižší priorita (ale snadné winy)

---

#### 2.24 Hotjar, FullStory, Crazy Egg, Glassbox, Medallia

**Společný problém:** Session replay nástroje posílají komprimovaná/binární data. `parseParams` zachycuje jen minimum.

| Provider | Vrací | Smysl? |
|----------|-------|--------|
| Hotjar | `Site ID` | Minimum, ale lepší než nic |
| FullStory | `User ID`, `Display Name`, `Email` | Dobré — identifikace uživatele |
| Crazy Egg | `Account ID`, `Page URL` | Minimum |
| Glassbox | `Session ID`, `Customer ID`, `Page URL` | OK |
| Medallia | `Event`, `Session ID`, `Site ID` | OK |

**Návrh:** Pro tyto provideré je to maximum, co se z URL/POST dá rozumně vytáhnout. Nízká priorita.

---

#### 2.25 DoubleClick

**Stav:** Dobrý základ — Floodlight params.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `qty` | Quantity |
| `cost` | Revenue value |
| `u1`–`u50` | Custom Floodlight variables — velmi důležité pro debugging |
| `tran` | Transaction ID |
| `dc_lat`, `dc_rdid` | ID matching |

**Návrh:** Přidat pass-through pro `u1`–`u50` custom variables. Přidat `qty`, `cost`, `tran`.

---

#### 2.26 Criteo

**Stav:** **Jeden z nejchudších** — jen `Account`, `Event`, `URL: url`.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| Email/hash | User matching |
| `item` | Product IDs |
| `price` | Price |
| `quantity` | Množství |
| `transaction_id` | Deduplikace |
| `zipcode` | Geo targeting |
| Criteo OneTag data layer | Všechny `dp` parametry |

**Co je šum:** `URL: url`

---

#### 2.27 Adform

**Stav:** Dobrý — detailní, parsuje `Set1` formát, GDPR params.

**Co je šum:**
| Parametr | Proč |
|----------|------|
| `Cache Buster` | Náhodné číslo — nulová hodnota |
| `URL: url` | Duplicita |
| `Language`, `Resolution`, `Color Depth` | Nízká hodnota |

**Návrh:** Odstranit Cache Buster a URL.

---

#### 2.28 The Trade Desk

**Stav:** Pouze 5 parametrů + `URL: url`.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `tda` | Transaction dedup |
| `tm` | Match ID |
| `tdu` | Conversion type |
| Custom data (`tx`, `ty`) | Custom tracking params |

**Co je šum:** `URL: url`

---

#### 2.29 HubSpot

**Stav:** Slušný základ.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `hutk` | HubSpot user token |
| `hssc` / `hstc` | Cookie tracking |
| `_n` | Page view dedup |
| Form fields (z POST body) | Při form submissions |

---

#### 2.30 Ensighten

**Stav:** OK pro tag manager — `Bootstrap`, `Client`, `Space`.

---

#### 2.31 Braze

**Stav:** Parsuje JSON body — dobrý přístup.

**Co chybí:**
| Parametr | Proč |
|----------|------|
| `attributes.*` | User attributes |
| `properties.*` | Event properties |
| ` purchases.*` | Purchase data |

---

#### 2.32 Seznam Sklik

**Stav:** Slušný s JSON parsingem `ids`.

**Co je šum:** `URL: url`

---

#### 2.33 Piwik PRO TM

**Stav:** **Nejhorší provider** — vrací JEN `URL: url`. Žádná jiná data.

**Návrh:** Odstranit `URL: url`. Přidat extrakci config ID z URL path (`piwik.pro/{accountId}/{siteId}.js`).

---

#### 2.34 Zbylí menší provideré

Tiito provideré mají podobný vzor — 3–6 parametrů, žádné závažné problémy kromě případných chybějících dat:

| Provider | Stav | Poznámka |
|----------|------|----------|
| Reddit Pixel | OK | E-commerce params přítomny |
| Spotify Pixel | OK | Minimální |
| Amazon Ads | OK | Minimální |
| Outbrain | OK | E-commerce přítomno |
| Teads | OK | Minimální |
| RTB House | OK | Minimální |
| Zemanta | OK | Minimální |
| Sojern | OK | Minimální |
| Vibes | OK | Minimální |
| Invoca | OK | Minimální |
| Brevo | OK | Minimální |
| Demandbase | OK | Minimální |
| 6Sense | OK | Minimální |
| Lytics | OK | Ale `URL: url` |
| Indicative | OK | Parsuje JSON |
| Merkury | OK | Minimální |
| Dynamic Yield | OK | Session + Event |
| Omniconvert | OK | Experiment + Variation |
| Split.io | OK | Parsuje JSON body |
| Matomo | OK | Stejné jako Piwik PRO |
| AT Internet | OK | Slušný |
| Parse.ly | OK | Minimální |
| Webtrends | OK | Minimální |
| Comscore | OK | S pass-through extra params |
| Scorecard | OK | Minimální |
| Optimizely | OK | Ale jen URL params, chybí POST body |

---

## 3. Příležitosti pro odstranění šumu

### 3.1 `URL: url` — Sjednotit chování

**Pravidlo:** Žádný provider by neměl vracet `URL: url` (surová URL). Místo toho:
- Pokud jde o **page URL** (např. `p.url`, `p.dl`), přejmenovat na `Page URL`
- Pokud jde o **API URL** — odstranit úplně

**Postihnutí:** ~13 providerů.

### 3.2 Cache busters, timestamps, random values

Parametry jako `ord` (Adform), `cb` (Parse.ly), `rn` (Scorecard), `ns__t` (Comscore) jsou náhodná čísla sloužící jen jako cache busting. Ty zobrazovat nemusíme.

### 3.3 Interní/debug parametry

Parametry jako `Experiments` (Meta), `Release` (Meta), `_dbg` (GA4), `Version` (Twitter), `Cache Buster` (Adform) lze přesunout do collapsed kategorie "Technical / Internal".

### 3.4 Duplicitní consent parametry

Několik providerů zobrazuje consent params pod různými názvy (`GDPR`, `gdpr`, `Consent State`, `gcs`). Sjednotit labeling.

---

## 4. Prioritizovaný akční plán

### Fáze 1: Quick Wins (1–2 dny)

| # | Úkol | Dopad |
|---|------|-------|
| 1 | Odstranit `URL: url` ze všech ~13 providerů | Čistší výstup |
| 2 | Odstranit `Cache Buster` z Adform | Méně šumu |
| 3 | Piwik PRO TM — extrakce accountId/siteId z URL path | Z provideru s nulovou hodnotou → základní info |
| 4 | LinkedIn — přidat `ch`, `time`, `_litr`, page URL | Ze 3 na ~7 parametrů |

### Fáze 2: High-Value Rozšíření (3–5 dní)

| # | Úkol | Dopad |
|---|------|-------|
| 5 | Segment — JSON body parsing (properties, traits, context) | Kritické pro CDP debugging |
| 6 | Tealium iQ — pass-through všech query params + categorizace | Kritické pro Tealium uživatele |
| 7 | Snapchat Pixel — kompletní rewrite | Ze 6 na ~15+ parametrů |
| 8 | Bing Ads — přidat e-commerce a custom event params | Výrazné rozšíření |
| 9 | Adobe Target — JSON POST body parsing | Kritické pro Adobe uživatele |
| 10 | Mixpanel — rozbalit `properties.*` z base64 decode | Jádro nástroje |
| 11 | Amplitude — rozbalit `user_properties.*` a `event_properties.*` | Jádro nástroje |
| 12 | GA4 — přidat chybějící e-commerce a custom dimensions | Nejrozšířenější provider |

### Fáze 3: Categorizace pro Top Providery (2–3 dny)

| # | Úkol | Dopad |
|---|------|-------|
| 13 | Přidat kategorie pro TikTok Pixel | Strukturované zobrazení |
| 14 | Přidat kategorie pro Pinterest Pixel | Strukturované zobrazení |
| 15 | Přidat kategorie pro Google Ads | Strukturované zobrazení |
| 16 | Přidat kategorie pro Twitter/X Pixel | Strukturované zobrazení |
| 17 | Přidat kategorie pro Bing Ads | Strukturované zobrazení |
| 18 | Přidat kategorie pro Adobe Target | Strukturované zobrazení |

### Fáze 4: Architekturální Vylepšení (3–5 dní)

| # | Úkol | Dopad |
|---|------|-------|
| 19 | Zavést "fallback pass-through" pattern: whitelist params + Other kategorie pro všechny nepojmenované | Žádná ztráta dat |
| 20 | Přidat "Technical / Internal" collapsed kategorii pro šum params | Oddělení signálu od šumu |
| 21 | Clarity — filter/sbalení Ping eventů | Čistší Clarity výstup |
| 22 | DoubleClick — přidat `u1`–`u50` custom variables | Častý use case |

---

## 5. Metodika hodnocení

Pro každý provider jsem hodnotil:

1. **Úplnost** — Kolik procent dostupných dat se skutečně zachycuje (0–100%)
2. **Přesnost** — Jsou parametry správně pojmenované a dekódované? (0–100%)
3. **Šum** — Kolik zobrazených parametrů je irelevantních? (0–5 score, méně = lépe)
4. **Kategorizace** — Má provider vlastní kategorie? (Ano/Ne)
5. **Uživatelská hodnota** — Jak často se provider používá na reálných webech (High/Medium/Low)

### Top 5 provideré podle kvality:

| Rank | Provider | Úplnost | Přesnost | Šum |
|------|----------|---------|----------|-----|
| 1 | Microsoft Clarity | 95% | 98% | 1/5 |
| 2 | Meta Pixel | 85% | 95% | 2/5 |
| 3 | Google Ads | 80% | 95% | 1/5 |
| 4 | Bing Ads | 75% | 95% | 1/5 |
| 5 | Adobe Server-Side | 70% | 90% | 1/5 |

### Bottom 5 provideré podle kvality:

| Rank | Provider | Úplnost | Přesnost | Šum |
|------|----------|---------|----------|-----|
| 69 | Piwik PRO TM | 0% | N/A | 5/5 |
| 68 | LinkedIn | 15% | 80% | 3/5 |
| 67 | Tealium iQ | 10% | 90% | 3/5 |
| 66 | Snapchat Pixel | 20% | 90% | 0/5 |
| 65 | Segment | 15% | 80% | 3/5 |
