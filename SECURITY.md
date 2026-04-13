# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.6.x   | Yes       |
| < 1.6   | No        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately via GitHub's built-in mechanism:
[Report a vulnerability](https://github.com/onbezucha/tagdragon/security/advisories/new)

Alternatively, email the maintainer directly (see GitHub profile).

### What to include

- Description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept
- Chrome version and TagDragon version affected
- Any suggested fix (optional)

### Response timeline

- Acknowledgement within 3 business days
- Assessment and fix timeline communicated within 7 days

## Scope

TagDragon is a Chrome DevTools extension. Relevant security concerns include:

- **XSS via captured request data** — all user-visible strings are HTML-escaped via `esc()` in `src/panel/utils/format.ts`
- **Adobe redirect injection** — redirect URLs are validated against an allowlist before being applied as declarative net rules
- **Cookie access** — the extension reads cookies only via `chrome.cookies` API with explicit user interaction (Consent Panel)
- **No external network calls** — all captured data stays in the browser; no telemetry, no remote logging

Out of scope: vulnerabilities that require physical access to the device or compromise of Chrome itself.
