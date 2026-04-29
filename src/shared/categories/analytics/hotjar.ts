import type { ProviderCategories } from '@/types/categories';

export const HOTJAR_CATEGORIES: ProviderCategories = {
  site: {
    label: 'Site Info',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^hjid$/, /^Site ID$/, /^siteId$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^URL$/, /^url$/],
  },
};
