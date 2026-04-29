# Spec: CI vylepšení + Testování + Release automatizace

**Datum:** 2026-07-18
**Status:** Approved
**Autor:** Ondřej Bezucha

---

## Rozhodnutí

| Otázka | Rozhodnutí |
|---|---|
| `npm run typecheck` do package.json? | ❌ Ne – v CI stačí `npx tsc --noEmit` |
| Coverage threshold v CI? | ❌ Ne – přidat až při > 50 % coverage |
| Kde umístit testy? | `tests/` mirroring `src/` strukturu |
| Co se starými workflows? | Přepsat in-place – viz sekce Migrace |

---

## Migrace

Oba existující workflowy se **přepíší novými verzemi**. Žádná koexistence, žádný přechodový režim.

| Workflow | Akce | Kdy se aktivuje |
|---|---|---|
| `.github/workflows/ci.yml` | Přepsat celý soubor | Okamžitě po merge do `master` |
| `.github/workflows/release.yml` | Přepsat celý soubor | Až při prvním pushi tagu `v*` |

**Proč je to bezpečné:**
- Nové CI je striktní nadmnožina starého – všechny původní kroky (`lint`, `format:check`, `build`, verify dist) zůstávají, jen přibyly `tsc --noEmit` a `npm test`
- Nový release pipeline zachovává trigger (`v*` tag), zipování a `softprops/action-gh-release@v2` – přidává jen lepší název, changelog body a `LICENSE` v zipu
- Pokud by `tsc --noEmit` nebo testy selhaly na existujícím kódu, znamená to že odhalily reálný problém

**Rollback:** `git revert` na merge commit – staré workflowy se obnoví. Není potřeba žádný feature flag ani větvení.

---

## 1. Cíle

1. **Přidat TypeScript type check** do CI – `tsc --noEmit` chytí chyby, které ESLint nevidí
2. **Zavést test framework** a napsat první testy (providery + utility)
3. **Vylepšit release pipeline** – deterministický název + automatický changelog v release body

---

## 2. CI: Přidání `tsc --noEmit`

### Problém

CI spouští `npm run lint` (ESLint) a `npm run format:check` (Prettier), ale ne TypeScript compiler. Tvůj `tsconfig.json` má `strict: true` + `noUnusedLocals` + `noUnusedParameters` – to vše kontroluje `tsc`, ale ne nutně ESLint.

### Řešení

Přidat jeden krok do `ci.yml` mezi `format:check` a `build`:

```yaml
- run: npx tsc --noEmit
```

**Proč `--noEmit`:** Nechceme, aby `tsc` generoval soubory (o to se stará Rollup). Chceme jen typovou kontrolu.

---

## 3. Test Framework: Vitest

### Proč Vitest

| Kritérium | Vitest | Jest |
|---|---|---|
| ESM support | Nativní | Vyžaduje transform |
| TypeScript | Zero-config (Vite-based) | Vyžaduje ts-jest nebo babel |
| Rychlost | Velmi rychlý (nativní ESM) | Pomalejší cold start |
| Watch mode | Excelentní | Standardní |
| API | Jest-compatible | Standard |
| Path aliasy (`@/*`) | Automatické z `tsconfig.json` | Vyžaduje `moduleNameMapper` |

### Instalace

```bash
npm install -D vitest
```

### Konfigurace

Vytvořit `vitest.config.ts` v rootu:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

### NPM scripts

Přidat do `package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### Adresářová struktura

```
tests/
  providers/
    google/
      ga4.test.ts
      google-ads.test.ts
      gtm.test.ts
    meta/
      pixel.test.ts
    adobe/
      analytics.test.ts
      ...
    url-parser.test.ts
    match-provider.test.ts
  panel/
    datalayer/
      correlation.test.ts
      diff-renderer.test.ts
      ...
```

Testy mirrorují `src/` strukturu. Import cesty budou např.:
```typescript
import { ga4 } from '../../src/providers/google/ga4';
```

---

## 4. Testovací strategie: Co testovat první

### Priority matice

| Oblast | Hodnota testů | Složitost napsání | Priorita |
|---|---|---|---|
| **Provider matchers** (pattern regex) | Extrémně vysoká – 68 providerů, ordering bugs | Nízká – jen regex + URL | 🔴 P1 |
| **`parseParams()`** jednotlivých providerů | Vysoká – ověří správný decoding | Střední – potřebuje test data | 🔴 P1 |
| **`url-parser.ts`** utility | Vysoká – základ pro všechny providery | Nízká – čisté funkce | 🔴 P1 |
| **`matchProvider()`** v index.ts | Vysoká – domain index + ordering | Střední – edge cases | 🟡 P2 |
| **DataLayer utilities** (correlation, diff, validator) | Vysoká – komplexní logika | Střední | 🟡 P2 |
| **DOM rendering** (panel) | Střední – UI bugs | Vysoká – JSDOM/Playwright | 🟢 P3 |

### Fáze 1: Provider tests (P1)

Každý provider se testuje dvěma způsoby:

1. **Pattern matching** – `provider.pattern.test(url)` by měl matchovat správné URL a odmítnout špatné
2. **Param parsing** – `provider.parseParams(url, postBody)` by měl vracet správně dekódované parametry

#### Příklad: GA4 provider

```typescript
// tests/providers/google/ga4.test.ts
import { describe, it, expect } from 'vitest';
import { ga4 } from '../../../src/providers/google/ga4';

