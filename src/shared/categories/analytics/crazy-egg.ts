import type { ProviderCategories } from '@/types/categories';

export const CRAZY_EGG_CATEGORIES: ProviderCategories = {
  account: {
    label: 'Account',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Account ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/],
  },
};
