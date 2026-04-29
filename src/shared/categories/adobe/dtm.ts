import type { ProviderCategories } from '@/types/categories';

export const DTM_CATEGORIES: ProviderCategories = {
  library: {
    label: 'Library',
    icon: '📦',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Org ID \(partial\)$/, /^Property hash$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 2,
    defaultExpanded: false,
    patterns: [/^URL$/],
  },
};
