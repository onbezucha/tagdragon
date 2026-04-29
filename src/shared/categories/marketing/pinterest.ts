import type { ProviderCategories } from '@/types/categories';

export const PINTEREST_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Event Type$/],
  },
  pixel: {
    label: 'Pixel Info',
    icon: '🔑',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Tag ID$/, /^Network Provider$/, /^GTM Version$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Referrer$/],
  },
  ecommerce: {
    label: 'Ecommerce',
    icon: '🛒',
    order: 4,
    defaultExpanded: true,
    patterns: [/^Value$/, /^Currency$/, /^Order ID$/, /^Search Query$/, /^Lead Type$/],
  },
  device: {
    label: 'Device',
    icon: '💻',
    order: 5,
    defaultExpanded: false,
    patterns: [/^Screen Resolution$/, /^Platform$/, /^Is EU$/],
  },
  technical: {
    label: 'Technical',
    icon: '⚙️',
    order: 6,
    defaultExpanded: false,
    patterns: [/^Timestamp$/],
  },
};
