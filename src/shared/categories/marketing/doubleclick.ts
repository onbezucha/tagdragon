import type { ProviderCategories } from '@/types/categories';

export const DOUBLECLICK_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🎯',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Advertiser ID$/, /^Activity Type$/, /^Activity$/, /^Click ID$/, /^Order ID$/],
  },
};
