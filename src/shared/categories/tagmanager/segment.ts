import type { ProviderCategories } from '@/types/categories';

export const SEGMENT_CATEGORIES: ProviderCategories = {
  core: {
    label: 'Core',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [
      /^Type$/,
      /^Event$/,
      /^User ID$/,
      /^Anonymous ID$/,
      /^Message ID$/,
      /^Timestamp$/,
      /^Write Key$/,
    ],
  },
  context: {
    label: 'Context',
    icon: '🌐',
    order: 2,
    defaultExpanded: true,
    patterns: [
      /^Page URL$/,
      /^Page Title$/,
      /^Referrer$/,
      /^Campaign Source$/,
      /^Campaign Medium$/,
      /^Campaign Name$/,
      /^User Agent$/,
      /^IP$/,
      /^Disabled Destinations$/,
    ],
  },
  properties: {
    label: 'Properties',
    icon: '⚡',
    order: 3,
    defaultExpanded: true,
    patterns: [],
  },
  traits: {
    label: 'Traits',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [],
  },
};
