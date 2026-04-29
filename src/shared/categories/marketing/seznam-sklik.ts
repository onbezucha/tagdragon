import type { ProviderCategories } from '@/types/categories';

export const SKLIK_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Type$/, /^ID$/],
    requiredParams: ['ID'],
  },
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Value$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page URL$/],
  },
  user: {
    label: 'User & Privacy',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [/^User ID$/, /^Consent$/],
  },
  technical: {
    label: 'Technical',
    icon: '🔧',
    order: 5,
    defaultExpanded: false,
    patterns: [/^URL$/],
  },
};
