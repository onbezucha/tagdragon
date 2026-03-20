// ─── PROVIDER REGISTRY ───────────────────────────────────────────────────────
// Central registry of all tracking providers.
// To add a new provider: 1) create a file in the appropriate directory,
//                        2) import it here, 3) add it to the PROVIDERS array.

import type { Provider, ProviderRegistry } from '@/types/provider';

// Google
import { ga4 } from './google/ga4';
import { gaUA } from './google/ga-ua';
import { gtm } from './google/gtm';
import { googleAds } from './google/google-ads';

// Adobe
import { adobeAA } from './adobe/analytics';
import { aepWebSDK } from './adobe/aep-websdk';

// Meta
import { metaPixel } from './meta/pixel';

// Microsoft
import { bingAds } from './microsoft/bing-ads';

// Others
import { hotjar } from './hotjar';
import { tealium } from './tealium';
import { linkedin } from './linkedin';
import { seznamSklik } from './seznam-sklik';
import { adform } from './adform';
import { doubleclick } from './doubleclick';
import { criteo } from './criteo';
import { scorecard } from './scorecard';

/**
 * All registered providers, in matching priority order.
 * Order matters: first match wins (e.g. GA4 must be before UA).
 * Google Ads must come before DV360 (more specific doubleclick pattern).
 */
export const PROVIDERS: ProviderRegistry = [
  ga4,
  gaUA,
  gtm,
  metaPixel,
  hotjar,
  tealium,
  adobeAA,
  aepWebSDK,
  linkedin,
  seznamSklik,
  bingAds,
  googleAds,
  adform,
  doubleclick,
  criteo,
  scorecard,
] as const;

/**
 * Find the first provider whose pattern matches the given URL.
 */
export function matchProvider(url: string): Provider | null {
  return PROVIDERS.find(p => p.pattern.test(url)) ?? null;
}

/**
 * Get all registered providers (for UI listing).
 */
export function getAllProviders(): ProviderRegistry {
  return PROVIDERS;
}
