import type { ProviderCategories } from '@/types/categories';

export const ADFORM_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Tracking ID$/, /^Page Name$/, /^Tracking Mode$/],
    requiredParams: ['Tracking ID'],
  },
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Order ID$/, /^Conversion Value$/, /^Banner ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Referrer$/],
  },
  custom: {
    label: 'Custom Variables',
    icon: '📐',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Custom Var \d+$/],
  },
  device: {
    label: 'Device & Browser',
    icon: '💻',
    order: 5,
    defaultExpanded: false,
    patterns: [/^Language$/, /^Resolution$/, /^Color Depth$/],
  },
  consent: {
    label: 'Consent & Privacy',
    icon: '🔒',
    order: 6,
    defaultExpanded: false,
    patterns: [/^GDPR$/, /^GDPR Consent$/],
  },
  technical: {
    label: 'Technical',
    icon: '🔧',
    order: 7,
    defaultExpanded: false,
    patterns: [/^Cache Buster$/, /^URL$/],
  },
};
