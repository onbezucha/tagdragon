// ─── PARAMETER CATEGORIZATION ────────────────────────────────────────────────
// Provider-First Architecture: each provider defines its OWN complete set of categories.
// Categories are sorted by 'order' field (1 = top, 999 = bottom).
// Matching: prefixMatch (fast string startsWith) runs before patterns (regex).

import type { AllProviderCategories } from '@/types/categories';

export const PROVIDER_CATEGORIES: AllProviderCategories = {

  'GA4': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^en$/, /^Event$/, /^_et$/, /^Engagement$/, /^_s$/, /^_ss$/, /^_fv$/, /^_nsi$/, /^_ee$/, /^seg$/, /^sid$/, /^Session ID$/, /^sct$/]
    },
    measurement: {
      label: 'Measurement',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^tid$/, /^Measurement ID$/, /^v$/, /^_p$/, /^gtm$/, /^_gid$/, /^_dbg$/]
    },
    page: {
      label: 'Page & Content',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^dl$/, /^dp$/, /^dr$/, /^dt$/, /^Page$/, /^Page title$/, /^page_location$/, /^page_title$/, /^page_referrer$/, /^page_path$/],
      prefixMatch: ['cg']
    },
    eventData: {
      label: 'Event Parameters',
      icon: '⚡',
      order: 4,
      defaultExpanded: true,
      patterns: [],
      prefixMatch: ['ep.', 'epn.']
    },
    user: {
      label: 'User & Session',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      patterns: [/^cid$/, /^uid$/, /^user_id$/, /^client_id$/, /^Client ID$/, /^_ga$/],
      prefixMatch: ['up.', 'upn.'],
      requiredParams: ['cid', 'client_id', 'Client ID']
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 6,
      defaultExpanded: true,
      patterns: [/^gclid$/, /^dclid$/, /^gbraid$/, /^wbraid$/, /^srsltid$/],
      prefixMatch: ['utm_']
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 7,
      defaultExpanded: true,
      patterns: [/^transaction_id$/, /^value$/, /^currency$/, /^cu$/, /^items$/, /^tax$/, /^shipping$/, /^pa$/, /^tcc$/],
      prefixMatch: ['pr']
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 8,
      defaultExpanded: false,
      patterns: [/^gcs$/, /^gcd$/, /^npa$/, /^dma$/, /^dma_cps$/, /^gdpr$/, /^gdpr_consent$/]
    },
    device: {
      label: 'Device & Browser',
      icon: '💻',
      order: 9,
      defaultExpanded: false,
      patterns: [/^sr$/, /^vp$/, /^sd$/, /^de$/, /^ul$/, /^je$/]
    }
  },

  'GA (UA)': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^t$/, /^Hit type$/, /^tid$/, /^Tracking ID$/, /^ni$/, /^ds$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^dl$/, /^dp$/, /^dh$/, /^dt$/, /^Page$/, /^Page title$/, /^cd$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 3,
      defaultExpanded: true,
      patterns: [/^ec$/, /^Event category$/, /^ea$/, /^Event action$/, /^el$/, /^Event label$/, /^ev$/]
    },
    user: {
      label: 'User',
      icon: '👤',
      order: 4,
      defaultExpanded: true,
      patterns: [/^cid$/, /^Client ID$/, /^uid$/, /^_ga$/, /^_gid$/],
      requiredParams: ['cid', 'client_id', 'Client ID']
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 5,
      defaultExpanded: true,
      patterns: [/^cn$/, /^cs$/, /^cm$/, /^ck$/, /^cc$/, /^ci$/, /^gclid$/, /^dclid$/],
      prefixMatch: ['utm_']
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 6,
      defaultExpanded: true,
      patterns: [/^ti$/, /^ta$/, /^tr$/, /^ts$/, /^tt$/, /^pa$/, /^cu$/, /^tcc$/],
      prefixMatch: ['pr', 'il']
    },
    customDimensions: {
      label: 'Custom Dimensions/Metrics',
      icon: '📐',
      order: 7,
      defaultExpanded: true,
      patterns: [/^cd\d+$/, /^cm\d+$/]
    },
    timing: {
      label: 'Timing',
      icon: '⏱️',
      order: 8,
      defaultExpanded: false,
      patterns: [/^utc$/, /^utv$/, /^utt$/, /^utl$/, /^plt$/, /^dns$/, /^pdt$/, /^rrt$/, /^tcp$/, /^srt$/]
    },
    device: {
      label: 'Device & Browser',
      icon: '💻',
      order: 9,
      defaultExpanded: false,
      patterns: [/^sr$/, /^vp$/, /^sd$/, /^de$/, /^ul$/, /^je$/, /^fl$/]
    }
  },

  'Adobe AA': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Hit type$/, /^Page name$/, /^Page URL$/, /^Referrer$/, /^Link name$/, /^Link URL$/, /^Report suite$/]
    },
    tracking: {
      label: 'Report Suite & Tracking',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Channel$/, /^Server$/, /^AppMeasurement$/, /^Resolution$/, /^Color depth$/, /^JavaScript ver$/]
    },
    events: {
      label: 'Events',
      icon: '⚡',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Events$/, /^events?$/, /^ev$/],
      specialRenderer: 'adobeEvents'
    },
    eVars: {
      label: 'eVars',
      icon: '🔢',
      order: 4,
      defaultExpanded: true,
      patterns: [/^eVar\d+$/]
    },
    props: {
      label: 'Props',
      icon: '📌',
      order: 5,
      defaultExpanded: true,
      patterns: [/^prop\d+$/]
    },
    products: {
      label: 'Products',
      icon: '🛍️',
      order: 6,
      defaultExpanded: true,
      patterns: [/^Products$/, /^products?$/, /^pl$/],
      specialRenderer: 'adobeProducts'
    },
    listVars: {
      label: 'List Variables',
      icon: '📋',
      order: 7,
      defaultExpanded: false,
      patterns: [/^list\d+$/]
    },
    contextData: {
      label: 'Context Data',
      icon: '🏷️',
      order: 8,
      defaultExpanded: true,
      patterns: [/^Context data$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 9,
      defaultExpanded: true,
      patterns: [/^Visitor ID$/, /^mid$/, /^aid$/, /^fid$/]
    },
    campaignAttrib: {
      label: 'Campaign & Attribution',
      icon: '🎯',
      order: 10,
      defaultExpanded: true,
      patterns: [/^Campaign$/, /^v0$/]
    }
  },

  'AEP Web SDK': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event type$/, /^Datastream ID$/, /^Request type$/]
    },
    analytics: {
      label: 'Adobe Analytics',
      icon: '📈',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page name$/, /^Page URL$/, /^Channel$/, /^Server$/, /^Campaign$/, /^Referrer$/, /^Link name$/, /^Link type$/]
    },
    events: {
      label: 'Events',
      icon: '⚡',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Events$/, /^events?$/],
      specialRenderer: 'adobeEvents'
    },
    eVars: {
      label: 'eVars',
      icon: '🔢',
      order: 4,
      defaultExpanded: true,
      patterns: [/^eVar\d+$/]
    },
    props: {
      label: 'Props',
      icon: '📌',
      order: 5,
      defaultExpanded: true,
      patterns: [/^prop\d+$/]
    },
    products: {
      label: 'Products',
      icon: '🛍️',
      order: 6,
      defaultExpanded: true,
      patterns: [/^Products$/, /^products?$/],
      specialRenderer: 'adobeProducts'
    },
    listVars: {
      label: 'List Variables',
      icon: '📋',
      order: 7,
      defaultExpanded: false,
      patterns: [/^list\d+$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 8,
      defaultExpanded: true,
      patterns: [/^ECID$/]
    },
    device: {
      label: 'Device',
      icon: '💻',
      order: 9,
      defaultExpanded: false,
      patterns: [/^Screen$/, /^Screen orient$/]
    }
  },

  'Meta Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^ev$/, /^Event$/, /^a$/, /^Action$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^id$/, /^Pixel ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^dl$/, /^URL$/, /^rl$/]
    }
  },

  'GTM': {
    container: {
      label: 'Container',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [/^id$/, /^Container ID$/, /^container_id$/],
      prefixMatch: ['gtm']
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Hotjar': {
    site: {
      label: 'Site Info',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^hjid$/, /^Site ID$/, /^siteId$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^URL$/, /^url$/]
    }
  },

  'Tealium': {
    account: {
      label: 'Account',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^account$/, /^Account$/, /^profile$/, /^Profile$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^event$/, /^Event$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^url$/]
    }
  },

  'Adobe Launch': {
    library: {
      label: 'Library',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Type$/, /^Environment$/, /^Library ID$/]
    },
    org: {
      label: 'Organization',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Org ID/, /^Property hash$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'LinkedIn': {
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^pid$/, /^Partner ID$/]
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^conversionId$/, /^Conversion$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^url$/]
    }
  },

  'Google Ads': {
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Conversion ID$/, /^Conversion Label$/, /^Conversion Type$/, /^Event$/, /^Conversion Value$/, /^Currency$/, /^Transaction ID$/],
      requiredParams: ['Conversion ID', 'Conversion Label']
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page Title$/, /^Page URL$/, /^Referrer$/]
    },
    attribution: {
      label: 'Attribution',
      icon: '🔗',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Google Click ID$/, /^GTM Container$/]
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 4,
      defaultExpanded: false,
      patterns: [/^Consent State$/, /^Consent Details$/, /^Non-Personalized$/]
    },
    technical: {
      label: 'Technical',
      icon: '🔧',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Random$/, /^URL$/]
    }
  },

  'Sklik': {
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Type$/, /^ID$/],
      requiredParams: ['ID']
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Value$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Page URL$/]
    },
    user: {
      label: 'User & Privacy',
      icon: '👤',
      order: 4,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Consent$/]
    },
    technical: {
      label: 'Technical',
      icon: '🔧',
      order: 5,
      defaultExpanded: false,
      patterns: [/^URL$/]
    }
  },

  'Bing Ads': {
    tag: {
      label: 'Tag Info',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^ti$/, /^Tag ID$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^evt$/, /^Event$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^p$/, /^URL$/]
    }
  },

  'Adform': {
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Tracking ID$/, /^Page Name$/, /^Tracking Mode$/],
      requiredParams: ['Tracking ID']
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Order ID$/, /^Conversion Value$/, /^Banner ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Page URL$/, /^Referrer$/]
    },
    custom: {
      label: 'Custom Variables',
      icon: '📐',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Custom Var \d+$/]
    },
    device: {
      label: 'Device & Browser',
      icon: '💻',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Language$/, /^Resolution$/, /^Color Depth$/]
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 6,
      defaultExpanded: false,
      patterns: [/^GDPR$/, /^GDPR Consent$/]
    },
    technical: {
      label: 'Technical',
      icon: '🔧',
      order: 7,
      defaultExpanded: false,
      patterns: [/^Cache Buster$/, /^URL$/]
    }
  },

  'DV360': {
    page: {
      label: 'Request',
      icon: '📄',
      order: 1,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Criteo': {
    account: {
      label: 'Account',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^a$/, /^Account$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^e$/, /^Event$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^url$/]
    }
  },

  'Scorecard': {
    publisher: {
      label: 'Publisher',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^c1$/, /^Publisher$/, /^c2$/, /^Site$/]
    },
    content: {
      label: 'Content',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^c4$/, /^Segment$/, /^rn$/, /^URL$/]
    }
  }
};
