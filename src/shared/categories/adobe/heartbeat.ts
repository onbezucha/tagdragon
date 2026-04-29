import type { ProviderCategories } from '@/types/categories';

export const HEARTBEAT_CATEGORIES: ProviderCategories = {
  event: {
    label: 'Event',
    icon: '⚡',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event Type$/],
  },
  stream: {
    label: 'Stream',
    icon: '📺',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Stream Name$/, /^Channel$/, /^Stream ID$/],
  },
};
