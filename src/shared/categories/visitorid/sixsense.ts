import type { ProviderCategories } from '@/types/categories';

export const SIXSENSE_CATEGORIES: ProviderCategories = {
  company: {
    label: 'Company',
    icon: '🏢',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Company ID$/, /^Domain$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Token$/, /^IP$/],
  },
};
