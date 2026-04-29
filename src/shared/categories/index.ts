// ─── PARAMETER CATEGORIZATION (Barrel) ────────────────────────────────────
// Provider-First Architecture: each provider defines its OWN complete set of categories.
// Categories are sorted by 'order' field (1 = top, 999 = bottom).
// Matching: prefixMatch (fast string startsWith) runs before patterns (regex).

import type { AllProviderCategories } from '@/types/categories';

// Google
import { GA4_CATEGORIES } from './google/ga4';
import { GOOGLE_ADS_CATEGORIES } from './google/google-ads';
import { GTM_CATEGORIES } from './google/gtm';

// Adobe
import { ANALYTICS_CLIENT_CATEGORIES } from './adobe/analytics-client';
import { ANALYTICS_SERVER_CATEGORIES } from './adobe/analytics-server';
import { TARGET_CATEGORIES } from './adobe/target';
import { AAM_CATEGORIES } from './adobe/aam';
import { ECID_CATEGORIES } from './adobe/ecid';
import { HEARTBEAT_CATEGORIES } from './adobe/heartbeat';
import { DTM_CATEGORIES } from './adobe/dtm';
import { LAUNCH_CHINA_CATEGORIES } from './adobe/launch-china';

// Meta
import { PIXEL_CATEGORIES } from './meta/pixel';

// Microsoft
import { CLARITY_CATEGORIES } from './microsoft/clarity';
import { BING_ADS_CATEGORIES } from './microsoft/bing-ads';

// Marketing
import { ADFORM_CATEGORIES } from './marketing/adform';
import { AMAZON_ADS_CATEGORIES } from './marketing/amazon-ads';
import { BREVO_CATEGORIES } from './marketing/brevo';
import { CRITEO_CATEGORIES } from './marketing/criteo';
import { DOUBLECLICK_CATEGORIES } from './marketing/doubleclick';
import { HUBSPOT_CATEGORIES } from './marketing/hubspot';
import { INVOCA_CATEGORIES } from './marketing/invoca';
import { LINKEDIN_CATEGORIES } from './marketing/linkedin';
import { OUTBRAIN_CATEGORIES } from './marketing/outbrain';
import { PINTEREST_CATEGORIES } from './marketing/pinterest';
import { REDDIT_CATEGORIES } from './marketing/reddit';
import { RTB_HOUSE_CATEGORIES } from './marketing/rtb-house';
import { SKLIK_CATEGORIES } from './marketing/seznam-sklik';
import { SNAPCHAT_CATEGORIES } from './marketing/snapchat';
import { SOJERN_CATEGORIES } from './marketing/sojern';
import { SPOTIFY_CATEGORIES } from './marketing/spotify';
import { TEADS_CATEGORIES } from './marketing/teads';
import { THE_TRADE_DESK_CATEGORIES } from './marketing/thetradedesk';
import { TIKTOK_CATEGORIES } from './marketing/tiktok';
import { TWITTER_PIXEL_CATEGORIES } from './marketing/twitter-pixel';
import { VIBES_CATEGORIES } from './marketing/vibes';
import { ZEMANTA_CATEGORIES } from './marketing/zemanta';

// Analytics
import { AMPLITUDE_CATEGORIES } from './analytics/amplitude';
import { AT_INTERNET_CATEGORIES } from './analytics/at-internet';
import { COMSCORE_CATEGORIES } from './analytics/comscore';
import { CRAZY_EGG_CATEGORIES } from './analytics/crazy-egg';
import { FULLSTORY_CATEGORIES } from './analytics/fullstory';
import { GLASSBOX_CATEGORIES } from './analytics/glassbox';
import { HOTJAR_CATEGORIES } from './analytics/hotjar';
import { INDICATIVE_CATEGORIES } from './analytics/indicative';
import { MATOMO_CATEGORIES } from './analytics/matomo';
import { MEDALLIA_CATEGORIES } from './analytics/medallia';
import { MIXPANEL_CATEGORIES } from './analytics/mixpanel';
import { PARSELY_CATEGORIES } from './analytics/parsely';
import { PIWIK_PRO_CATEGORIES } from './analytics/piwik-pro';
import { RUDDERSTACK_CATEGORIES } from './analytics/rudderstack';
import { SCORECARD_CATEGORIES } from './analytics/scorecard';
import { WEBTRENDS_CATEGORIES } from './analytics/webtrends';

// Tag Manager
import { ENSIGHTEN_CATEGORIES } from './tagmanager/ensighten';
import { PIWIK_PRO_TM_CATEGORIES } from './tagmanager/piwik-pro-tm';
import { SEGMENT_CATEGORIES } from './tagmanager/segment';
import { TEALIUM_CATEGORIES } from './tagmanager/tealium';

// A/B Testing
import { DYNAMIC_YIELD_CATEGORIES } from './abtesting/dynamic-yield';
import { OMNICONVERT_CATEGORIES } from './abtesting/omniconvert';
import { OPTIMIZELY_CATEGORIES } from './abtesting/optimizely';
import { SPLIT_CATEGORIES } from './abtesting/split';

