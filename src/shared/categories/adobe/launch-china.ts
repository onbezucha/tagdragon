import type { ProviderCategories } from '@/types/categories';

export const LAUNCH_CHINA_CATEGORIES: ProviderCategories = {
  library: {
    label: 'Library',
    icon: '📦',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Type$/, /^Environment$/, /^Library ID$/],
  },
  org: {
    label: 'Organization',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Org ID/, /^Property hash$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^URL$/],
  },
};
