import type { ProviderCategories } from '@/types/categories';

export const MATOMO_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Site ID$/, /^Action$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Event Category$/, /^Event Action$/, /^Event Name$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 3,
    defaultExpanded: true,
    patterns: [
      /^Revenue$/,
      /^Order ID$/,
      /^Items$/,
      /^Goal ID$/,
      /^Subtotal$/,
      /^Tax$/,
      /^Shipping$/,
      /^Discount$/,
    ],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [/^User ID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 5,
    defaultExpanded: true,
    patterns: [/^Page URL$/],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 6,
    defaultExpanded: true,
    patterns: [/^Campaign Name$/, /^Campaign Keyword$/],
  },
  search: {
    label: 'Search',
    icon: '🔍',
    order: 7,
    defaultExpanded: false,
    patterns: [/^Search Category$/, /^Search Count$/],
  },
};
