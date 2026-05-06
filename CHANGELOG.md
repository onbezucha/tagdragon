# Changelog

All notable changes to TagDragon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2025-07-24

### Changed
- Version bump to 1.7.0
- Documentation overhaul — updated README.md, CONTRIBUTING.md, CHANGELOG.md, JEAN.md, .gitignore, .prettierignore to reflect current project state (67 providers, 83 test files, GitHub Actions CI/CD, 28 CSS modules)

## [1.6.5] - 2026-07-17

### Changed
- Version bump to 1.6.5

## [1.6.1] - 2026-07-17

### Fixed
- Removed unused `tabs` permission (Chrome Web Store violation: Purple Potassium)

## [1.6.0] - 2026-04-08

### Added
- ESLint + Prettier — code style enforcement with TypeScript rules; `npm run lint`, `npm run format`, `npm run format:check`
- Pre-commit hooks — Husky + lint-staged automatically lints and formats staged `.ts` files before each commit
- Bundle analysis — `npm run analyze` builds with rollup-plugin-visualizer and opens `dist/stats.html`
- `CONTRIBUTING.md` — setup guide, available scripts, step-by-step provider contribution instructions, PR guidelines
- `SECURITY.md` — vulnerability reporting policy and extension security scope
- CI pipeline improvements — lint and format checks added before build step

### Fixed
- DataLayer sort order — batched pushes (e.g. on DevTools open) now render in correct order for `desc` sort; previously the batch was prepended as oldest-first, making newest appear at the bottom
- DataLayer sort — `keycount` and `source` sort fields now trigger a full list re-render on new pushes instead of appending in arrival order
- DataLayer group by source — "Group by source" setting is now persisted across DevTools sessions via `AppConfig`; previously the setting reset to `false` on every open
- `clearDlPushes()` no longer resets `dlGroupBySource` — sort/view preferences are independent of captured data
- Removed unused `getValidationErrors` and `setValidationErrors` imports from `panel/index.ts` (TypeScript warnings)

### Changed
- `panel/index.ts` — `initKeyboardHandlers` extracted to `src/panel/keyboard-shortcuts.ts`; `initSplitter` extracted to `src/panel/splitter.ts`
- Replaced all `any` type assertions with precise types: `_categorized` field added to `ParsedRequest`, `Window._getHeavyData` declared via `declare global`, Chrome API callbacks typed with `unknown` + type guards
- `dlGroupBySource` added to `AppConfig` (default `false`)

## [1.5.6] - 2026-07-17

### Added
- DataLayer validation engine — rule-based push validation with preset rules (required keys, key types, forbidden keys) and custom rule support
- DataLayer watch paths — pin specific dot-notation paths in the Live Inspector for focused monitoring (up to 10 paths)
- DataLayer group by source — organize push list by source (GTM, Tealium, Adobe, Segment, digitalData)
- DataLayer sort — configurable sort by time, key count, or source (persisted across sessions)
- DataLayer auto-prune — automatically prunes oldest pushes when limit (1000) is reached
- DataLayer configurable correlation window — adjustable forward window and lookback for correlation matching
- DataLayer filter popover — filter pushes by event name, key existence, e-commerce events, and source
- Provider icon caching — `src/panel/utils/provider-icon.ts` with `buildGroupIcon()` and `getCachedIcon()` for fast SVG icon rendering
- `src/types/har.ts` — HAR post data interface type
- `src/types/index.ts` — barrel re-export of all type modules

### Changed
- Reorganized DataLayer panel files into `components/` (push-list, push-detail, live-inspector) and `utils/` (diff-renderer, ecommerce-formatter, correlation, reverse-correlation, validator)
- Renamed `src/panel/tabs/` → `src/panel/detail-tabs/` (network request detail tabs)
- Optimized cumulative state computation — shared mutable state with `structuredClone` snapshots instead of per-push shallow copies
- Added `dlSortField` and `dlSortOrder` to persisted `AppConfig`

## [1.5.5] - 2026-07-09

### Added
- Medallia DXA provider — Session Replay / UX analytics
- Indicative provider — Customer Engagement analytics
- Microsoft Clarity Tag provider — Library load detection (separate from Clarity event tracking)
- Tooltip system (`src/panel/utils/tooltip.ts`) — Shared tooltip system with event delegation
- Provider type definitions (`src/types/provider.ts`) — Provider and ProviderRegistry type definitions

### Changed
- Provider count increased from 64 to 67 (note: later consolidated)
- Microsoft Clarity Tag is now ungrouped (falls into UNGROUPED fallback)
- Added domain index and `matchProvider()` function to `src/providers/index.ts` for faster URL matching

## [1.5.3] - 2026-04-05

### Fixed
- Fixed version display in popup footer (`public/popup.html`) — footer now correctly shows `v1.5.3` instead of stale version string

### Changed
- Removed unused `@providers/*` path alias from TypeScript configuration (`tsconfig.json`) — only the `@/*` → `src/*` alias remains; no imports in the codebase used the removed alias

## [1.5.2] - 2026-04-05

### Changed
- Internal improvements and bug fixes

## [1.5.0] - 2026-04-04

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

## [1.4.1] - 2026-03-23

### Fixed
- Bug fixes and stability improvements

## [1.3.4] - 2026-03-20

### Fixed
- Bug fixes and stability improvements

## [1.3.3] - 2026-03-20

### Fixed
- Bug fixes and stability improvements
