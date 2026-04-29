import type { ProviderCategories } from '@/types/categories';

export const AMAZON_ADS_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  ad: {
    label: 'Ad Info',
    icon: '📢',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Slot$/, /^Ad ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page Type$/, /^Ref$/],
  },
};
