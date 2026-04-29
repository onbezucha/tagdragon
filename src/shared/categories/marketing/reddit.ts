import type { ProviderCategories } from '@/types/categories';

export const REDDIT_CATEGORIES: ProviderCategories = {
  general: {
    label: 'General',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Account ID$/, /^Event$/],
  },
  eventData: {
    label: 'Event Data',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Custom Event Name$/, /^Item Count$/, /^Conversion ID$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Value$/, /^Value \(Decimal\)$/, /^Currency$/, /^Products$/],
  },
};
