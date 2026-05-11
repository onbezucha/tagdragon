// ─── PROVIDER REGISTRY ───────────────────────────────────────────────────────
// Central registry of all tracking providers.
// To add a new provider: 1) create a file in the appropriate directory,
//                        2) import it here, 3) add it to the PROVIDERS array.

import type { Provider, ProviderRegistry } from '@/types/provider';

// Google
import { ga4 } from './google/ga4';
import { gtm } from './google/gtm';
import { googleAds } from './google/google-ads';

// Adobe (most specific first — see ordering note in PROVIDERS below)
import { aepWebSDK } from './adobe/aep-websdk';
import { adobeTarget } from './adobe/target';
import { adobeECID } from './adobe/ecid';
import { adobeLaunchChina } from './adobe/launch-china';
import { adobeAA } from './adobe/analytics';

// Meta
import { metaPixel } from './meta/pixel';

// Microsoft
import { bingAds } from './microsoft/bing-ads';
import { microsoftClarity } from './microsoft/clarity';
import { microsoftClarityTag } from './microsoft/clarity-tag';

// Analytics
import { amplitude } from './amplitude';
import { mixpanel } from './mixpanel';
import { matomo } from './matomo';
import { piwikProTm } from './piwik-pro-tm';
import { piwikPro } from './piwik-pro';
import { atInternet } from './at-internet';
import { parsely } from './parsely';
import { comscore } from './comscore';

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
import { sojern } from './sojern';

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

// Tag Managers (other)
import { ensighten } from './ensighten';

// Others
import { seznamSklik } from './seznam-sklik';

/**
 * All registered providers, in matching priority order.
 * Order matters: first match wins.
 * Key ordering rules:
 *   - tealiumEventstream before tealium (collect.tealiumiq.com/event vs collect.tealiumiq.com)
 *   - piwikProTm before piwikPro (different paths on piwik.pro)  *   - aepWebSDK → adobeTarget → adobeECID → adobeLaunchChina → adobeAA
 *     (specific omtrdc/demdex patterns before broad adobeAA)
 *   - comscore handles all scorecardresearch.com endpoints (/b, /p, sb.)
 *   - googleAds before doubleclick
 */
export const PROVIDERS: ProviderRegistry = [
  // Google
  ga4,
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
  tealiumEventstream, // before tealium — collect.tealiumiq.com/event is more specific
  tealium,

  // Analytics
  amplitude,
  mixpanel,
  matomo,
  piwikProTm, // before piwikPro
  piwikPro,
  atInternet,
  parsely,
  comscore, // handles all scorecardresearch.com endpoints (/b, /p, sb.)

  // Session Replay / UX
  hotjar,
  microsoftClarityTag,
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
  adobeTarget, // tt.omtrdc.net
  adobeECID, // demdex.net/id
  adobeLaunchChina,
  adobeAA, // broadest Adobe pattern — last

  // Marketing / DSP
  bingAds,
  theTradeDesk,
  adform,
  doubleclick,
  criteo,
  outbrain,
  teads,
  rtbHouse,
  sojern,
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

  // Tag Managers (other)
  ensighten,

  // Others
  seznamSklik,
] as const;

// ─── DOMAIN INDEX ────────────────────────────────────────────────────────────
// Pre-built index: hostname → provider indices for fast first-pass lookup.
// Providers whose pattern doesn't start with a specific domain are indexed
// under a special generic list for full-scan fallback.

const domainIndex = new Map<string, number[]>();
const genericIndices: number[] = [];

function buildDomainIndex(): void {
  PROVIDERS.forEach((provider, idx) => {
    const pattern = provider.pattern.source;

    // Try to extract a hostname from the regex pattern
    // Patterns like: /google-analytics\.com\/g\/collect/
    const domainMatch = pattern.match(/([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/);

    if (domainMatch) {
      const fullDomain = domainMatch[0];
      const parts = fullDomain.split('.');
      // Use last 2-3 parts as key (e.g. "google-analytics.com")
      const key = parts.length >= 3 && parts[0] !== 'www' ? parts.slice(1).join('.') : fullDomain;

      if (!domainIndex.has(key)) {
        domainIndex.set(key, []);
      }
      domainIndex.get(key)!.push(idx);
    } else {
      genericIndices.push(idx);
    }
  });
}

// Build once at module load
buildDomainIndex();

/**
 * Lightweight hostname extractor — avoids allocating a full URL object.
 * Used in the hot path where `new URL().hostname` is called for every request.
 */
function extractHostname(url: string): string {
  // Fast path: skip protocol
  let start = url.indexOf('//');
  if (start === -1) start = 0;
  else start += 2;
  // Skip auth (user:pass@)
  const atPos = url.indexOf('@', start);
  if (atPos !== -1 && atPos < url.indexOf('/', start)) start = atPos + 1;
  // Find end of host
  const pathStart = url.indexOf('/', start);
  const portStart = url.indexOf(':', start);
  let end = pathStart === -1 ? url.length : pathStart;
  if (portStart !== -1 && portStart < end) end = portStart;
  // Handle [ipv6]
  if (url[start] === '[') {
    const bracketEnd = url.indexOf(']', start);
    return url.substring(start + 1, bracketEnd === -1 ? end : bracketEnd);
  }
  return url.substring(start, end);
}

/**
 * Find the first provider whose pattern matches the given URL.
 * Uses domain-first lookup for fast matching, falls back to full scan.
 */
export function matchProvider(url: string): Provider | null {
  try {
    const hostname = extractHostname(url);

    // Test exact hostname matches first (most likely match)
    const exact = domainIndex.get(hostname);
    if (exact) {
      for (const idx of exact) {
        const p = PROVIDERS[idx].pattern;
        if (p.flags.includes('g')) p.lastIndex = 0;
        if (p.test(url)) return PROVIDERS[idx];
      }
    }

    // Test parent domain matches
    const dotIdx = hostname.indexOf('.');
    if (dotIdx > 0) {
      const parent = hostname.slice(dotIdx + 1);
      const parentMatch = domainIndex.get(parent);
      if (parentMatch) {
        for (const idx of parentMatch) {
          const p = PROVIDERS[idx].pattern;
          if (p.flags.includes('g')) p.lastIndex = 0;
          if (p.test(url)) return PROVIDERS[idx];
        }
      }
    }

    // Test www.-stripped matches
    if (hostname.startsWith('www.')) {
      const withoutWww = hostname.slice(4);
      const wwwMatch = domainIndex.get(withoutWww);
      if (wwwMatch) {
        for (const idx of wwwMatch) {
          const p = PROVIDERS[idx].pattern;
          if (p.flags.includes('g')) p.lastIndex = 0;
          if (p.test(url)) return PROVIDERS[idx];
        }
      }
    }

    // Then test generic providers
    for (const idx of genericIndices) {
      const p = PROVIDERS[idx].pattern;
      if (p.flags.includes('g')) p.lastIndex = 0;
      if (p.test(url)) return PROVIDERS[idx];
    }
  } catch {
    // URL parsing failed, fall through to full scan
  }

  // Fallback: full scan (should rarely be reached)
  return (
    PROVIDERS.find((p) => {
      if (p.pattern.flags.includes('g')) p.pattern.lastIndex = 0;
      return p.pattern.test(url);
    }) ?? null
  );
}
