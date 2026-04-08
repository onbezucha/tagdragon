# Spec: Adobe AAM Provider — Omnibug Parity

**Verze:** 1.0  
**Status:** Draft  
**Datum:** 2025-01-XX  

---

## 1. Cíl

Přepsat existující AAM provider (`src/providers/adobe/aam.ts`) aby kopíroval přístup Omnibugu — detekovat typ requestu, podporovat dynamické prefixy (`c_*`, `p_*`, `d_*`), zobrazovat human-readable popisky a kategorizovat parametry do 3 skupin v Decoded tabu.

---

## 2. Rozdíly: Aktuální stav vs Cílový stav

| Aspekt | Aktuálně (aam.ts) | Cíl (po implementaci) |
|---|---|---|
| **Pattern** | `/dpm\.demdex\.net(?!\/id)/` | `/demdex\.net\/(ibs\|event)[?/#:]/` |
| **Subdomény** | Jen `dpm.demdex.net` | Jakákoliv subdoména (`*.demdex.net`) |
| **Request type** | ❌ | ✅ Detekce z URL path (`/ibs` → ID Sync, `/event` → Event) |
| **Account ID** | ❌ | ✅ Extrakce z hostname |
| **Path-based params** | ❌ | ✅ Parsování `/ibs:k1=v1&k2=v2` |
| **d_* parametry** | 3 hardcoded (`d_mid`, `d_orgid`, `d_rtbd`) | Všechny `d_*` s human-readable labely |
| **c_* parametry** | ❌ | ✅ Automaticky přes `prefixMatch` v categories |
| **p_* parametry** | ❌ | ✅ Automaticky přes `prefixMatch` v categories |
| **Počet standardních parametrů** | 12 | 21 (z Omnibug) |
| **Kategorie v Decoded tabu** | 4 (Identity, Organization, Consent, Technical) | 4 (Hit Info, General, Customer Attributes, Private Attributes) |

---

## 3. Rozhodnutí

| Otázka | Rozhodnutí |
|---|---|
| `d_*` parametry | **Varianta B** — v `parseParams` přeložit na `"Human Label (d_xyz)"` |
| Subdomény | **Ano** — rozšířit pattern na jakoukoliv `*.demdex.net` |
| Request Type | Zobrazit jako samostatný decoded parametr `"Request Type"` v Hit Info kategorii |
| ECID ordering | Bez změny — `/id` se nechyti `(ibs\|event)`, pořadí je bezpečné |

---

## 4. Soubory k úpravě

| Soubor | Akce | Popis |
|---|---|---|
| `src/providers/adobe/aam.ts` | **Přepsat** | Nový pattern, rozšířený `parseParams()` |
| `src/shared/categories.ts` | **Upravit** | Nahradit stávající `'Adobe AAM'` kategorie |
| `src/providers/index.ts` | **Bez změny** | Pořadí `adobeECID → adobeAAM` zůstává |

---

## 5. Detail implementace

### 5.1 `src/providers/adobe/aam.ts` — kompletní přepis

#### 5.1.1 Pattern

```typescript
pattern: /demdex\.net\/(ibs|event)[?/#:]/,
```

- Matchuje `dpm.demdex.net/event?...`, `foo.demdex.net/event?...`, `demdex.net/ibs:key=value&...`
- **Ne** matchuje `demdex.net/id?...` — to zůstává pro `adobeECID`

#### 5.1.2 `parseParams()` logika

```
1. Vytvořit URL objekt z url parametru
2. Extrakce requestType z pathname:
   - /event → "Event"
   - /ibs → "ID Sync"
   - jiný → původní hodnota z path
3. Extrakce accountId z hostname:
   - url.hostname.replace(/^(dpm)?\.demdex\.net$/i, "") 
   - např. "dpm.demdex.net" → "", "customer123.demdex.net" → "customer123"
4. Zpracování path-based params (jen /ibs):
   - Pokud pathname začíná "/ibs:", rozparsovat "/ibs:" suffix jako &-separovaný query string
   - Přidat do params objektu
5. Volání getParams(url, postBody) pro standardní query/POST params
6. Sloučit path-based params (přebíjí query params — pro /ibs case)
7. Vrátit decoded objekt
```

#### 5.1.3 Decoded parametry

