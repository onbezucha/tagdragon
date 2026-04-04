# 🐉 TagDragon

<div align="center">

**The dragon that sees every tag. Chrome DevTools extension for capturing and decoding marketing/analytics tracking requests.**

[![Chrome Extension Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](https://github.com/yourusername/TagDragon)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-88+-brightgreen.svg)](https://www.google.com/chrome/)

*Manifest V3 • TypeScript • Rollup • Tailwind CSS*

</div>

---

## Overview

**TagDragon v1.5.0** is a Chrome DevTools extension that captures network requests from analytics and marketing platforms, decodes them into human-readable format, and provides advanced filtering and search capabilities.

### Key Features

- **Real-time Request Capture** — Monitor tracking requests as they happen
- **DataLayer Inspector** — Intercept and inspect data layer pushes from GTM, Tealium, Adobe, Segment, and W3C digitalData with diff view, cumulative state, and network correlation
- **Multi-Provider Support** — Decode requests from 68 tracking platforms across 9 categories
- **Provider Filter Popover** — Filter by provider via a toolbar icon; hidden providers persist across restarts
- **Search & Advanced Filtering** — Filter by URL, parameter name/value, event type, HTTP method, status, user ID
- **Active Filter Chips** — Visual chips for active filters (hidden providers, search text, etc.) with one-click removal
- **Detailed Analysis** — View decoded parameters, query strings, POST bodies, headers, and responses
- **Consent Panel** — Inspect and override cookie/consent state on the inspected page
- **Clear Cookies** — Delete all cookies for the inspected page with one click
- **Export** — Export captured requests as JSON or CSV
- **Compact Rows** — Toggle compact row display for denser request lists
- **Timestamp Formats** — Display timestamps as absolute time, relative age, or elapsed since first request
- **Adobe Environment Switcher** — Switch between DEV/ACC/PROD Adobe Launch environments using network-level redirects
- **Performance Optimized** — Efficient handling of large request volumes with configurable auto-pruning
- **Keyboard Shortcuts** — Power-user friendly navigation
- **Extension Popup** — Live request stats, provider breakdown, and pause/clear controls from the extension icon

## Installation

### From GitHub Release (no build required)

1. Download `TagDragon-v1.5.0.zip` from the [Releases page](https://github.com/yourusername/TagDragon/releases)
2. Unzip the archive
3. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the unzipped folder

### From Source

```bash
git clone https://github.com/yourusername/TagDragon.git
cd TagDragon
npm install
npm run build
```

Then open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `TagDragon` directory. Open DevTools on any page to see the **TagDragon** tab.

### Development Mode

```bash
npm run dev
```

Runs CSS and JS watchers concurrently. After code changes, reload the extension at `chrome://extensions/` and reopen the DevTools panel.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch CSS + JS |
| `npm run build` | Production build (minified CSS + JS) |
| `npm run build:css` | CSS only |
| `npm run build:js` | JS only |
| `npm run clean` | Delete `dist/*` |

## Project Structure

```
TagDragon/
├── src/                        # TypeScript source
│   ├── background/             # Service worker (declarativeNetRequest, popup bridge, badge counter)
│   │   ├── index.ts            # Message relay, DataLayer relay, cookie clearing, extension request relay
│   │   ├── badge.ts            # Extension icon badge counter
│   │   └── popup-bridge.ts     # Popup ↔ background messaging, DevTools status tracking
│   ├── content/                # Content scripts (injected into inspected pages)
│   │   ├── data-layer-main.ts  # MAIN world — intercepts data layer pushes
│   │   └── data-layer-bridge.ts # ISOLATED world — relays postMessage to background
│   ├── devtools/               # DevTools registration + network capture
│   │   ├── index.ts            # Panel creation, DataLayer injection, port management
│   │   ├── network-capture.ts  # Request matching and parsing
│   │   ├── panel-bridge.ts     # Panel window message bridge
│   │   └── data-layer-relay.ts # DataLayer push/source/snapshot relay to panel
│   ├── panel/                  # Panel UI
│   │   ├── components/         # UI components (provider-bar, filter-bar, detail-pane, request-list, status-bar, adobe-env-switcher, consent-panel, info-popover, …)
│   │   ├── datalayer/          # DataLayer tab components
│   │   │   ├── state.ts        # DataLayer push state management
│   │   │   ├── push-list.ts    # Push list rendering
│   │   │   ├── push-detail.ts  # Detail pane (4 sub-tabs)
│   │   │   ├── diff-renderer.ts # Deep diff algorithm and rendering
│   │   │   ├── ecommerce-formatter.ts # E-commerce detection and product tables
│   │   │   └── correlation.ts  # Network request correlation engine
│   │   ├── tabs/               # Detail tabs (decoded, query, POST, headers, response)
│   │   ├── utils/              # DOM helpers, formatting, filtering, categorization, icons
│   │   ├── state.ts            # Centralized state (network requests)
│   │   ├── theme.ts            # Dark/light theme
│   │   └── index.ts            # Panel controller
│   ├── popup/                  # Extension popup (live stats)
│   ├── providers/              # 68 tracking provider implementations
│   │   ├── google/             # GA4, UA, GTM, Google Ads
│   │   ├── adobe/              # Adobe Client-Side, Server-Side, Target, AAM, ECID, Heartbeat, DTM, Launch (CN)
│   │   ├── meta/               # Meta Pixel
│   │   ├── microsoft/          # Bing Ads, Microsoft Clarity
│   │   └── …                   # 50+ standalone providers
│   ├── shared/                 # Constants, parameter categories, provider groups, CMP detection
│   └── types/                  # TypeScript type definitions
│       ├── request.ts          # ParsedRequest, UIState, FilterState, AppConfig, etc.
│       ├── datalayer.ts        # DataLayerPush, DataLayerState, DiffEntry, message types
│       ├── provider.ts         # Provider interface, ProviderRegistry
│       ├── categories.ts       # CategoryConfig, ProviderCategories
│       ├── consent.ts          # ConsentCategory, GoogleConsentMode, TCFData, CMPInfo
│       └── popup.ts            # ProviderStats, TabPopupStats, PopupStatsResponse
├── public/                     # Static assets (HTML, icons, fonts)
├── styles/input.css            # Tailwind CSS source
├── dist/                       # Build output — never edit manually
├── manifest.json
├── rollup.config.js
└── tailwind.config.js
```

## Supported Providers

68 providers across 9 categories.

### Analytics

| Provider | URL Pattern |
|----------|-------------|
| **Google Analytics 4** | `google-analytics.com/g/collect`, `analytics.google.com/g/collect` |
| **Google Analytics UA** | `google-analytics.com/collect` |
| **Adobe Client-Side** | `sc.omtrdc.net`, `2o7.net`, `/b/ss/` |
| **Adobe Server-Side** | `/ee/*/v*/interact`, `*.adobedc.net` |
| **Amplitude** | `amplitude.com/2/httpapi`, `amplitude.com/batch` |
| **Mixpanel** | `mixpanel.com/track`, `/engage`, `/import` |
| **Matomo** | `/piwik.php`, `/matomo.php` |
| **Piwik PRO** | `*.piwik.pro/ppms.php` |
| **AT Internet** | `ati-host.net`, `*.xiti.com` |
| **Comscore** | `scorecardresearch.com/b`, `sb.scorecardresearch.com` |
| **Parse.ly** | `srv.pixel.parsely.com`, `p.parsely.com/pixel` |
| **Webtrends** | `statse.webtrendslive.com`, `webtrendslive.com/dcs` |
| **Scorecard Research** | `scorecardresearch.com/p` |
| **Medallia DXA** | `resources.digital.medallia.com`, `d.medallia.com` |
| **Indicative** | `api.indicative.com/service/event` |
| **RudderStack** | `*.rudderstack.com/v1/`, `hosted.rudderlabs.com/v1/` |

### Tag Managers

| Provider | URL Pattern |
|----------|-------------|
| **Google Tag Manager** | `googletagmanager.com/gtm.js`, `gtag/js` |
| **Tealium** | `tags.tiqcdn.com`, `collect.tealiumiq.com` |
| **Segment** | `api.segment.io`, `segmentapis.com` |
| **Ensighten** | `nexus.ensighten.com` |
| **Piwik PRO TM** | `*.piwik.pro/*.js` (container load) |

### Marketing & Advertising

| Provider | URL Pattern |
|----------|-------------|
| **Google Ads** | `googleads.g.doubleclick.net/pagead/…`, `googleadservices.com/pagead/…` |
| **Meta Pixel** | `facebook.com/tr` |
| **Microsoft Bing Ads** | `bat.bing.com/action/0` |
| **Adform** | `track.adform.net`, `a1.adform.net` |
| **DoubleClick (DV360)** | `doubleclick.net` (excl. Google Ads paths) |
| **Criteo** | `dis.criteo.com`, `sslwidget.criteo.com` |
| **Seznam Sklik** | `c.seznam.cz/retargeting`, `h.seznam.cz` |
| **TikTok Pixel** | `analytics.tiktok.com/api/v*` |
| **X (Twitter) Pixel** | `analytics.twitter.com/i/adsct` |
| **Pinterest Pixel** | `ct.pinterest.com/v3/`, `ct.pinterest.com/user/` |
| **The Trade Desk** | `insight.adsrvr.org/track/` |
| **Reddit Pixel** | `reddit.com/t.gif`, `ads.reddit.com` |
| **Snapchat Pixel** | `tr.snapchat.com`, `snapkit.com/v1/advertising` |
| **Spotify Pixel** | `ads.spotify.com/pixel`, `pixel.spotify.com` |
| **Amazon Ads** | `amazon-adsystem.com/e/cm`, `amazon-adsystem.com/aax2` |
| **Outbrain** | `tr.outbrain.com/unifiedPixel`, `amplify.outbrain.com/pixel` |
| **Teads** | `t.teads.tv/page`, `p.teads.tv/` |
| **RTB House** | `creative.rtbhouse.com` |
| **Zemanta** | `p.zemanta.com` |
| **Sojern** | `beacon.sojern.com` |
| **Vibes** | `vibes.com/pixel` |
| **Brevo** | `in-automate.brevo.com/p`, `in-automate.sendinblue.com/p` |
| **Invoca** | `solutions.invoca.com/pixel` |
| **HubSpot** | `track.hubspot.com/__ptq`, `forms.hubspot.com/submissions` |

### Session Replay

| Provider | URL Pattern |
|----------|-------------|
| **Hotjar** | `hotjar.com/h.js`, `hjboot`, `hj.` |
| **Microsoft Clarity** | `clarity.ms/collect` |
| **FullStory** | `fullstory.com/rec`, `rs.fullstory.com` |
| **Crazy Egg** | `crazyegg.com/pages`, `script.crazyegg.com` |
| **Glassbox** | `glassbox.com`, `gbtr.glassbox.com` |

### A/B Testing & Experimentation

| Provider | URL Pattern |
|----------|-------------|
| **Optimizely** | `*.optimizely.com/log/` |
| **Dynamic Yield** | `dyntrk.com`, `cdn.dynamicyield.com/api` |
| **Split** | `events.split.io/api/events` |
| **Omniconvert** | `api.omniconvert.com` |

### Visitor Identification

| Provider | URL Pattern |
|----------|-------------|
| **LinkedIn** | `linkedin.com/li/track`, `px.ads.linkedin.com` |
| **Merkury** | `d.merkury.com` |
| **Demandbase** | `tag.demandbase.com`, `api.demandbase.com` |
| **6Sense** | `j.6sc.co`, `b.6sc.co` |

### Customer Engagement

| Provider | URL Pattern |
|----------|-------------|
| **Braze** | `sdk.*.braze.com`, `dev.appboy.com` |
| **Lytics** | `c.lytics.io` |

### CDP (Customer Data Platform)

| Provider | URL Pattern |
|----------|-------------|
| **mParticle** | `nativesdks.mparticle.com/v2`, `api.mparticle.com/v2` |
| **Tealium EventStream** | `collect.tealiumiq.com/event`, `data.cloud.tealium.com` |

### Adobe Stack

| Provider | URL Pattern |
|----------|-------------|
| **Adobe Target** | `tt.omtrdc.net` |
| **Adobe Audience Manager** | `dpm.demdex.net` |
| **Adobe ECID** | `demdex.net/id` |
| **Adobe Heartbeat** | `*.hb.omtrdc.net` |
| **Adobe DTM** | `assets.adobedtm.com/…/satelliteLib` |
| **Adobe Launch (CN)** | `assets.adobedc.cn` |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests |
| `Ctrl+F` | Focus search input |
| `Ctrl+Shift+F` | Open filter popover |
| `↑ / ↓` | Navigate request list |
| `Esc` | Clear search / close detail panel / close popovers |

## UI Overview

### Toolbar

- **⏸ Pause/Resume** — temporarily stop capturing
- **Clear** — clear all captured requests
- **Clear Cookies** — delete all cookies for the inspected page
- **Consent** — open consent/cookie state inspector
- **⇅ Sort Order** — toggle oldest/newest first
- **↩ Wrap Values** — wrap long parameter values
- **📑 Auto-expand** — auto-expand detail sections on select
- **Compact Rows** — toggle compact row display
- **🔽 Provider Filter** — opens a popover to show/hide individual providers grouped by category; hidden providers persist across DevTools restarts
- **Export** — export captured requests as JSON or CSV
- **Theme** — toggle dark/light mode
- **⚙ Settings** — performance settings (max requests, auto-prune, default tab, timestamp format, export format)
- **Info** — about/help popover

All toolbar settings are persisted to `chrome.storage.local`.

### Filter Bar

Appears below the toolbar when active filters are in effect. Shows removable chips for:
- Text search (`"sklik"`)
- Hidden providers (`GA4 hidden`)
- Event type, HTTP method, status, user ID, parameter filters

### Detail Tabs

1. **Decoded** — human-readable parsed parameters, grouped into collapsible provider-specific categories
2. **Query** — raw URL query string parameters
3. **POST** — POST body data with JSON pretty-print
4. **Headers** — request/response headers
5. **Response** — response body (lazy-loaded)

### Consent Panel

Lets you inspect and override the consent/cookie state on the inspected page — useful for testing consent mode behavior without manually clearing cookies.

### DataLayer Tab

Separate panel tab that intercepts and displays data layer pushes in real-time:

- **Supported sources**: GTM (`window.dataLayer`), Tealium (`window.utag`), Adobe (`adobeDataLayer` / `_satellite.track`), Segment (`window.analytics`), W3C digitalData
- **Push list**: Color-coded by source, shows event name, push index, and timestamp
- **Detail sub-tabs**:
  1. **Push Data** — raw JSON of the pushed data object
  2. **Diff** — deep diff from previous push (added/removed/changed keys)
  3. **Current State** — cumulative merged state up to the selected push
  4. **Correlation** — network requests within 2s of the push, sorted by delay
- **E-commerce detection**: Automatically detects purchase, checkout, impression, promo, and refund events with formatted product tables
- **Filters**: Text search, source filter, event name, key existence, e-commerce only

### Extension Popup

Click the TagDragon icon in the Chrome toolbar for a quick overview:
- Live request count, total size, average duration, success rate
- Top 5 providers by count with color-coded pills (expandable to all)
- Pause/Resume and Clear buttons
- Warning when DevTools is not open (requests cannot be captured)
- Badge counter on the extension icon shows current request count

### Adobe Environment Switcher

Detects the Adobe Launch/Tags library loaded on the inspected page and lets you switch between DEV/ACC/PROD environments. Uses Chrome's `declarativeNetRequest` API for network-level URL redirection — the redirect persists across page navigations and browser restarts. Configuration is stored per hostname.

## Architecture

### Request Flow

```
chrome.devtools.network.onRequestFinished
  └─ network-capture.ts — match provider, parse POST body, call parseParams()
       └─ panel-bridge.ts — sendMessage to panel (heavy data stored by ID, fetched lazily)
            └─ panel/index.ts — add to state, batch DOM update via requestAnimationFrame
```

### Provider Interface

```typescript
interface Provider {
  name: string;
  color: `#${string}`;
  pattern: RegExp;
  parseParams(url: string, postBody: unknown): Record<string, string | undefined>;
}
```

`getParams(url, postBody)` in `src/providers/url-parser.ts` merges URL query params and POST body (URLencoded or JSON) into one flat object for use inside `parseParams`.

Provider order in `src/providers/index.ts` matters — first match wins. Key ordering constraints: `tealiumEventstream` before `tealium`; Adobe stack ordered `adobeHeartbeat` → `adobeTarget` → `adobeECID` → `adobeAAM` → `adobeDTM` → `adobeLaunchChina` → `adobeAA`; `comscore` before `scorecard`; `googleAds` before `doubleclick`.

### Adobe Environment Redirect

```
Panel (adobe-env-switcher.ts)
  └─ chrome.runtime.sendMessage SET_ADOBE_REDIRECT
       └─ background/index.ts — declarativeNetRequest.updateDynamicRules (rule ID 1001)
            └─ chrome redirects all matching script requests at network level
```

### DataLayer Flow

```
content/data-layer-main.ts (MAIN world)
  └─ intercepts dataLayer.push() / utag.link() / adobeDataLayer / analytics.track() / digitalData Proxy
       └─ window.postMessage → content/data-layer-bridge.ts (ISOLATED world)
            └─ chrome.runtime.sendMessage → background/index.ts
                 └─ named port (devtools_<tabId>) → devtools/data-layer-relay.ts
                      └─ panel window.receiveDataLayerPush() → datalayer/state.ts
                           └─ batched DOM update via requestAnimationFrame
```

## Contributing

To add a new provider:

1. Create a file in `src/providers/` (or a vendor subfolder: `google/`, `adobe/`, `meta/`, `microsoft/`)
2. Implement the `Provider` interface; use `getParams(url, postBody)` for parameter extraction
3. Import and add to `PROVIDERS` in `src/providers/index.ts` — place more specific patterns before broader ones
4. Add the provider `name` to the correct group in `src/shared/provider-groups.ts`
5. Build (`npm run build`) and test with real tracking requests

### Code Style

- 2-space indentation, single quotes, semicolons, trailing commas
- DOM variables: `$` prefix (`$list`, `$envApply`)
- Constants: `SCREAMING_SNAKE_CASE`
- Section headers: `// ─── SECTION NAME ─────`
- All UI strings in **English (en-US)**

## License

ISC