describe('GA4 Provider', () => {
  describe('pattern matching', () => {
    it('matches standard GA4 collect URL', () => {
      expect(
        ga4.pattern.test(
          'https://analytics.google.com/g/collect?v=2&tid=G-ABC123'
        )
      ).toBe(true);
    });

    it('matches google-analytics.com domain', () => {
      expect(
        ga4.pattern.test(
          'https://www.google-analytics.com/g/collect?v=2&tid=G-XYZ'
        )
      ).toBe(true);
    });

    it('matches server-side GTM custom domain', () => {
      expect(
        ga4.pattern.test('https://custom.example.com/g/collect?v=2&tid=G-TEST')
      ).toBe(true);
    });

    it('does NOT match Universal Analytics (v=1)', () => {
      expect(
        ga4.pattern.test(
          'https://www.google-analytics.com/collect?v=1&tid=UA-123'
        )
      ).toBe(false);
    });

    it('does NOT match unrelated Google URLs', () => {
      expect(
        ga4.pattern.test('https://www.google.com/search?q=test')
      ).toBe(false);
    });
  });

  describe('parseParams', () => {
    it('extracts event name from URL params', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=page_view&tid=G-ABC',
        undefined
      );
      expect(result.Event).toBe('page_view');
      expect(result['Measurement ID']).toBe('G-ABC');
    });

    it('extracts params from POST body', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect',
        'en=purchase&tid=G-ABC&cu=CZK'
      );
      expect(result.Event).toBe('purchase');
      expect(result.Currency).toBe('CZK');
    });

    it('extracts dynamic event parameters (ep.*)', () => {
      const result = ga4.parseParams(
        'https://www.google-analytics.com/g/collect?en=view_item&ep.item_name=Shoes',
        undefined
      );
      expect(result['ep.item_name']).toBe('Shoes');
    });
  });
});
```

#### Příklad: url-parser utility

```typescript
// tests/providers/url-parser.test.ts
import { describe, it, expect } from 'vitest';
import { getParams, extractPath } from '../../src/providers/url-parser';

describe('getParams', () => {
  it('parses URL query string', () => {
    const result = getParams('https://example.com/track?a=1&b=hello');
    expect(result).toEqual({ a: '1', b: 'hello' });
  });

  it('merges POST body over URL params', () => {
    const result = getParams(
      'https://example.com/track?page=home',
      'page=override&extra=yes'
    );
    expect(result.page).toBe('override');
    expect(result.extra).toBe('yes');
  });

  it('parses JSON POST body', () => {
    const result = getParams(
      'https://example.com/track',
      '{"events":["purchase"],"page":"cart"}'
    );
    expect(result.page).toBe('cart');
  });

  it('returns empty object for invalid URL', () => {
    const result = getParams('not-a-url');
    expect(result).toEqual({});
  });
});

describe('extractPath', () => {
  it('extracts first capture group', () => {
    expect(extractPath('/g/collect?v=2', /\/g\/(\w+)/)).toBe('collect');
  });

  it('returns undefined for no match', () => {
    expect(extractPath('/other/path', /\/g\/(\w+)/)).toBeUndefined();
  });
});
```

#### Doporučený postup psaní provider testů

1. **`tests/providers/google/ga4.test.ts`** – nejpoužívanější provider, nejlepší template
2. **`tests/providers/google/google-ads.test.ts`** – podobný styl, ověření doubleclick/ads rozlišení
3. **`tests/providers/meta/pixel.test.ts`** – jiný typ patternu
4. **`tests/providers/adobe/analytics.test.ts`** – komplexní parametry (POST body)
5. Postupně doplňovat další – ideálně při úpravách/bugfixech daného provideru

### Fáze 2: Domain index + ordering tests (P2)

```typescript
// tests/providers/match-provider.test.ts
import { describe, it, expect } from 'vitest';
import { matchProvider, PROVIDERS } from '../../src/providers/index';

