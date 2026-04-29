<p align="center">
  <img src="assets/logo/logo-512.png" alt="TagDragon" width="128">
</p>

<h1 align="center">TagDragon</h1>

<p align="center">
  <strong>The dragon that sees every tag.</strong><br>
  Debug marketing &amp; analytics tracking requests — right inside Chrome DevTools.
</p>

<p align="center">
  <a href="https://github.com/onbezucha/tagdragon/releases/latest"><img src="https://img.shields.io/github/v/release/onbezucha/tagdragon?style=flat-square&color=blue&label=version" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/onbezucha/tagdragon?style=flat-square" alt="License: ISC"></a>
  <a href="https://www.google.com/chrome/"><img src="https://img.shields.io/badge/chrome-102%2B-brightgreen?style=flat-square" alt="Chrome 102+"></a>
  <a href="https://github.com/onbezucha/tagdragon/stargazers"><img src="https://img.shields.io/github/stars/onbezucha/tagdragon?style=flat-square" alt="Stars"></a>
</p>

<p align="center">
  <a href="https://github.com/onbezucha/tagdragon/releases/latest"><b>Install — Free</b></a> ·
  <a href="https://www.tagdragon.net"><b>Website</b></a> ·
  <a href="https://www.tagdragon.net/docs/getting-started"><b>Docs</b></a> ·
  <a href="CHANGELOG.md"><b>Changelog</b></a>
</p>

<p align="center">
  <em>68 providers · DataLayer Inspector · Consent Panel · No data leaves your browser</em>
</p>

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🔍 Request Capture
Real-time monitoring of tracking requests from 68 providers. Pause/resume, sort, auto-prune.

</td>
<td width="33%" valign="top">

### 🗄️ DataLayer Inspector
Intercept pushes from GTM, Tealium, Adobe, Segment, and W3C digitalData. Deep diff, cumulative state, network correlation, validation, watch paths, and group-by-source.

</td>
<td width="33%" valign="top">

### 🔐 Consent Panel
Inspect and override cookie/consent state. Test consent mode behavior without manually clearing cookies.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### 📊 68 Providers
GA4, Meta, TikTok, LinkedIn, Adobe, Hotjar, Braze, HubSpot, Medallia, Indicative, and 58 more across 9 categories + ungrouped.

</td>
<td width="33%" valign="top">

### 🔄 Adobe Env Switcher
Switch between DEV/ACC/PROD Adobe Launch environments via network-level redirects. Persists across navigations.

</td>
<td width="33%" valign="top">

### 📤 Export
Download captured requests as JSON or CSV. Extension popup with live stats and provider breakdown.

</td>
</tr>
</table>

