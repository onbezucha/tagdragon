import type { ProviderCategories } from '@/types/categories';

export const OUTBRAIN_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  tracking: {
    label: 'Tracking',
    icon: '🎯',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Click ID$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Order Value$/, /^Currency$/],
  },
};
