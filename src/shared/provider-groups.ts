// ─── PROVIDER GROUPS ─────────────────────────────────────────────────────────
// UI-only grouping of providers for the provider bar.
// Does not affect the Provider interface or provider matching logic.

export interface ProviderGroup {
  readonly id: string;
  readonly label: string;
  readonly providers: readonly string[];
}

// Groups by category (inspired by Omnibug)
export const PROVIDER_GROUPS: readonly ProviderGroup[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    providers: [
      'GA4', 'GA (UA)', 'Adobe AA', 'AEP Web SDK', 'Scorecard', 'Amplitude', 'Mixpanel', 'Matomo',
      'Piwik PRO', 'AT Internet', 'Comscore', 'Parse.ly', 'Webtrends', 'Medallia DXA', 'Indicative', 'RudderStack',
    ],
  },
  {
    id: 'tagmanager',
    label: 'Tag Manager',
    providers: ['GTM', 'Tealium', 'Segment', 'Ensighten', 'Piwik PRO TM'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    providers: [
      'Google Ads', 'Meta Pixel', 'Bing Ads', 'Adform', 'DoubleClick', 'Criteo', 'Sklik',
      'TikTok Pixel', 'X (Twitter) Pixel', 'Pinterest Pixel', 'The Trade Desk',
      'Reddit Pixel', 'Snapchat Pixel', 'Amazon Ads', 'Outbrain', 'Teads', 'Spotify Pixel',
      'RTB House', 'Zemanta', 'Sojern', 'Vibes', 'Brevo', 'Invoca', 'HubSpot',
    ],
  },
  {
    id: 'replay',
    label: 'Session Replay',
    providers: ['Hotjar', 'Microsoft Clarity', 'FullStory', 'Crazy Egg', 'Glassbox'],
  },
  {
    id: 'abtesting',
    label: 'A/B Testing',
    providers: ['Optimizely', 'Dynamic Yield', 'Split', 'Omniconvert'],
  },
  {
    id: 'visitorid',
    label: 'Visitor Identification',
    providers: ['LinkedIn', 'Demandbase', '6Sense'],
  },
  {
    id: 'engagement',
    label: 'Customer Engagement',
    providers: ['Braze', 'Lytics'],
  },
  {
    id: 'cdp',
    label: 'CDP',
    providers: ['mParticle', 'Tealium EventStream'],
  },
  {
    id: 'adobe',
    label: 'Adobe Stack',
    providers: [
      'Adobe Target', 'Adobe AAM', 'Adobe ECID', 'Adobe Heartbeat',
      'Adobe DTM', 'Adobe Launch (CN)',
    ],
  },
];

// Utility: finds the group for a given provider name
export function getProviderGroup(providerName: string): ProviderGroup | undefined {
  return PROVIDER_GROUPS.find(g => (g.providers as readonly string[]).includes(providerName));
}

// Fallback group for providers without an assigned group
export const UNGROUPED_ID = 'other';
export const UNGROUPED_LABEL = 'Other';
