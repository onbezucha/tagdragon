import type { ProviderCategories } from '@/types/categories';

export const ENSIGHTEN_CATEGORIES: ProviderCategories = {
  bootstrap: {
    label: 'Bootstrap',
    icon: '📦',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Bootstrap$/, /^Client$/, /^Space$/],
  },
};
