import type { ProviderCategories } from '@/types/categories';

export const PARSELY_CATEGORIES: ProviderCategories = {
  page: {
    label: 'Page',
    icon: '📄',
    order: 1,
    defaultExpanded: true,
    patterns: [/^URL$/, /^Referrer$/],
  },
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Action$/, /^Site ID$/, /^Timestamp$/],
  },
};
