import type { ProviderCategories } from '@/types/categories';

export const TIKTOK_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Timestamp$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^URL$/, /^Referrer$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 3,
    defaultExpanded: true,
    patterns: [
      /^Value$/,
      /^Currency$/,
      /^Content ID$/,
      /^Content Type$/,
      /^Content Name$/,
      /^Order ID$/,
      /^Search Query$/,
    ],
  },
  user: {
    label: 'User',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Click ID$/, /^User ID$/, /^TT Cookie ID$/, /^Locale$/],
  },
  properties: {
    label: 'Properties',
    icon: '⚡',
    order: 5,
    defaultExpanded: true,
    patterns: [],
  },
};
