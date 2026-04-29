import type { ProviderCategories } from '@/types/categories';

export const TEALIUM_CATEGORIES: ProviderCategories = {
  core: {
    label: 'Core',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Account$/, /^Profile$/, /^Visitor ID$/],
  },
  pageContext: {
    label: 'Page Context',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Referrer$/, /^Page Title$/],
    prefixMatch: ['cp.', 'meta.', 'js_page.'],
  },
  campaign: {
    label: 'Campaign',
    icon: '🎯',
    order: 3,
    defaultExpanded: true,
    prefixMatch: ['ut.'],
    patterns: [
      /^Campaign Source$/,
      /^Campaign Medium$/,
      /^Campaign Name$/,
      /^Campaign Term$/,
      /^Campaign Content$/,
    ],
  },
  custom: {
    label: 'Custom Data',
    icon: '⚡',
    order: 4,
    defaultExpanded: true,
    patterns: [
      /^(?!Event$|Account$|Profile$|Visitor ID$|Page URL$|Referrer$|Page Title$|Campaign Source$|Campaign Medium$|Campaign Name$|Campaign Term$|Campaign Content$).*/,
    ],
  },
};