// Visitor Identification
import { DEMANDBASE_CATEGORIES } from './visitorid/demandbase';
import { MERKURY_CATEGORIES } from './visitorid/merkury';
import { SIXSENSE_CATEGORIES } from './visitorid/sixsense';

// Customer Engagement
import { BRAZE_CATEGORIES } from './engagement/braze';
import { LYTICS_CATEGORIES } from './engagement/lytics';

// CDP
import { MPARTICLE_CATEGORIES } from './cdp/mparticle';
import { TEALIUM_EVENTSTREAM_CATEGORIES } from './cdp/tealium-eventstream';

export const PROVIDER_CATEGORIES: AllProviderCategories = {
  // Google
  GA4: GA4_CATEGORIES,
  'Google Ads': GOOGLE_ADS_CATEGORIES,
  GTM: GTM_CATEGORIES,

  // Adobe
  'Adobe Client-Side': ANALYTICS_CLIENT_CATEGORIES,
  'Adobe Server-Side': ANALYTICS_SERVER_CATEGORIES,
  'Adobe Target': TARGET_CATEGORIES,
  'Adobe AAM': AAM_CATEGORIES,
  'Adobe ECID': ECID_CATEGORIES,
  'Adobe Heartbeat': HEARTBEAT_CATEGORIES,
  'Adobe DTM': DTM_CATEGORIES,
  'Adobe Launch (CN)': LAUNCH_CHINA_CATEGORIES,

  // Meta
  'Meta Pixel': PIXEL_CATEGORIES,

  // Microsoft
  'Microsoft Clarity': CLARITY_CATEGORIES,
  'Bing Ads': BING_ADS_CATEGORIES,

  // Marketing
  Adform: ADFORM_CATEGORIES,
  'Amazon Ads': AMAZON_ADS_CATEGORIES,
  Brevo: BREVO_CATEGORIES,
  Criteo: CRITEO_CATEGORIES,
  DoubleClick: DOUBLECLICK_CATEGORIES,
  HubSpot: HUBSPOT_CATEGORIES,
  Invoca: INVOCA_CATEGORIES,
  LinkedIn: LINKEDIN_CATEGORIES,
  Outbrain: OUTBRAIN_CATEGORIES,
  'Pinterest Pixel': PINTEREST_CATEGORIES,
  'Reddit Pixel': REDDIT_CATEGORIES,
  'RTB House': RTB_HOUSE_CATEGORIES,
  Sklik: SKLIK_CATEGORIES,
  'Snapchat Pixel': SNAPCHAT_CATEGORIES,
  Sojern: SOJERN_CATEGORIES,
  'Spotify Pixel': SPOTIFY_CATEGORIES,
  Teads: TEADS_CATEGORIES,
  'The Trade Desk': THE_TRADE_DESK_CATEGORIES,
  'TikTok Pixel': TIKTOK_CATEGORIES,
  'X (Twitter) Pixel': TWITTER_PIXEL_CATEGORIES,
  Vibes: VIBES_CATEGORIES,
  Zemanta: ZEMANTA_CATEGORIES,

  // Analytics
  Amplitude: AMPLITUDE_CATEGORIES,
  'AT Internet': AT_INTERNET_CATEGORIES,
  Comscore: COMSCORE_CATEGORIES,
  'Crazy Egg': CRAZY_EGG_CATEGORIES,
  FullStory: FULLSTORY_CATEGORIES,
  Glassbox: GLASSBOX_CATEGORIES,
  Hotjar: HOTJAR_CATEGORIES,
  Indicative: INDICATIVE_CATEGORIES,
  Matomo: MATOMO_CATEGORIES,
  'Medallia DXA': MEDALLIA_CATEGORIES,
  Mixpanel: MIXPANEL_CATEGORIES,
  'Parse.ly': PARSELY_CATEGORIES,
  'Piwik PRO': PIWIK_PRO_CATEGORIES,
  RudderStack: RUDDERSTACK_CATEGORIES,
  Scorecard: SCORECARD_CATEGORIES,
  Webtrends: WEBTRENDS_CATEGORIES,

  // Tag Manager
  Ensighten: ENSIGHTEN_CATEGORIES,
  'Piwik PRO TM': PIWIK_PRO_TM_CATEGORIES,
  Segment: SEGMENT_CATEGORIES,
  Tealium: TEALIUM_CATEGORIES,

  // A/B Testing
  Optimizely: OPTIMIZELY_CATEGORIES,
  'Dynamic Yield': DYNAMIC_YIELD_CATEGORIES,
  Split: SPLIT_CATEGORIES,
  Omniconvert: OMNICONVERT_CATEGORIES,

  // Visitor Identification
  Demandbase: DEMANDBASE_CATEGORIES,
  '6Sense': SIXSENSE_CATEGORIES,
  Merkury: MERKURY_CATEGORIES,

  // Customer Engagement
  Braze: BRAZE_CATEGORIES,
  Lytics: LYTICS_CATEGORIES,

  // CDP
  mParticle: MPARTICLE_CATEGORIES,
  'Tealium EventStream': TEALIUM_EVENTSTREAM_CATEGORIES,
};
