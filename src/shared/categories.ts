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
      patterns: [/^en$/, /^Event$/, /^_et$/, /^Engagement$/, /^_s$/, /^Hit Sequence$/, /^_ss$/, /^_fv$/, /^_nsi$/, /^_ee$/, /^seg$/, /^Session Engaged$/, /^sid$/, /^Session ID$/, /^sct$/, /^Session Count$/]
    },
    measurement: {
      label: 'Measurement',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^tid$/, /^Measurement ID$/, /^v$/, /^_p$/, /^gtm$/, /^GTM Version$/, /^_gid$/, /^_dbg$/]
    },
    page: {
      label: 'Page & Content',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^dl$/, /^dp$/, /^dr$/, /^dt$/, /^Page$/, /^Page title$/, /^Referrer$/, /^page_location$/, /^page_title$/, /^page_referrer$/, /^page_path$/],
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
      patterns: [/^cid$/, /^uid$/, /^user_id$/, /^client_id$/, /^Client ID$/, /^User ID$/, /^ECID$/, /^_ga$/],
      prefixMatch: ['up.', 'upn.'],
      requiredParams: ['cid', 'client_id', 'Client ID', 'User ID']
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
      patterns: [/^transaction_id$/, /^value$/, /^currency$/, /^Currency$/, /^cu$/, /^items$/, /^tax$/, /^shipping$/, /^pa$/, /^tcc$/],
      prefixMatch: ['pr']
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 8,
      defaultExpanded: false,
      patterns: [/^gcs$/, /^Consent State$/, /^gcd$/, /^Consent Defaults$/, /^npa$/, /^Non-personalized Ads$/, /^dma$/, /^DMA Compliance$/, /^dma_cps$/, /^DMA Consent$/, /^gdpr$/, /^gdpr_consent$/]
    },
    device: {
      label: 'Device & Browser',
      icon: '💻',
      order: 9,
      defaultExpanded: false,
      patterns: [/^sr$/, /^Screen Resolution$/, /^vp$/, /^sd$/, /^de$/, /^ul$/, /^User Language$/, /^je$/]
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

  'Adobe Client-Side': {
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

  'Adobe Server-Side': {
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
      patterns: [/^ev$/, /^Event$/, /^a$/, /^Action$/, /^eid$/, /^Event ID$/, /^ec$/, /^Event Count$/, /^o$/, /^Ordinal$/, /^ler$/, /^Last Event Result$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^id$/, /^Pixel ID$/, /^v$/, /^Pixel Version$/, /^r$/, /^Release$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^dl$/, /^URL$/, /^rl$/, /^Referrer$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Value$/, /^Currency$/, /^Content IDs$/, /^Content Name$/, /^Content Type$/, /^Content Category$/, /^Num Items$/, /^Contents$/]
    },
    tracking: {
      label: 'Tracking',
      icon: '🍪',
      order: 5,
      defaultExpanded: true,
      patterns: [/^fbp$/, /^FBP$/, /^fbc$/, /^FBC$/]
    },
    device: {
      label: 'Device',
      icon: '💻',
      order: 6,
      defaultExpanded: false,
      patterns: [/^Screen Resolution$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 7,
      defaultExpanded: false,
      patterns: [/^ts$/, /^Timestamp$/, /^plt$/, /^Page Load Time$/, /^if$/, /^In iFrame$/, /^cdl$/, /^Consent Data Layer$/, /^cf$/, /^Consent Flag$/, /^it$/, /^Init Time$/, /^coo$/, /^Click-Only$/, /^Experiments$/]
    }
  },

  'Pinterest Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Event Type$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Tag ID$/, /^Network Provider$/, /^GTM Version$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^Referrer$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Value$/, /^Currency$/]
    },
    device: {
      label: 'Device',
      icon: '💻',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Screen Resolution$/, /^Platform$/, /^Is EU$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 6,
      defaultExpanded: false,
      patterns: [/^Timestamp$/]
    }
  },

  'GTM': {
    container: {
      label: 'Container',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [/^id$/, /^Container ID$/, /^container_id$/, /^gtm$/]
    },
    preview: {
      label: 'Preview Mode',
      icon: '🔍',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Preview Auth$/, /^Preview Env$/, /^Preview Cookies$/]
    }
  },

  'DoubleClick': {
    tracking: {
      label: 'Tracking',
      icon: '🎯',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Advertiser ID$/, /^Activity Type$/, /^Activity$/, /^Click ID$/, /^Order ID$/]
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

  'Adobe Launch (CN)': {
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
      patterns: [
        /^Conversion ID$/, /^Conversion Label$/, /^Conversion Type$/,
        /^Event$/, /^Conversion Value$/, /^Currency$/, /^Transaction ID$/,
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
      patterns: [/^Google Click ID$/, /^wbraid$/, /^gbraid$/, /^GTM Container$/, /^Advertiser User ID$/],
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Consent State$/, /^Consent Details$/, /^Non-Personalized$/, /^DMA Compliance$/, /^DMA Consent$/],
    },
    technical: {
      label: 'Technical',
      icon: '🔧',
      order: 6,
      defaultExpanded: false,
      patterns: [/^Cookie Present$/],
    },
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

  'TikTok Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Timestamp$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Pixel Code$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^Referrer$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Value$/, /^Currency$/, /^Content ID$/, /^Content Type$/, /^Content Name$/, /^Order ID$/, /^Search Query$/]
    },
    user: {
      label: 'User',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      patterns: [/^Click ID$/, /^User ID$/, /^Locale$/]
    }
  },

  'Bing Ads': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^evt$/, /^Event$/]
    },
    tag: {
      label: 'Tag Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^ti$/, /^Tag ID$/, /^tm$/, /^Tag Manager$/, /^Ver$/, /^UET Version$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^p$/, /^URL$/, /^tl$/, /^Page Title$/, /^r$/, /^Referrer$/]
    },
    session: {
      label: 'Session & Identity',
      icon: '👤',
      order: 4,
      defaultExpanded: true,
      patterns: [/^mid$/, /^Machine ID$/, /^sid$/, /^Session ID$/, /^vid$/, /^Visit ID$/, /^msclkid$/, /^Click ID$/]
    },
    device: {
      label: 'Device',
      icon: '💻',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Screen Resolution$/, /^Color Depth$/, /^lg$/, /^Language$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 6,
      defaultExpanded: false,
      patterns: [/^lt$/, /^Load Time$/, /^cdb$/, /^Consent$/]
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
  },

  'Amplitude': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Device ID$/, /^Session ID$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 3,
      defaultExpanded: true,
      patterns: [/^API Key$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Revenue$/]
    },
    technical: {
      label: 'Technical',
      icon: '🔧',
      order: 5,
      defaultExpanded: false,
      patterns: [/^URL$/]
    }
  },

  'Mixpanel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Distinct ID$/, /^Token$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Microsoft Clarity': {
    envelope: {
      label: 'Envelope',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [
        /^Version$/, /^Project ID$/, /^User ID$/, /^Session ID$/,
        /^Page Number$/, /^Sequence$/, /^Duration/, /^Upload Type$/,
        /^Is Last Payload$/, /^Platform$/, /^Request Type$/,
      ],
      prefixMatch: ['Page URL'],
    },
    summary: {
      label: 'Summary',
      icon: '📊',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Event Count$/, /^Event Types$/],
    },
    interaction: {
      label: 'Interaction',
      icon: '👆',
      order: 3,
      defaultExpanded: true,
      patterns: [
        /^Click/, /^Scroll/, /^DoubleClick/, /^Resize/, /^Mouse/,
        /^Touch/, /^Selection/, /^Clipboard/, /^Form Submit/,
        /^Input/, /^Focus/, /^Context Menu/,
      ],
    },
    custom: {
      label: 'Custom Events',
      icon: '⚡',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Custom Event/],
    },
    page: {
      label: 'Page & Navigation',
      icon: '📄',
      order: 5,
      defaultExpanded: true,
      patterns: [/^Page \[/, /^Navigation/, /^Visibility/, /^Unload/],
    },
    consent: {
      label: 'Consent',
      icon: '🔒',
      order: 6,
      defaultExpanded: true,
      patterns: [/^Consent/],
    },
    dimensions: {
      label: 'Dimensions',
      icon: '📐',
      order: 7,
      defaultExpanded: false,
      patterns: [/^Dim:/],
    },
    metrics: {
      label: 'Metrics',
      icon: '📊',
      order: 8,
      defaultExpanded: false,
      patterns: [/^Metric:/],
    },
    variables: {
      label: 'Variables',
      icon: '🏷️',
      order: 9,
      defaultExpanded: false,
      patterns: [/^Variable:/],
    },
    heartbeat: {
      label: 'Heartbeat',
      icon: '💓',
      order: 10,
      defaultExpanded: false,
      patterns: [/^Ping/],
    },
    internal: {
      label: 'Internal',
      icon: '⚙️',
      order: 11,
      defaultExpanded: false,
      patterns: [
        /^Upload \[/, /^Upgrade/, /^Baseline/, /^Limit/,
        /^Log/, /^ScriptError/, /^Change/, /^Timeline/, /^Summary/,
      ],
    },
  },

  'X (Twitter) Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Event ID$/]
    },
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Transaction ID$/, /^Pixel ID$/, /^Version$/, /^Type$/]
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Sale Amount$/, /^Order Quantity$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Page URL$/, /^Partner$/]
    },
    user: {
      label: 'User',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      patterns: [/^User ID \(twpid\)$/]
    }
  },

  'Segment': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Type$/, /^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Anonymous ID$/, /^User ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Matomo': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Site ID$/, /^Action$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Event Category$/, /^Event Action$/, /^Event Name$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Revenue$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 4,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 5,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'The Trade Desk': {
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Advertiser ID$/, /^Universal Pixel ID$/],
      requiredParams: ['Advertiser ID']
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Value$/, /^Order ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Piwik PRO': {
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Site ID$/, /^Action$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Event Category$/, /^Event Action$/, /^Event Name$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 4,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    }
  },

  'AT Internet': {
    page: {
      label: 'Page',
      icon: '📄',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Site Name$/, /^Level 2$/, /^Page$/]
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Campaign$/]
    },
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Hit Type$/, /^Click$/]
    }
  },

  'Comscore': {
    publisher: {
      label: 'Publisher',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Type$/, /^Client ID$/, /^Version$/, /^Integration Type$/, /^Config$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page URL$/, /^Page Title$/, /^Referrer$/, /^Timestamp$/]
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🛡️',
      order: 3,
      defaultExpanded: true,
      patterns: [/^GDPR$/, /^GDPR Purposes$/, /^GDPR LI$/, /^GDPR Country$/]
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Campaign ID$/]
    },
    fingerprinting: {
      label: 'Fingerprinting',
      icon: '🔒',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Fingerprint ID$/]
    },
    content: {
      label: 'Content',
      icon: '📝',
      order: 6,
      defaultExpanded: false,
      patterns: [/^Segment$/]
    },
    customVars: {
      label: 'Custom Variables',
      icon: '📐',
      order: 7,
      defaultExpanded: false,
      prefixMatch: ['c'],
      patterns: []
    }
  },

  'Parse.ly': {
    page: {
      label: 'Page',
      icon: '📄',
      order: 1,
      defaultExpanded: true,
      patterns: [/^URL$/, /^Referrer$/]
    },
    hit: {
      label: 'Hit Info',
      icon: '📊',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Action$/, /^Site ID$/, /^Timestamp$/]
    }
  },

  'Webtrends': {
    page: {
      label: 'Page',
      icon: '📄',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Site Name$/, /^Scene$/, /^URI$/, /^Server$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Visitor ID$/]
    }
  },

  'Tealium EventStream': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Account$/, /^Profile$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Visitor ID$/]
    }
  },

  'Adobe Target': {
    targeting: {
      label: 'Targeting',
      icon: '🎯',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Mbox$/, /^Session ID$/, /^TNT ID$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^MCID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Host$/, /^Page URL$/]
    }
  },

  'Adobe AAM': {
    hitInfo: {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Request Type$/, /^Account$/],
    },
    general: {
      label: 'General',
      icon: '🔧',
      order: 2,
      defaultExpanded: true,
      patterns: [
        /^Caller$/, /^Callback Property$/, /^Data Provider/, /^Integration Code/,
        /^COPPA/, /^Return Traits/, /^Data Provider ID$/, /^Data Provider User ID$/,
        /^Return URL/, /^Adobe Analytics Integration$/, /^JSON Response/,
        /^Experience Cloud ID/, /^Name Space ID$/, /^Platform$/,
        /^Legacy AA/, /^Return Method$/, /^Score ID$/,
        /^Trait Source/, /^Unique User ID$/, /^Org ID/,
        /^Blob$/, /^Version$/, /^DCS Region$/, /^Redirect$/,
        /^GDPR$/, /^Consent String$/,
      ],
    },
    customer: {
      label: 'Customer Attributes',
      icon: '👥',
      order: 3,
      defaultExpanded: true,
      prefixMatch: ['c_'],
    },
    private: {
      label: 'Private Attributes',
      icon: '🔒',
      order: 4,
      defaultExpanded: false,
      prefixMatch: ['p_'],
    },
  },

  'Adobe ECID': {
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 1,
      defaultExpanded: true,
      patterns: [/^MID$/]
    },
    organization: {
      label: 'Organization',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Org ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: false,
      patterns: [/^Version$/, /^Response$/]
    }
  },

  'Adobe Heartbeat': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event Type$/]
    },
    stream: {
      label: 'Stream',
      icon: '📺',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Stream Name$/, /^Channel$/, /^Stream ID$/]
    }
  },

  'Adobe DTM': {
    library: {
      label: 'Library',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Org ID \(partial\)$/, /^Property hash$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 2,
      defaultExpanded: false,
      patterns: [/^URL$/]
    }
  },

  'HubSpot': {
    account: {
      label: 'Account',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Hub ID$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Page URL$/, /^Page Title$/]
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Campaign$/, /^Source$/]
    }
  },

  'RudderStack': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Type$/, /^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Anonymous ID$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Write Key$/]
    }
  },

  'mParticle': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Event Type$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 3,
      defaultExpanded: true,
      patterns: [/^API Key$/, /^Environment$/]
    }
  },

  'Braze': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Session ID$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 3,
      defaultExpanded: true,
      patterns: [/^App ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 4,
      defaultExpanded: false,
      patterns: [/^SDK Version$/]
    }
  },

  'Optimizely': {
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 1,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    },
    experiment: {
      label: 'Experiment',
      icon: '🧪',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Account ID$/, /^Project ID$/, /^Experiment ID$/, /^Variation ID$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Revenue$/]
    }
  },

  'Dynamic Yield': {
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 1,
      defaultExpanded: true,
      patterns: [/^DY ID$/, /^Session ID$/]
    },
    event: {
      label: 'Event',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Section$/]
    }
  },

  'Split': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    targeting: {
      label: 'Targeting',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Key$/, /^Traffic Type$/, /^Value$/]
    }
  },

  'Omniconvert': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    experiment: {
      label: 'Experiment',
      icon: '🧪',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Experiment ID$/, /^Variation ID$/]
    }
  },

  '6Sense': {
    company: {
      label: 'Company',
      icon: '🏢',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Company ID$/, /^Domain$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Token$/, /^IP$/]
    }
  },

  'Demandbase': {
    company: {
      label: 'Company',
      icon: '🏢',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Company ID$/, /^Company$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page Type$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: false,
      patterns: [/^Key$/]
    }
  },

  'Lytics': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Client ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/]
    }
  },

  'Indicative': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    },
    account: {
      label: 'Account',
      icon: '🔑',
      order: 3,
      defaultExpanded: true,
      patterns: [/^API Key$/]
    }
  },

  'Ensighten': {
    bootstrap: {
      label: 'Bootstrap',
      icon: '📦',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Bootstrap$/, /^Client$/, /^Space$/]
    }
  },

  'Merkury': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Merkury ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: false,
      patterns: [/^Segment$/]
    }
  },

  'Snapchat Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Pixel ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Page URL$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 4,
      defaultExpanded: true,
      patterns: [/^Price$/, /^Currency$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 5,
      defaultExpanded: false,
      patterns: [/^Email$/]
    }
  },

  'Reddit Pixel': {
    general: {
      label: 'General',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Account ID$/, /^Event$/]
    },
    eventData: {
      label: 'Event Data',
      icon: '⚡',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Custom Event Name$/, /^Item Count$/, /^Conversion ID$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Value$/, /^Value \(Decimal\)$/, /^Currency$/, /^Products$/]
    }
  },

  'Amazon Ads': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    ad: {
      label: 'Ad Info',
      icon: '📢',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Slot$/, /^Ad ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Page Type$/, /^Ref$/]
    }
  },

  'Spotify Pixel': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Pixel ID$/]
    },
    consent: {
      label: 'Consent & Privacy',
      icon: '🔒',
      order: 3,
      defaultExpanded: false,
      patterns: [/^GDPR$/]
    }
  },

  'Outbrain': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    tracking: {
      label: 'Tracking',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Click ID$/]
    },
    ecommerce: {
      label: 'Ecommerce',
      icon: '🛒',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Order Value$/, /^Currency$/]
    }
  },

  'Teads': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    pixel: {
      label: 'Pixel Info',
      icon: '🔑',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Pixel ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: false,
      patterns: [/^Time on Site$/]
    }
  },

  'RTB House': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^User ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: false,
      patterns: [/^Category$/]
    }
  },

  'Zemanta': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Campaign ID$/, /^Order ID$/]
    }
  },

  'Sojern': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/, /^Type$/]
    },
    tracking: {
      label: 'Tracking',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Partner ID$/]
    }
  },

  'Vibes': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    campaign: {
      label: 'Campaign',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Campaign ID$/]
    }
  },

  'Invoca': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    tracking: {
      label: 'Tracking',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Transaction ID$/, /^Campaign ID$/]
    }
  },

  'Brevo': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Contact ID$/, /^Email$/]
    }
  },

  'Medallia DXA': {
    event: {
      label: 'Event',
      icon: '⚡',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Event$/]
    },
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Session ID$/]
    },
    technical: {
      label: 'Technical',
      icon: '⚙️',
      order: 3,
      defaultExpanded: true,
      patterns: [/^Site ID$/]
    }
  },

  'Glassbox': {
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Session ID$/, /^Customer ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page URL$/]
    }
  },

  'FullStory': {
    identity: {
      label: 'Identity',
      icon: '👤',
      order: 1,
      defaultExpanded: true,
      patterns: [/^User ID$/, /^Display Name$/, /^Email$/]
    }
  },

  'Crazy Egg': {
    account: {
      label: 'Account',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^Account ID$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 2,
      defaultExpanded: true,
      patterns: [/^Page URL$/]
    }
  },
};
