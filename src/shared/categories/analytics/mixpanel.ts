import type { ProviderCategories } from '@/types/categories';

export const MIXPANEL_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Distinct ID$/, /^Token$/, /^Time$/],
  },
  properties: {
    label: 'Properties',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^(?!Distinct ID$|Token$|Event$|Time$).*/],
  },
};
