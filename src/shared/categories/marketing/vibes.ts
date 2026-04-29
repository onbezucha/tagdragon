import type { ProviderCategories } from '@/types/categories';

export const VIBES_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Campaign ID$/],
  },
};
