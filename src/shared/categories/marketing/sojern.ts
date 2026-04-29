import type { ProviderCategories } from '@/types/categories';

export const SOJERN_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Type$/],
  },
  tracking: {
    label: 'Tracking',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Partner ID$/],
  },
};
