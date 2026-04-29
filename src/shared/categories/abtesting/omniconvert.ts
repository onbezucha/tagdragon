import type { ProviderCategories } from '@/types/categories';

export const OMNICONVERT_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  experiment: {
    label: 'Experiment',
    icon: '🧪',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Experiment ID$/, /^Variation ID$/],
  },
};
