import type { ProviderCategories } from '@/types/categories';

export const COMSCORE_CATEGORIES: ProviderCategories = {
  publisher: {
    label: 'Publisher',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Type$/, /^Client ID$/, /^Version$/, /^Integration Type$/, /^Config$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Page Title$/, /^Referrer$/, /^Timestamp$/],
  },
  consent: {
    label: 'Consent & Privacy',
    icon: '🛡️',
    order: 3,
    defaultExpanded: true,
    patterns: [/^GDPR$/, /^GDPR Purposes$/, /^GDPR LI$/, /^GDPR Country$/],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Campaign ID$/],
  },
  fingerprinting: {
    label: 'Fingerprinting',
    icon: '🔒',
    order: 5,
    defaultExpanded: false,
    patterns: [/^Fingerprint ID$/],
  },
  content: {
    label: 'Content',
    icon: '📝',
    order: 6,
    defaultExpanded: false,
    patterns: [/^Segment$/, /^Publisher Segment$/],
  },
  customVars: {
    label: 'Custom Variables',
    icon: '📐',
    order: 7,
    defaultExpanded: false,
    prefixMatch: ['c'],
    patterns: [],
  },
};
