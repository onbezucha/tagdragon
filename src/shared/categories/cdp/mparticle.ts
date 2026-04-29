import type { ProviderCategories } from '@/types/categories';

export const MPARTICLE_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Event Type$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^User ID$/],
  },
  account: {
    label: 'Account',
    icon: '🔑',
    order: 3,
    defaultExpanded: true,
    patterns: [/^API Key$/, /^Environment$/],
  },
};
