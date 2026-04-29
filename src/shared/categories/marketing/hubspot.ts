import type { ProviderCategories } from '@/types/categories';

export const HUBSPOT_CATEGORIES: ProviderCategories = {
  account: {
    label: 'Account',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Hub ID$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Page Title$/],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Campaign$/, /^Source$/],
  },
};
