import type { ProviderCategories } from '@/types/categories';

export const GTM_CATEGORIES: ProviderCategories = {
  container: {
    label: 'Container',
    icon: '📦',
    order: 1,
    defaultExpanded: true,
    patterns: [/^id$/, /^Container ID$/, /^container_id$/, /^gtm$/],
  },
  preview: {
    label: 'Preview Mode',
    icon: '🔍',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Preview Auth$/, /^Preview Env$/, /^Preview Cookies$/],
  },
};
