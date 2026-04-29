import type { ProviderCategories } from '@/types/categories';

export const PIWIK_PRO_CATEGORIES: ProviderCategories = {
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
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^URL$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [/^User ID$/],
  },
};
