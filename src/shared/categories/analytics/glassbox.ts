import type { ProviderCategories } from '@/types/categories';

export const GLASSBOX_CATEGORIES: ProviderCategories = {
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Session ID$/, /^Customer ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/],
  },
};