> **See it in action** — visit [tagdragon.net](https://www.tagdragon.net) for screenshots and a live demo.

---

## 🚀 Quick Start

1. **Download** the latest ZIP from [GitHub Releases](https://github.com/onbezucha/tagdragon/releases/latest)
2. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the unzipped folder
3. Open DevTools on any page → find the **TagDragon** tab

That's it. No configuration needed — tracking requests appear automatically.

### From Source

> Requires [Node.js](https://nodejs.org/) 18+ and Chrome 102+

```bash
git clone https://github.com/onbezucha/tagdragon.git
cd tagdragon
npm install
npm run build
```

For development with live reload:
```bash
npm run dev    # Watches CSS + JS for live changes
```

---

## 📊 Supported Providers

68 providers across 9 categories + ungrouped.

| Category | Count | Providers |
|----------|-------|-----------|
| 📊 Analytics | 15 | GA4, Adobe Client-Side, Adobe Server-Side (AEP WebSDK), Amplitude, Mixpanel, Matomo, Piwik PRO, AT Internet, Comscore, Parse.ly, Webtrends, Scorecard, Medallia DXA, Indicative, RudderStack |
| 🏷️ Tag Managers | 5 | Google Tag Manager, Tealium, Segment, Ensighten, Piwik PRO TM |
| 📢 Marketing & Advertising | 24 | Google Ads, Meta Pixel, Bing Ads, Adform, DoubleClick, Criteo, Seznam Sklik, TikTok, X, Pinterest, The Trade Desk, Reddit, Snapchat, Spotify, Amazon Ads, Outbrain, Teads, RTB House, Zemanta, Sojern, Vibes, Brevo, Invoca, HubSpot |
| 🎥 Session Replay | 5 | Hotjar, Microsoft Clarity, FullStory, Crazy Egg, Glassbox |
| 🧪 A/B Testing | 4 | Optimizely, Dynamic Yield, Split, Omniconvert |
| 👤 Visitor Identification | 4 | LinkedIn, Merkury, Demandbase, 6Sense |
| 💬 Customer Engagement | 3 | Braze, Lytics, Indicative |
| 🗄️ CDP | 2 | mParticle, Tealium EventStream |
| 🍂 Adobe Stack | 6 | Adobe Target, AAM, ECID, Heartbeat, DTM, Launch (CN) |
| 🔧 Other | 2 | Microsoft Clarity Tag, Seznam Sklik |

> **Note:** Some providers appear in multiple contexts. Indicative is grouped under Analytics in the provider registry but also relates to Customer Engagement. Microsoft Clarity Tag (library load detection) is separate from Microsoft Clarity (event tracking) and is ungrouped.

👉 Full provider reference with URL patterns: [tagdragon.net/docs/providers](https://www.tagdragon.net/docs/providers)

---

## 🛠️ Built For Your Workflow

| Use Case | How TagDragon Helps |
|----------|-------------------|
| **QA & Implementation** | Verify tags fire correctly. Catch broken events, missing parameters, and misconfigured pixels before deployment. |
| **Privacy & Compliance** | See exactly what data leaves the browser. Audit payloads for GDPR/CCPA. Use the Consent Panel to test consent mode behavior. |
| **Performance Review** | Identify redundant tracking calls and oversized payloads. Auto-pruning keeps things fast on high-traffic sites. |
| **Adobe Stack Debugging** | Switch DEV/ACC/PROD environments at the network level. Debug Launch, Analytics, Target, and AAM in one panel. |
| **DataLayer Validation** | Define custom validation rules for data layer pushes. Watch specific paths, detect missing keys, and validate e-commerce events. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Clear all requests |
| `Ctrl+F` | Focus search input |
| `↑ / ↓` | Navigate list |
| `Esc` | Clear search / close panel |

👉 Full shortcut reference: [tagdragon.net/docs/keyboard-shortcuts](https://www.tagdragon.net/docs/keyboard-shortcuts)

---

## 🧪 Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode — rebuilds CSS + JS on changes |
| `npm run build` | Production build (minified) |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier auto-format |
| `npm run format:check` | Prettier check (CI) |
| `npm run test` | Vitest run all tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run analyze` | Build with bundle visualizer → `dist/stats.html` |
| `npm run generate-icons` | Regenerate extension icons |

Pre-commit hooks (Husky + lint-staged) auto-lint and format staged `.ts` files.

---

## 📖 Documentation

Full documentation available at [tagdragon.net/docs](https://www.tagdragon.net/docs/getting-started).

| Page | Description |
|------|-------------|
| [Getting Started](https://www.tagdragon.net/docs/getting-started) | Installation and first steps |
| [Features](https://www.tagdragon.net/docs/features) | Complete feature overview |
| [DataLayer Tab](https://www.tagdragon.net/docs/datalayer) | DataLayer inspector guide |
| [Consent Panel](https://www.tagdragon.net/docs/consent-panel) | Consent testing guide |
| [Provider Reference](https://www.tagdragon.net/docs/providers) | All 68 providers |
| [Adobe Env Switcher](https://www.tagdragon.net/docs/adobe-env-switcher) | Adobe environment switching |
| [Toolbar Reference](https://www.tagdragon.net/docs/toolbar-reference) | Complete UI reference |
| [FAQ](https://www.tagdragon.net/docs/faq) | Frequently asked questions |

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and how to add a new provider.

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting policy. Key points:

- All user-visible strings are HTML-escaped
- No external network calls — data stays in your browser
- Adobe redirect URLs are validated against an allowlist
- Cookie access only via explicit user interaction

---

## 📄 License

[ISC](LICENSE) © [Ondřej Bezucha](https://github.com/onbezucha)

---

<p align="center">
  <strong><a href="https://www.tagdragon.net">Website</a></strong> ·
  <strong><a href="https://www.tagdragon.net/docs/getting-started">Docs</a></strong> ·
  <strong><a href="https://github.com/onbezucha/tagdragon/releases">Releases</a></strong> ·
  <strong><a href="https://github.com/onbezucha/tagdragon/issues">Issues</a></strong>
</p>
