import type { ProviderCategories } from '@/types/categories';

export const RTB_HOUSE_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  identity: {
    label: 'Identity',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^User ID$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 3,
    defaultExpanded: false,
    patterns: [/^Category$/],
  },
};
