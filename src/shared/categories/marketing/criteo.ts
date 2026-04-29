import type { ProviderCategories } from '@/types/categories';

export const CRITEO_CATEGORIES: ProviderCategories = {
  account: {
    label: 'Account',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^a$/, /^Account$/],
  },
  event: {
    label: 'Event',
    icon: '⚡',
    order: 2,
    defaultExpanded: true,
    patterns: [/^e$/, /^Event$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^URL$/, /^url$/],
  },
};
