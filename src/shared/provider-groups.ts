// ─── PROVIDER GROUPS ─────────────────────────────────────────────────────────
// UI-only grouping of providers for the provider bar.
// Does not affect the Provider interface or provider matching logic.

export interface ProviderGroup {
  readonly id: string;
  readonly label: string;
  readonly providers: readonly string[];
}

// Skupiny dle kategorie (inspirováno Omnibug)
export const PROVIDER_GROUPS: readonly ProviderGroup[] = [
  { id: 'analytics',  label: 'Analytics',             providers: ['GA4', 'GA (UA)', 'Adobe AA', 'AEP Web SDK', 'Scorecard'] },
  { id: 'tagmanager', label: 'Tag Manager',            providers: ['GTM', 'Tealium'] },
  { id: 'marketing',  label: 'Marketing',              providers: ['Google Ads', 'Meta Pixel', 'Bing Ads', 'Adform', 'DV360', 'Criteo', 'Sklik'] },
  { id: 'replay',     label: 'Session Replay',         providers: ['Hotjar'] },
  { id: 'visitorid',  label: 'Visitor Identification', providers: ['LinkedIn'] },
];

// Utility: najde skupinu pro daný provider name
export function getProviderGroup(providerName: string): ProviderGroup | undefined {
  return PROVIDER_GROUPS.find(g => (g.providers as readonly string[]).includes(providerName));
}

// Fallback skupina pro providery bez přiřazené skupiny
export const UNGROUPED_ID = 'other';
export const UNGROUPED_LABEL = 'Ostatní';
