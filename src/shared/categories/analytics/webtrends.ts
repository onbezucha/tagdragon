import type { ProviderCategories } from '@/types/categories';

export const WEBTRENDS_CATEGORIES: ProviderCategories = {
  page: {
    label: 'Page',
    icon: '📄',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Site Name$/, /^Scene$/, /^URI$/, /^Server$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Visitor ID$/],
  },
};