**Hit Info kategorie** (speciální):
| Klíč | Zdroj | Popis |
|---|---|---|
| `Request Type` | URL path | `"ID Sync"` nebo `"Event"` |
| `Account` | hostname | Subdoména (pokud existuje) |

**General kategorie** — všechny standardní parametry s human-readable labely:

| Decoded Key | Zdroj param | Label |
|---|---|---|
| `Caller` | `caller` | Caller |
| `Callback Property` | `cb` | Callback property |
| `Data Provider (User) IDs` | `cid` | Data Provider (User) IDs |
| `Integration Code / User ID` | `ciic` | Integration Code / User ID |
| `COPPA Request` | `coppa` | COPPA Request |
| `Return Traits & Segments` | `cts` | Return Traits & Segments in Response |
| `Data Provider ID` | `dpid` | Data Provider ID |
| `Data Provider User ID` | `dpuuid` | Data Provider User ID |
| `Return URL Destination` | `dst` | Return URL Destination in Response |
| `Adobe Analytics Integration` | `dst_filter` | Adobe Analytics Integration |
| `JSON Response Version` | `jsonv` | JSON Response Version |
| `Experience Cloud ID` | `mid` nebo `d_mid` | Experience Cloud ID |
| `Name Space ID` | `nsid` | Name Space ID |
| `Platform` | `ptfm` | Platform |
| `Legacy AA Integration` | `rs` | Legacy Adobe Analytics Integration |
| `Return Method` | `rtbd` nebo `d_rtbd` | Return Method |
| `Score ID` | `sid` | Score ID |
| `Trait Source` | `tdpid` | Trait Source |
| `Trait Source (IC)` | `tdpiic` | Trait Source (Integration Code) |
| `Unique User ID` | `uuid` | Unique User ID |
| `Experience Cloud ID` | `d_mid` | Experience Cloud ID (d_mid) — jen pokud `mid` neexistuje |
| `Org ID` | `d_orgid` | Org ID (d_orgid) |
| `Blob` | `d_blob` | Blob (d_blob) |
| `Version` | `d_ver` | Version (d_ver) |
| `DCS Region` | `dcs` | DCS Region |
| `Redirect` | `redir` | Redirect |
| `GDPR` | `gdpr` | GDPR |
| `Consent String` | `gdpr_consent` | Consent String |

**Customer Attributes** (`c_*` prefix):
- Všechny `c_*` parametry zachovány jako-is (např. `c_customerId`)
- Kategorie se řeší přes `prefixMatch` v categories.ts — **žádná úprava v parseParams**

**Private Attributes** (`p_*` prefix):
- Všechny `p_*` parametry zachovány jako-is (např. `p_privateId`)
- Kategorie se řeší přes `prefixMatch` v categories.ts — **žádná úprava v parseParams**

**Poznámka k duplicitám:**
- Pokud existuje `mid` (bez prefixu), použít `"Experience Cloud ID"` → zdroj `mid`
- Pokud existuje jen `d_mid` (s prefixem), použít `"Experience Cloud ID (d_mid)"` → zdroj `d_mid`
- Obdobně pro `rtbd` vs `d_rtbd`

---

### 5.2 `src/shared/categories.ts` — nahrazení `'Adobe AAM'` sekce

**Odstranit** stávající (řádky 1241–1270):
```typescript
// STARÉ — Identity, Organization, Consent, Technical
```

**Nahradit** novým:
```typescript
'Adobe AAM': {
  hitInfo: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Request Type$/, /^Account$/]
  },
  general: {
    label: 'General',
    icon: '🔧',
    order: 2,
    defaultExpanded: true,
    patterns: [
      /^Caller$/, /^Callback Property$/, /^Data Provider/, /^Integration Code/,
      /^COPPA/, /^Return Traits/, /^Data Provider ID$/, /^Data Provider User ID$/,
      /^Return URL/, /^Adobe Analytics Integration$/, /^JSON Response/,
      /^Experience Cloud ID/, /^Name Space ID$/, /^Platform$/,
      /^Legacy AA/, /^Return Method$/, /^Score ID$/,
      /^Trait Source/, /^Unique User ID$/, /^Org ID/,
      /^Blob$/, /^Version$/, /^DCS Region$/, /^Redirect$/,
      /^GDPR$/, /^Consent String$/,
    ]
  },
  customer: {
    label: 'Customer Attributes',
    icon: '👥',
    order: 3,
    defaultExpanded: true,
    prefixMatch: ['c_']
  },
  private: {
    label: 'Private Attributes',
    icon: '🔒',
    order: 4,
    defaultExpanded: false,
    prefixMatch: ['p_']
  }
},
```

