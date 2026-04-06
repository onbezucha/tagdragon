# Changelog

All notable changes to TagDragon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.3] - 2025-04-05

### Fixed
- Fixed version display in popup footer (`public/popup.html`) — footer now correctly shows `v1.5.3` instead of stale version string

### Changed
- Removed unused `@providers/*` path alias from TypeScript configuration (`tsconfig.json`) — only the `@/*` → `src/*` alias remains; no imports in the codebase used the removed alias

## [1.5.2] - 2025-04-05

### Changed
- Internal improvements and bug fixes

## [1.5.0] - 2025-04-04

### Added
- DataLayer Inspector — intercept and inspect data layer pushes from GTM, Tealium, Adobe, Segment, and W3C digitalData
- DataLayer diff view, cumulative state, and network correlation
- E-commerce event detection (purchase, checkout, impression, promo, refund)
- Consent Panel — inspect and override cookie/consent state
- Clear Cookies button — delete all cookies for the inspected page
- Adobe Environment Switcher — switch DEV/ACC/PROD via network-level redirects
- Extension Popup — live stats, provider breakdown, pause/clear controls
- Badge counter on extension icon

### Changed
- Improved request visualization

## [1.4.1] - 2025-03-23

### Fixed
- Bug fixes and stability improvements

## [1.3.4] - 2025-03-20

### Fixed
- Bug fixes and stability improvements

## [1.3.3] - 2025-03-20

### Fixed
- Bug fixes and stability improvements