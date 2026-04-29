import type { ProviderCategories } from '@/types/categories';

export const ECID_CATEGORIES: ProviderCategories = {
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 1,
    defaultExpanded: true,
    patterns: [/^MID$/],
  },
  organization: {
    label: 'Organization',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Org ID$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 3,
    defaultExpanded: false,
    patterns: [/^Version$/, /^Response$/],
  },
};