---

### 5.3 `src/providers/index.ts` — bez změny

Pořadí zůstává:
```typescript
adobeECID,    // demdex.net/id?     — matchuje PRED AAM
adobeAAM,     // demdex.net/(ibs|event)[?/#:]  — matchuje jen ibs/event
```

**Bezpečnostní analýza:**
- `adobeECID.pattern` = `/demdex\.net\/id\?/` — matchuje jen `/id?`
- `adobeAAM.pattern` (nový) = `/demdex\.net\/(ibs|event)[?/#:]/` — matchuje jen `/ibs` nebo `/event`
- Žádný překryv ✅

**Domain index dopad:**
- ECID i AAM jsou indexovány pod `demdex.net`
- Při requestu na `demdex.net/id?...` se testují oba, ale ECID je dříve v poli → vyhraje
- Při requestu na `demdex.net/event?...` ECID pattern nevyhoví (`/id?`), AAM vyhraje ✅

---

## 6. Příklad — před a po

### Před (aktuální)

**URL:** `https://dpm.demdex.net/event?d_mid=12345&d_orgid=ABC@AdobeOrg&gdpr=1&gdpr_consent=CPxxx&d_rtbd=json&c_custId=999&d_blob=abc`

```
MID: 12345
Org ID: ABC@AdobeOrg
Customer ID: undefined
DPID: undefined
DPUUID: undefined
GDPR: 1
Consent String: CPxxx
Return Type: json
Blob: abc
Version: undefined
DCS Region: undefined
Redirect: undefined
```

### Po (cílový)

**URL:** `https://dpm.demdex.net/event?d_mid=12345&d_orgid=ABC@AdobeOrg&gdpr=1&gdpr_consent=CPxxx&d_rtbd=json&c_custId=999&d_blob=abc`

```
📊 Hit Info
  Request Type: Event
  Account: (prázdné — dpm.demdex.net)

🔧 General
  Experience Cloud ID (d_mid): 12345
  Org ID (d_orgid): ABC@AdobeOrg
  Return Method (d_rtbd): json
  Blob (d_blob): abc
  GDPR: 1
  Consent String: CPxxx

👥 Customer Attributes
  c_custId: 999
```

### Příklad 2 — ID Sync s path-based params

**URL:** `https://demdex.net/ibs:dpid=111&dpuuid=user123&d_rtbd=json`

```
📊 Hit Info
  Request Type: ID Sync
  Account: (prázdné — demdex.net)

🔧 General
  Data Provider ID: 111
  Data Provider User ID: user123
  Return Method: json
```

---

## 7. Implementační kroky (pořadí)

1. **Přepsat `src/providers/adobe/aam.ts`**
   - Nový pattern
   - Nový `parseParams()` s requestType, accountId, path-based params, `d_*` mapováním
   
2. **Upravit `src/shared/categories.ts`**
   - Nahradit stávající `'Adobe AAM'` sekci (řádky 1241–1270) novou se 4 kategoriemi

3. **Testování**
   - `npm run build` — ověřit že TypeScript kompiluje bez chyb
   - Ruční test v Chrome DevTools:
     - `dpm.demdex.net/event?d_mid=123&gdpr=1&c_foo=bar&p_secret=x`
     - `demdex.net/ibs:dpid=111&dpuuid=user123`
     - `customer.demdex.net/event?mid=999&d_ver=2`
     - `dpm.demdex.net/id?d_mid=123` — musí matchnout ECID, NE AAM

---

## 8. Rizika a mitigace

| Riziko | Pravděpodobnost | Mitigace |
|---|---|---|
| `d_*` parametry bez mapingu spadnou do Other | Střední | Přidat catch-all `d_` prefix do General kategorie, nebo nechat v Other — neproblematické |
| Path-based params v `/ibs:` obsahují URL-encoded hodnoty | Nízká | Ošetřit `decodeURIComponent()` při parsování |
| Domain index候选 contains both ECID + AAM for `demdex.net` | Žádné | Pořadí v PROVIDERS poli garantuje ECID první |
| Stávající uživatelé si zvykli na staré názvy parametrů | Nízké | Nové názvy jsou informativnější; staré měly často `undefined` hodnoty |
