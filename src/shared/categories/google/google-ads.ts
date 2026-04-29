import type { ProviderCategories } from '@/types/categories';

export const GOOGLE_ADS_CATEGORIES: ProviderCategories = {
  conversion: {
    label: 'Conversion',
    icon: '🎯',
    order: 1,
    defaultExpanded: true,
    patterns: [
      /^Conversion ID$/,
      /^Conversion Label$/,
      /^Conversion Type$/,
      /^Event$/,
      /^Conversion Value$/,
      /^Currency$/,
      /^Transaction ID$/,
    ],
    requiredParams: ['Conversion ID', 'Conversion Label'],
  },
  ecommerce: {
    label: 'E-Commerce',
    icon: '🛒',
    order: 2,
    defaultExpanded: true,
    patterns: [/^E-Commerce Value$/, /^Product IDs$/, /^E-Commerce Type$/],
  },
  page: {
    label: 'Page',
    icon: '📄',
    order: 3,
    defaultExpanded: true,
    patterns: [/^Page Title$/, /^Page URL$/, /^Referrer$/],
  },
  attribution: {
    label: 'Attribution',
    icon: '🔗',
    order: 4,
    defaultExpanded: true,
    patterns: [
      /^Google Click ID$/,
      /^wbraid$/,
      /^gbraid$/,
      /^GTM Container$/,
      /^Advertiser User ID$/,
    ],
  },
  consent: {
    label: 'Consent & Privacy',
    icon: '🔒',
    order: 5,
    defaultExpanded: false,
    patterns: [
      /^Consent State$/,
      /^Consent Details$/,
      /^Non-Personalized$/,
      /^DMA Compliance$/,
      /^DMA Consent$/,
    ],
  },
  technical: {
    label: 'Technical',
    icon: '🔧',
    order: 6,
    defaultExpanded: false,
    patterns: [/^Cookie Present$/],
  },
};
