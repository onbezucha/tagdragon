import type { ProviderCategories } from '@/types/categories';

export const TARGET_CATEGORIES: ProviderCategories = {
  targeting: {
    label: 'Targeting',
    icon: '🎯',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Mbox$/, /^Session ID$/, /^TNT ID$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^MCID$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Host$/, /^Page URL$/],
  },
};
