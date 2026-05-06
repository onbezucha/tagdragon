import type { ProviderCategories } from '@/types/categories';

export const TWITTER_PIXEL_CATEGORIES: ProviderCategories = {
  tracking: {
    label: 'Tracking',
    icon: '🔑',
    order: 1,
    defaultExpanded: true,
    patterns: [
      /^Transaction ID$/,
      /^Pixel ID$/,
      /^Pixel Type$/,
      /^Pixel Version$/,
      /^Event ID$/,
      /^Integration$/,
      /^Placement ID$/,
      /^Pixel Source$/,
      /^Conversion ID$/,
    ],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 2,
    defaultExpanded: true,
    patterns: [/^Page URL$/, /^Page Title$/, /^Partner$/, /^Partner User ID$/, /^iFrame Status$/],
  },
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Sale Amount$/, /^Order Quantity$/],
  },
  user: {
    label: 'User',
    icon: '👤',
    order: 4,
    defaultExpanded: true,
    patterns: [
      /^User ID \(twpid\)$/,
      /^Email \(hashed\)$/,
      /^Phone \(hashed\)$/,
      /^First Name \(hashed\)$/,
      /^Last Name \(hashed\)$/,
    ],
  },
};
