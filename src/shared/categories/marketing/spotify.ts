import type { ProviderCategories } from '@/types/categories';

export const SPOTIFY_CATEGORIES: ProviderCategories = {
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
  consent: {
    label: 'Consent & Privacy',
    icon: '🔒',
    order: 3,
    defaultExpanded: false,
    patterns: [/^GDPR$/],
  },
};
