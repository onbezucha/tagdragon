import type { ProviderCategories } from '@/types/categories';

export const BRAZE_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^User ID$/, /^Session ID$/],
  },
  account: {
    label: 'Account',
    icon: '🔑',
    order: 3,
    defaultExpanded: true,
    patterns: [/^App ID$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 4,
    defaultExpanded: false,
    patterns: [/^SDK Version$/],
  },
};
