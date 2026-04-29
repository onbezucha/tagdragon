import type { ProviderCategories } from '@/types/categories';

export const AT_INTERNET_CATEGORIES: ProviderCategories = {
  page: {
    label: 'Page',
    icon: '📄',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Site Name$/, /^Level 2$/, /^Page$/],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Campaign$/],
  },
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Hit Type$/, /^Click$/],
  },
};
