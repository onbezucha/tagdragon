import type { ProviderCategories } from '@/types/categories';

export const CLARITY_TAG_CATEGORIES: ProviderCategories = {
  configuration: {
    label: 'Configuration',
    icon: '⚙️',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Project ID$/, /^Request Type$/],
  },
};
