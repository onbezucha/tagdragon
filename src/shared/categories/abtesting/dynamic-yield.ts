import type { ProviderCategories } from '@/types/categories';

export const DYNAMIC_YIELD_CATEGORIES: ProviderCategories = {
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 1,
    defaultExpanded: true,
    patterns: [/^DY ID$/, /^Session ID$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Section$/],
  },
};
