---
name: TagDragon project overview
description: Chrome DevTools extension for debugging tracking tags (GA4, Adobe Analytics, Meta Pixel etc.) — architecture, tech stack, key files
type: project
---

TagDragon is a Chrome DevTools extension (Manifest V3) for capturing and decoding network requests from 15+ marketing/analytics tracking providers.

**Tech stack:** TypeScript, Rollup, Tailwind CSS
**Build:** `npm run build` (Rollup IIFE bundles → dist/)

**Architecture:**
- `src/background/` — service worker capturing requests from other extensions
- `src/devtools/` — network capture (chrome.devtools.network) + panel bridge
- `src/panel/` — main UI: state.ts (centralized state), components/, tabs/, utils/
- `src/providers/` — 15 tracking provider parsers (GA4, Adobe AA, Meta Pixel, etc.)
- `src/types/` — TypeScript interfaces
- `src/shared/` — constants + categories

**State management:** Centralized in state.ts with getter/setter functions. No direct object exports (deprecated ones removed in 2026-03 review).

**Why:** Version in manifest.json (1.3.0) is authoritative — package.json was wrong at 2.0.0, corrected in code review.
**How to apply:** Always treat manifest.json version as the source of truth.
