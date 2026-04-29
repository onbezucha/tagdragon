import type { ProviderCategories } from '@/types/categories';

export const PIWIK_PRO_TM_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Container ID$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Event Name$/],
  },
};
