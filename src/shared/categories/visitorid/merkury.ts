import type { ProviderCategories } from '@/types/categories';

export const MERKURY_CATEGORIES: ProviderCategories = {
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
    patterns: [/^Merkury ID$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 3,
    defaultExpanded: false,
    patterns: [/^Segment$/],
  },
};
