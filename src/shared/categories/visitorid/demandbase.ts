import type { ProviderCategories } from '@/types/categories';

export const DEMANDBASE_CATEGORIES: ProviderCategories = {
  company: {
    label: 'Company',
    icon: '🏢',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Company ID$/, /^Company$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page Type$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 3,
    defaultExpanded: false,
    patterns: [/^Key$/],
  },
};
