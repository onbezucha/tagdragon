import type { ProviderCategories } from '@/types/categories';

export const THE_TRADE_DESK_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Advertiser ID$/, /^Universal Pixel ID$/],
    requiredParams: ['Advertiser ID'],
  },
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Value$/, /^Order ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^URL$/],
  },
};
