// ─── CONSENT TYPES ────────────────────────────────────────────────────────────

export type ConsentCategoryType =
  | 'necessary'
  | 'performance'
  | 'functional'
  | 'marketing'
  | 'targeting'
  | 'social';

export interface ConsentCategory {
  type: ConsentCategoryType;
  label: string;
  description: string;
  granted: boolean;
  cookieCount?: number;
  readonly?: boolean;
}

export interface GoogleConsentMode {
  ad_storage: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  functionality_storage?: 'granted' | 'denied';
  personalization_storage?: 'granted' | 'denied';
  security_storage?: 'granted' | 'denied';
}

export interface TCFData {
  tcString: string;
  purposesConsent: number[];
  vendorConsents: number[];
}

export interface CMPInfo {
  name: string;
  type:
    | 'onetrust'
    | 'usercentrics'
    | 'cookiebot'
    | 'cookieyes'
    | 'didomi'
    | 'quantcast'
    | 'iubenda'
    | 'tcf'
    | 'unknown';
  isActive: boolean;
  hasTCF: boolean;
}

export interface ConsentData {
  cmp: CMPInfo | null;
  categories: ConsentCategory[];
  googleConsentMode: GoogleConsentMode | null;
  tcf: TCFData | null;
  timestamp: string;
  source: 'cookie' | 'api' | 'network';
}
