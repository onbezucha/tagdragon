import type { ProviderCategories } from '@/types/categories';

export const FULLSTORY_CATEGORIES: ProviderCategories = {
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 1,
    defaultExpanded: true,
    patterns: [/^User ID$/, /^Display Name$/, /^Email$/],
  },
};
