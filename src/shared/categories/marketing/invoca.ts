import type { ProviderCategories } from '@/types/categories';

export const INVOCA_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  tracking: {
    label: 'Tracking',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Transaction ID$/, /^Campaign ID$/],
  },
};
