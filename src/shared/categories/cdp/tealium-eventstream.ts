import type { ProviderCategories } from '@/types/categories';

export const TEALIUM_EVENTSTREAM_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  account: {
    label: 'Account',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Account$/, /^Profile$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Visitor ID$/],
  },
};
