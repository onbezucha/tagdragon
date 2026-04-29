import type { ProviderCategories } from '@/types/categories';

export const RUDDERSTACK_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Type$/, /^Event$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^User ID$/, /^Anonymous ID$/],
  },
  account: {
    label: 'Account',
    icon: '🔑',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Write Key$/],
  },
};
