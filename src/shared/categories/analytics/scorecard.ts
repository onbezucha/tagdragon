import type { ProviderCategories } from '@/types/categories';

export const SCORECARD_CATEGORIES: ProviderCategories = {
  publisher: {
    label: 'Publisher',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [/^c1$/, /^Publisher$/, /^c2$/, /^Site$/],
  },
  content: {
    label: 'Content',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^c4$/, /^Segment$/, /^rn$/, /^URL$/],
  },
};
