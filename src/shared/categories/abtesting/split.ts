import type { ProviderCategories } from '@/types/categories';

export const SPLIT_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  targeting: {
    label: 'Targeting',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Key$/, /^Traffic Type$/, /^Value$/],
  },
};
