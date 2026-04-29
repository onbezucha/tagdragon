import type { ProviderCategories } from '@/types/categories';

export const LINKEDIN_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^pid$/, /^Partner ID$/],
  },
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^conversionId$/, /^Conversion$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^URL$/, /^url$/],
  },
};
