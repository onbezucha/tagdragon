import type { ProviderCategories } from '@/types/categories';

export const BING_ADS_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Event Category$/, /^Event Action$/, /^Event Label$/, /^Event Value$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Page Title$/, /^Referrer$/],
  },
  events: {
    label: 'Events & Ecommerce',
    icon: '🎯',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Goal Value$/, /^Goal Currency$/, /^Revenue$/],
  },
  identity: {
    label: 'Session & Identity',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [
      /^Tag ID$/,
      /^Tag Manager$/,
      /^UET Version$/,
      /^Machine ID$/,
      /^Session ID$/,
      /^Visit ID$/,
      /^Click ID$/,
    ],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 5,
    defaultExpanded: false,
    patterns: [/^Screen Resolution$/, /^Load Time$/, /^Consent$/],
  },
};