describe('matchProvider', () => {
  it('matches GA4 correctly', () => {
    const provider = matchProvider(
      'https://www.google-analytics.com/g/collect?v=2&tid=G-ABC'
    );
    expect(provider?.name).toBe('GA4');
  });

  it('matches Meta Pixel', () => {
    const provider = matchProvider(
      'https://graph.facebook.com/v18.0/123456/events'
    );
    expect(provider?.name).toBe('Meta Pixel');
  });

  it('resolves ordering conflict: tealiumEventstream before tealium', () => {
    const eventStream = matchProvider(
      'https://collect.tealiumiq.com/event'
    );
    expect(eventStream?.name).toBe('Tealium EventStream');

    const regular = matchProvider(
      'https://collect.tealiumiq.com/data/i.gif'
    );
    expect(regular?.name).toBe('Tealium');
  });

  it('resolves ordering conflict: comscore before scorecard', () => {
    const cs = matchProvider(
      'https://sb.scorecardresearch.com/b'
    );
    expect(cs?.name).toBe('comScore');
  });

  it('returns null for unknown URL', () => {
    const result = matchProvider('https://www.example.com/page.html');
    expect(result).toBeNull();
  });

  it('every provider has a unique name', () => {
    const names = PROVIDERS.map((p) => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
```

### Fáze 3: DataLayer utilities (P2)

Pokrytí:
- `correlation.ts` – correlation engine
- `reverse-correlation.ts` – reverse correlation
- `diff-renderer.ts` – diff rendering
- `ecommerce-formatter.ts` – e-commerce detection
- `validator.ts` – validation rules

---

## 5. CI: Kompletní updated workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build

      - name: Verify dist files exist
        run: |
          test -f dist/panel.js
          test -f dist/background.js
          test -f dist/devtools.js
          test -f dist/popup.js
          test -f dist/data-layer-main.js
          test -f dist/data-layer-bridge.js
          test -f dist/panel.css
```

Pořadí je záměrné: nejrychlejší kontroly (lint, format, typecheck, test) dřív než build. Pokud cokoliv selže, build se ani nespustí.

---

## 6. Release: Vylepšený název + Automatický changelog

### Problém

Aktuální release vytvoří release s názvem tagu (např. `v1.6.5`) a `generate_release_notes: true` vygeneruje GitHub auto-notes (seznam commitů). To nedává jasný, uživatelsky přívětivý release popis.

### Řešení

Automaticky extrahovat changelog z `CHANGELOG.md` pro danou verzi a použít ho jako release body:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run build

      - name: Prepare release zip
        run: |
          mkdir -p tagdragon-release
          cp manifest.json tagdragon-release/
          cp -r public tagdragon-release/
          cp -r dist tagdragon-release/
          cp LICENSE tagdragon-release/
          cd tagdragon-release
          zip -r ../TagDragon-${{ github.ref_name }}.zip .

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Extract changelog for this version
        id: changelog
        run: |
          VERSION="${{ steps.version.outputs.VERSION }}"
          CHANGELOG=$(awk "/\#\# \[${VERSION}\]/,/\#\# \[/" CHANGELOG.md | head -n -1)
          echo "BODY<<EOFMARKER" >> $GITHUB_OUTPUT
          echo "$CHANGELOG" >> $GITHUB_OUTPUT
          echo "EOFMARKER" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "TagDragon v${{ steps.version.outputs.VERSION }}"
          body: "${{ steps.changelog.outputs.BODY }}"
          files: TagDragon-${{ github.ref_name }}.zip
```

### Co se změní

| Aspekt | Před | Po |
|---|---|---|
| **Release název** | `v1.6.5` (jen tag) | `TagDragon v1.6.5` |
| **Release body** | Auto-generated commit list | Sekce z `CHANGELOG.md` |
| **Zip obsah** | `manifest.json`, `public/`, `dist/` | + `LICENSE` |
| **CI kroky před release** | Jen build | Test + build |

### Výsledek na GitHub Releases

```
Release: TagDragon v1.6.5
Assets: TagDragon-v1.6.5.zip

Body:
## [1.6.5] - 2026-07-17

### Changed
- Version bump to 1.6.5
```

### Předpoklad

Tento přístup vyžaduje, abys před každým releasem **aktualizoval `CHANGELOG.md`**. To už teď děláš, takže to není žádná změna procesu.

---

## 7. Implementační plán

| Krok | Co | Čas | Soubory |
|---|---|---|---|
| **1** | Přidat `tsc --noEmit` do CI | 2 min | `.github/workflows/ci.yml` |
| **2** | Nainstalovat Vitest + config | 10 min | `vitest.config.ts`, `package.json` |
| **3** | Napsat testy pro `url-parser.ts` | 15 min | `tests/providers/url-parser.test.ts` |
| **4** | Napsat testy pro GA4 provider | 15 min | `tests/providers/google/ga4.test.ts` |
| **5** | Napsat testy pro `matchProvider()` | 20 min | `tests/providers/match-provider.test.ts` |
| **6** | Přidat `npm test` do CI | 2 min | `.github/workflows/ci.yml` |
| **7** | Vylepšit release workflow | 15 min | `.github/workflows/release.yml` |
| **8** | Přidat testy pro další providery | 5–10 min/provider | `tests/providers/**/*.test.ts` |

**Krok 1–2:** Hotovo za 15 minut
**Krok 3–6:** Hotovo za 1 hodinu
**Krok 7:** Hotovo za 15 minut
**Krok 8:** Postupně – ideálně při úpravách/bugfixech jednotlivých providerů
