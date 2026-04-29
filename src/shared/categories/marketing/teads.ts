import type { ProviderCategories } from '@/types/categories';

export const TEADS_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/],
  },
  pixel: {
    label: 'Pixel Info',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Pixel ID$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 3,
    defaultExpanded: false,
    patterns: [/^Time on Site$/],
  },
};
