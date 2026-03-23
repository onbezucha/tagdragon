# 🐉 TagDragon

<div align="center">

**The dragon that sees every tag. Chrome DevTools extension for capturing and decoding marketing/analytics tracking requests.**

[![Chrome Extension Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/yourusername/TagDragon)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-88+-brightgreen.svg)](https://www.google.com/chrome/)

*Manifest V3 • TypeScript • Rollup • Tailwind CSS*

</div>

---

## Overview

**TagDragon v1.4.0** is a Chrome DevTools extension that captures network requests from analytics and marketing platforms, decodes them into human-readable format, and provides advanced filtering and search capabilities.

### Key Features

- **Real-time Request Capture** — Monitor tracking requests as they happen
- **Multi-Provider Support** — Decode requests from 68 tracking platforms across 9 categories
- **Provider Filter Popover** — Filter by provider via a toolbar icon; hidden providers persist across restarts
- **Search & Advanced Filtering** — Filter by URL, parameter name/value, event type, HTTP method, status, user ID
- **Active Filter Chips** — Visual chips for active filters (hidden providers, search text, etc.) with one-click removal
- **Detailed Analysis** — View decoded parameters, query strings, POST bodies, headers, and responses
- **Consent Panel** — Inspect and override cookie/consent state on the inspected page
- **Export** — Export captured requests as JSON
- **Adobe Environment Switcher** — Switch between DEV/ACC/PROD Adobe Launch environments using network-level redirects
- **Performance Optimized** — Efficient handling of large request volumes with configurable auto-pruning
- **Keyboard Shortcuts** — Power-user friendly navigation

## Installation

### From GitHub Release (no build required)

1. Download `TagDragon-v1.4.0.zip` from the [Releases page](https://github.com/yourusername/TagDragon/releases)
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
│   ├── background/             # Service worker (declarativeNetRequest rules)
│   ├── devtools/               # DevTools registration + network capture
│   ├── panel/                  # Panel UI
│   │   ├── components/         # UI components (provider-bar, filter-bar, detail-pane, adobe-env-switcher, consent-panel, status-bar, …)
│   │   ├── tabs/               # Detail tabs (decoded, query, POST, headers, response)
│   │   ├── utils/              # DOM helpers, formatting, filtering, categorization
│   │   ├── state.ts            # Centralized state
│   │   ├── theme.ts            # Dark/light theme
│   │   └── index.ts            # Panel controller
│   ├── popup/                  # Extension popup
│   ├── providers/              # 68 tracking provider implementations
│   │   ├── google/             # GA4, UA, GTM, Google Ads
│   │   ├── adobe/              # Adobe AA, AEP Web SDK, Target, AAM, ECID, Heartbeat, DTM, Launch (CN)
│   │   ├── meta/               # Meta Pixel
│   │   ├── microsoft/          # Bing Ads, Microsoft Clarity
│   │   └── …                   # 50+ standalone providers
│   ├── shared/                 # Constants, parameter categories, provider groups
│   └── types/                  # TypeScript type definitions
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
| **Adobe Analytics** | `sc.omtrdc.net`, `2o7.net`, `/b/ss/`, `demdex.net` |
| **Adobe AEP Web SDK** | `/ee/*/v*/interact`, `*.adobedc.net` |
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
- **⇅ Sort Order** — toggle oldest/newest first
- **↩ Wrap Values** — wrap long parameter values
- **📑 Auto-expand** — auto-expand detail sections on select
- **🔽 Provider Filter** — opens a popover to show/hide individual providers grouped by category; hidden providers persist across DevTools restarts
- **⚙ Settings** — performance settings (max requests, auto-prune), keyboard shortcuts, theme

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

Provider order in `src/providers/index.ts` matters — first match wins. Key ordering constraints: `tealiumEventstream` before `tealium`; Adobe stack ordered `adobeHeartbeat` → `adobeTarget` → `adobeECID` → `adobeAAM` → `adobeDTM` → `adobeAA`; `comscore` before `scorecard`; `googleAds` before `doubleclick`.

### Adobe Environment Redirect

```
Panel (adobe-env-switcher.ts)
  └─ chrome.runtime.sendMessage SET_ADOBE_REDIRECT
       └─ background/index.ts — declarativeNetRequest.updateDynamicRules (rule ID 1001)
            └─ chrome redirects all matching script requests at network level
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
