import type { ProviderCategories } from '@/types/categories';

export const SNAPCHAT_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  pixel: {
    label: 'Pixel Info',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Pixel ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page URL$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Price$/, /^Currency$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 5,
    defaultExpanded: false,
    patterns: [/^Email$/],
  },
};
