import type { ProviderCategories } from '@/types/categories';

export const OPTIMIZELY_CATEGORIES: ProviderCategories = {
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 1,
    defaultExpanded: true,
    patterns: [/^User ID$/],
  },
  experiment: {
    label: 'Experiment',
    icon: '🧪',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Account ID$/, /^Project ID$/, /^Experiment ID$/, /^Variation ID$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Revenue$/],
  },
};
