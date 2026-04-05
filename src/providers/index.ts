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

// Adobe (most specific first — see ordering note in PROVIDERS below)
import { aepWebSDK } from './adobe/aep-websdk';
import { adobeHeartbeat } from './adobe/heartbeat';
import { adobeTarget } from './adobe/target';
import { adobeECID } from './adobe/ecid';
import { adobeAAM } from './adobe/aam';
import { adobeDTM } from './adobe/dtm';
import { adobeLaunchChina } from './adobe/launch-china';
import { adobeAA } from './adobe/analytics';

// Meta
import { metaPixel } from './meta/pixel';

// Microsoft
import { bingAds } from './microsoft/bing-ads';
import { microsoftClarity } from './microsoft/clarity';

// Analytics
import { amplitude } from './amplitude';
import { mixpanel } from './mixpanel';
import { matomo } from './matomo';
import { piwikProTm } from './piwik-pro-tm';
import { piwikPro } from './piwik-pro';
import { atInternet } from './at-internet';
import { parsely } from './parsely';
import { webtrends } from './webtrends';
import { comscore } from './comscore';
import { scorecard } from './scorecard';

// Social / Ad pixels
import { tiktokPixel } from './tiktok';
import { twitterPixel } from './twitter-pixel';
import { pinterestPixel } from './pinterest';
import { redditPixel } from './reddit-pixel';
import { snapchatPixel } from './snapchat-pixel';
import { spotifyPixel } from './spotify-pixel';
import { amazonAds } from './amazon-ads';

// CDP / Event streaming
import { segment } from './segment';
import { rudderstack } from './rudderstack';
import { mparticle } from './mparticle';
import { tealiumEventstream } from './tealium-eventstream';
import { tealium } from './tealium';

// Marketing / DSP
import { theTradeDesk } from './thetradedesk';
import { adform } from './adform';
import { doubleclick } from './doubleclick';
import { criteo } from './criteo';
import { hubspot } from './hubspot';
import { outbrain } from './outbrain';
import { teads } from './teads';
import { rtbHouse } from './rtb-house';
import { zemanta } from './zemanta';
import { sojern } from './sojern';
import { vibes } from './vibes';
import { invoca } from './invoca';
import { brevo } from './brevo';

// Session Replay / UX
import { hotjar } from './hotjar';
import { fullstory } from './fullstory';
import { crazyEgg } from './crazy-egg';
import { glassbox } from './glassbox';
import { medallia } from './medallia';

// A/B Testing / Experimentation
import { optimizely } from './optimizely';
import { dynamicYield } from './dynamic-yield';
import { omniconvert } from './omniconvert';
import { splitIo } from './split-io';

// Visitor Identification / ABM
import { linkedin } from './linkedin';
import { demandbase } from './demandbase';
import { sixsense } from './sixsense';

// Customer Engagement / CRM
import { braze } from './braze';
import { lytics } from './lytics';
import { indicative } from './indicative';

// Tag Managers (other)
import { ensighten } from './ensighten';

// Others
import { seznamSklik } from './seznam-sklik';
import { merkury } from './merkury';

/**
 * All registered providers, in matching priority order.
 * Order matters: first match wins.
 * Key ordering rules:
 *   - tealiumEventstream before tealium (collect.tealiumiq.com/event vs collect.tealiumiq.com)
 *   - piwikProTm before piwikPro (different paths on piwik.pro)
 *   - aepWebSDK → adobeHeartbeat → adobeTarget → adobeECID → adobeAAM → adobeDTM → adobeLaunchChina → adobeAA
 *     (specific omtrdc/demdex patterns before broad adobeAA)
 *   - comscore before scorecard (scorecardresearch.com/b before /p)
 *   - googleAds before doubleclick
 */
export const PROVIDERS: ProviderRegistry = [
  // Google
  ga4,
  gaUA,
  gtm,
  googleAds,

  // Social / Ad pixels
  metaPixel,
  tiktokPixel,
  twitterPixel,
  pinterestPixel,
  redditPixel,
  snapchatPixel,
  spotifyPixel,
  amazonAds,

  // CDP / Event streaming
  segment,
  rudderstack,
  mparticle,
  tealiumEventstream,   // before tealium — collect.tealiumiq.com/event is more specific
  tealium,

  // Analytics
  amplitude,
  mixpanel,
  matomo,
  piwikProTm,           // before piwikPro
  piwikPro,
  atInternet,
  parsely,
  webtrends,
  comscore,             // before scorecard — scorecardresearch.com/b before /p
  scorecard,

  // Session Replay / UX
  hotjar,
  microsoftClarity,
  fullstory,
  crazyEgg,
  glassbox,
  medallia,

  // A/B Testing / Experimentation
  optimizely,
  dynamicYield,
  omniconvert,
  splitIo,

  // Adobe (specific → broad)
  aepWebSDK,
  adobeHeartbeat,       // heartbeat.omtrdc.net before adobeTarget
  adobeTarget,          // tt.omtrdc.net before adobeAA
  adobeECID,            // demdex.net/id before adobeAAM and adobeAA
  adobeAAM,             // dpm.demdex.net before adobeAA
  adobeDTM,
  adobeLaunchChina,
  adobeAA,              // broadest Adobe pattern — last

  // Marketing / DSP
  bingAds,
  theTradeDesk,
  adform,
  doubleclick,
  criteo,
  outbrain,
  teads,
  rtbHouse,
  zemanta,
  sojern,
  vibes,
  invoca,
  brevo,
  hubspot,

  // Visitor Identification / ABM
  linkedin,
  demandbase,
  sixsense,

  // Customer Engagement / CRM
  braze,
  lytics,
  indicative,

  // Tag Managers (other)
  ensighten,

  // Others
  seznamSklik,
  merkury,
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
