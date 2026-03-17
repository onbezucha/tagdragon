// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TRACKER v2.0 - PANEL CONTROLLER
// Main UI controller for DevTools panel - manages state, rendering, filtering
// ═══════════════════════════════════════════════════════════════════════════

// ─── STATE ────────────────────────────────────────────────────────────────
let allRequests = [];
let activeProviders = new Set();
let hiddenProviders = new Set();
let selectedId = null;
let isPaused = false;
let filterText = '';
let activeTab = 'decoded';
let filterEventType = '';
let filterUserId = '';
let filterStatus = '';
let filterMethod = '';
let filterHasParam = '';
const requestMap = new Map();    // id → request data (O(1) lookup)

// ─── CONFIG (persisted via chrome.storage.local) ──────────────────────────
const DEFAULT_CONFIG = {
  maxRequests: 500,
  autoPrune: true,
  pruneRatio: 0.75,  // when limit reached, prune down to 75%
};

let config = { ...DEFAULT_CONFIG };

async function loadConfig() {
  try {
    const stored = await chrome.storage.local.get('rt_config');
    if (stored.rt_config) {
      config = { ...DEFAULT_CONFIG, ...stored.rt_config };
    }
  } catch {
    // fallback to defaults (storage may not be available in all contexts)
  }
}

async function saveConfig() {
  try {
    await chrome.storage.local.set({ rt_config: config });
  } catch {
    console.warn('Request Tracker: Config save failed');
  }
}

// Load config at startup
loadConfig().then(() => initConfigUI());

// ─── COPY SVG ICON ────────────────────────────────────────────────────────
const COPY_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M10 4V2.5A1.5 1.5 0 008.5 1H2.5A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" stroke="currentColor" stroke-width="1.2"/></svg>';

// ─── PARAMETER CATEGORIZATION (Provider-First Architecture) ───────────────
// Each provider defines its OWN complete set of categories.
// No universal categories — each tool knows best what its parameters mean.
// Categories are sorted by 'order' field (1 = top, 999 = bottom).
// Matching: prefixMatch (fast string startsWith) runs before patterns (regex).
const PROVIDER_CATEGORIES = {

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

  'Sklik': {
    tracking: {
      label: 'Tracking',
      icon: '🔑',
      order: 1,
      defaultExpanded: true,
      patterns: [/^id$/, /^ID$/]
    },
    conversion: {
      label: 'Conversion',
      icon: '🎯',
      order: 2,
      defaultExpanded: true,
      patterns: [/^value$/, /^Value$/]
    },
    page: {
      label: 'Page',
      icon: '📄',
      order: 3,
      defaultExpanded: true,
      patterns: [/^URL$/, /^url$/]
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

// ─── DOM REFS ─────────────────────────────────────────────────────────────
const $list = document.getElementById('request-list');
const $empty = document.getElementById('empty-state');
const $detail = document.getElementById('detail-pane');
const $detailBadge = document.getElementById('detail-provider-badge');
const $detailUrl = document.getElementById('detail-url');
const $detailContent = document.getElementById('detail-content');
const $statusStats = document.getElementById('status-stats');
const $filterInput = document.getElementById('filter-input');
const $clearFilter = document.getElementById('btn-clear-filter');
const $metaMethod = document.getElementById('meta-method');
const $metaStatus = document.getElementById('meta-status');
const $metaDur = document.getElementById('meta-duration');
const $metaTs = document.getElementById('meta-timestamp');
const $providerPills = document.getElementById('provider-pills');
const $activeFilters = document.getElementById('active-filters');
const $providerBar = document.getElementById('provider-bar');
const $filterBar = document.getElementById('filter-bar');
const $settingsPopover = document.getElementById('settings-popover');
const $filterPopover = document.getElementById('filter-popover');
const $filterSubmenu = document.getElementById('filter-submenu');
const $filterSubmenuContent = document.getElementById('filter-submenu-content');
const $main = document.getElementById('main');
const $splitter = document.getElementById('splitter');

// ─── ADOBE ANALYTICS PARSERS (unchanged) ──────────────────────────────────
function parseAdobeEvents(eventsString) {
  if (!eventsString || typeof eventsString !== 'string') return null;
  
  const events = eventsString.split(',').map(e => e.trim()).filter(Boolean);
  if (events.length === 0) return null;
  
  return events.map(eventStr => {
    const [id, value] = eventStr.split(':');
    
    let type = 'Counter';
    let displayValue = null;
    
    if (value) {
      type = 'Numeric';
      displayValue = value;
    }
    
    const conversionEvents = ['purchase', 'prodView', 'scOpen', 'scAdd', 
                              'scRemove', 'scCheckout', 'scView'];
    if (conversionEvents.includes(id.toLowerCase())) {
      type = 'Conversion';
    }
    
    return { id, type, value: displayValue };
  });
}

function parseAdobeProducts(productsString) {
  if (!productsString || typeof productsString !== 'string') return null;
  
  const products = productsString.split(',').map(p => p.trim()).filter(Boolean);
  if (products.length === 0) return null;
  
  return products.map(productStr => {
    const parts = productStr.split(';');
    return {
      category: parts[0] || '',
      sku: parts[1] || '',
      quantity: parts[2] || '',
      price: parts[3] || '',
      events: parts[4] || ''
    };
  });
}

// ─── CATEGORIZATION (Provider-First) ──────────────────────────────────────
function categorizeParams(decoded, providerName) {
  const categorized = {};
  const providerCats = PROVIDER_CATEGORIES[providerName] || {};

  // 1. Sort categories by order
  const orderedEntries = Object.entries(providerCats)
    .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));

  // 2. Pre-allocate empty buckets
  for (const [key] of orderedEntries) {
    categorized[key] = {};
  }

  // 3. Categorize each parameter
  for (const [param, value] of Object.entries(decoded)) {
    let assigned = false;

    for (const [catKey, category] of orderedEntries) {
      // a) Prefix match (fast string check — O(n) prefixes × O(1) startsWith)
      if (category.prefixMatch) {
        for (const prefix of category.prefixMatch) {
          if (param.startsWith(prefix)) {
            categorized[catKey][param] = value;
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }

      // b) Regex pattern match
      if (category.patterns) {
        for (const pattern of category.patterns) {
          if (pattern.test(param)) {
            categorized[catKey][param] = value;
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
    }

    // c) Fallback → "Other"
    if (!assigned) {
      if (!categorized._other) categorized._other = {};
      categorized._other[param] = value;
    }
  }

  // 4. Remove empty categories
  for (const key in categorized) {
    if (Object.keys(categorized[key]).length === 0) {
      delete categorized[key];
    }
  }

  // 5. Attach _meta to each category (for renderer)
  for (const key in categorized) {
    if (providerCats[key]) {
      categorized[key]._meta = {
        label: providerCats[key].label,
        icon: providerCats[key].icon,
        order: providerCats[key].order,
        defaultExpanded: providerCats[key].defaultExpanded,
        specialRenderer: providerCats[key].specialRenderer || null,
        requiredParams: providerCats[key].requiredParams || null
      };
    } else if (key === '_other') {
      categorized[key]._meta = {
        label: 'Other',
        icon: '📦',
        order: 999,
        defaultExpanded: false,
        specialRenderer: null,
        requiredParams: null
      };
    }
  }

  return categorized;
}

function validateValue(param, value, categoryMeta) {
  const validation = {
    isValid: true,
    warning: null,
    icon: null
  };
  
  if (value === undefined || value === null || value === '') {
    validation.isValid = false;
    validation.warning = '(missing)';
    validation.icon = '⚠️';
    return validation;
  }
  
  if (categoryMeta?.requiredParams?.includes(param)) {
    if (!value) {
      validation.isValid = false;
      validation.warning = '(required)';
      validation.icon = '❌';
    }
  }
  
  return validation;
}

// ─── SEARCH INDEX (pre-computed at request arrival) ──────────────────────
const filteredIds = new Set();  // set of visible request IDs after filtering

function indexRequest(data) {
  // Pre-build search text – computed ONCE, used for every filter pass
  data._searchIndex = [
    data.url || '',
    data.provider || '',
    ...Object.keys(data.allParams || {}),
    ...Object.values(data.allParams || {}).map(String),
    ...Object.keys(data.decoded || {}),
    ...Object.values(data.decoded || {}).map(String),
  ].join('\0').toLowerCase();
  
  // Pre-compute event name – avoids repeated property lookups
  data._eventName = getEventName(data);
  
  // Pre-compute user ID presence
  data._hasUserId = !!(
    data.decoded?.client_id || data.decoded?.['Client ID'] ||
    data.allParams?.cid || data.allParams?.uid ||
    data.allParams?.user_id || data.allParams?.client_id
  );
  
  // Pre-compute status prefix
  data._statusPrefix = data.status ? String(data.status)[0] : null;
}

// ─── MEMORY BUDGET (auto-prune oldest requests) ──────────────────────────
let _pruneNotificationTimer = null;

function pruneIfNeeded() {
  if (!config.autoPrune || config.maxRequests === 0) return; // 0 = unlimited
  if (allRequests.length <= config.maxRequests) return;
  
  const pruneTarget = Math.floor(config.maxRequests * config.pruneRatio);
  const removeCount = allRequests.length - pruneTarget;
  
  // 1. Remove from data structures
  const removed = allRequests.splice(0, removeCount);
  for (const r of removed) {
    requestMap.delete(String(r.id));
    filteredIds.delete(String(r.id));
  }
  
  // 2. Remove from DOM
  const rows = $list.querySelectorAll('.req-row');
  let domRemoved = 0;
  for (let i = 0; i < rows.length && domRemoved < removeCount; i++) {
    const id = rows[i].dataset.id;
    if (!requestMap.has(id)) {
      rows[i].remove();
      domRemoved++;
    }
  }
  
  // 3. Handle selected request if it was pruned
  if (selectedId && !requestMap.has(String(selectedId))) {
    selectedId = null;
    $detail.classList.add('hidden');
    document.querySelectorAll('.req-row.active').forEach(r => r.classList.remove('active'));
  }
  
  // 4. Update provider counts
  updateProviderCounts();
  
  // 5. Recalculate running stats (some visible requests may have been pruned)
  _statsVisibleCount = 0;
  _statsTotalSize = 0;
  _statsTotalDuration = 0;
  for (const r of allRequests) {
    if (filteredIds.has(String(r.id))) {
      _statsVisibleCount++;
      _statsTotalSize += r.size || 0;
      _statsTotalDuration += r.duration || 0;
    }
  }
  
  // 6. Flash notification in status bar
  showPruneNotification(removeCount);
}

function showPruneNotification(count) {
  // Flash message in status bar
  const avgTime = _statsVisibleCount > 0 ? Math.round(_statsTotalDuration / _statsVisibleCount) : 0;
  $statusStats.textContent = `${_statsVisibleCount} / ${allRequests.length} requests · ${formatBytes(_statsTotalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'} · (${count} oldest removed)`;
  $statusStats.style.color = 'var(--orange)';
  
  clearTimeout(_pruneNotificationTimer);
  _pruneNotificationTimer = setTimeout(() => {
    $statusStats.style.color = '';
    // Refresh stats display to normal
    const at = _statsVisibleCount > 0 ? Math.round(_statsTotalDuration / _statsVisibleCount) : 0;
    $statusStats.textContent = `${_statsVisibleCount} / ${allRequests.length} requests · ${formatBytes(_statsTotalSize)} · Avg ${at > 0 ? at + 'ms' : '—'}`;
  }, 3000);
}

// ─── RUNNING STATS ACCUMULATORS (incremental updates) ───────────────────
let _statsVisibleCount = 0;
let _statsTotalSize = 0;
let _statsTotalDuration = 0;

// ─── BATCHING STATE (for requestAnimationFrame batching) ──────────────────
let _pendingRequests = [];
let _rafId = null;

// ─── ENTRY POINT (from devtools.js) ──────────────────────────────────────
window.receiveRequest = function(data) {
  try {
    if (isPaused) return;
    
    // Index and store immediately (data layer, no DOM)
    indexRequest(data);
    allRequests.push(data);
    requestMap.set(String(data.id), data);
    
    // Memory budget check
    pruneIfNeeded();
    
    // Incremental filter: evaluate the new request, O(1)
    const isVisible = !hiddenProviders.has(data.provider) && matchesFilter(data);
    
    if (isVisible) {
      filteredIds.add(String(data.id));
      _statsVisibleCount++;
      _statsTotalSize += data.size || 0;
      _statsTotalDuration += data.duration || 0;
    }
    
    // Queue for batched DOM rendering
    _pendingRequests.push({ data, isVisible });
    
    if (!_rafId) {
      _rafId = requestAnimationFrame(flushPendingRequests);
    }
  } catch(err) {
    console.error('Request Tracker: Error processing request', err);
  }
};

function flushPendingRequests() {
  _rafId = null;
  
  if (_pendingRequests.length === 0) return;
  
  $empty.style.display = 'none';
  
  // Batch all DOM operations into a DocumentFragment
  const fragment = document.createDocumentFragment();
  
  for (const { data, isVisible } of _pendingRequests) {
    ensureProviderPill(data);
    
    // Create row element (uses cloneNode template)
    const row = _rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = String(data.id);
    
    const ts = new Date(data.timestamp);
    const time = ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const eventName = data._eventName || getEventName(data);
    
    // Primary line
    const dot = row.querySelector('.req-provider-dot');
    dot.style.background = data.color;
    const nameEl = row.querySelector('.req-provider-name');
    nameEl.textContent = data.provider;
    nameEl.style.color = data.color;
    
    if (data.source === 'extension') {
      const badge = document.createElement('span');
      badge.className = 'badge-ext';
      badge.textContent = 'EXT';
      nameEl.after(badge);
    }
    
    row.querySelector('.req-event').textContent = eventName;
    row.querySelector('.req-time').textContent = time;
    
    // Secondary line
    const statusEl = row.querySelector('.req-status');
    statusEl.textContent = data.status || '—';
    if (data.status) statusEl.classList.add(`status-${String(data.status)[0]}`);
    
    const methodEl = row.querySelector('.req-method');
    methodEl.textContent = data.method;
    if (data.method === 'GET') methodEl.classList.add('method-get');
    else if (data.method === 'POST') methodEl.classList.add('method-post');
    
    row.querySelector('.req-size').textContent = formatBytes(data.size || 0);
    row.querySelector('.req-duration').textContent = data.duration ? data.duration + 'ms' : '—';
    
     // Apply filter visibility
     if (!isVisible) {
       const providerHidden = hiddenProviders.has(data.provider);
       row.classList.add(providerHidden ? 'provider-hidden' : 'filtered-out');
     }
     
     // Conditional slide-in animation (only for visible rows)
      if (isVisible) {
        row.classList.add('new');
        row.addEventListener('animationend', () => row.classList.remove('new'), { once: true });
      }
     
     fragment.appendChild(row);
  }
  
  // Single DOM append for all batched rows
  $list.appendChild(fragment);
  
  _pendingRequests = [];
  
  // Update status bar once for the entire batch
  const avgTime = _statsVisibleCount > 0 ? Math.round(_statsTotalDuration / _statsVisibleCount) : 0;
  $statusStats.textContent = `${_statsVisibleCount} / ${allRequests.length} requests · ${formatBytes(_statsTotalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'}`;
  
  // Memory warning indicator
  if (config.maxRequests > 0) {
    const usage = allRequests.length / config.maxRequests;
    if (usage > 0.95) {
      $statusStats.style.color = 'var(--red)';
    } else if (usage > 0.8) {
      $statusStats.style.color = 'var(--orange)';
    } else {
      $statusStats.style.color = '';
    }
  }
}

// ─── ROW TEMPLATE (parsed once, cloned for each new row) ─────────────────
const _rowTemplate = document.createElement('template');
_rowTemplate.innerHTML = `
  <div class="req-row">
    <div class="req-primary">
      <span class="req-provider-dot"></span>
      <span class="req-provider-name"></span>
      <span class="req-event"></span>
      <span class="req-time"></span>
    </div>
    <div class="req-secondary">
      <span class="req-status"></span>
      <span class="req-method"></span>
      <span class="req-size"></span>
      <span class="req-duration"></span>
    </div>
  </div>
`;

// ─── RENDER ROW (template + cloneNode pattern) ──────────────────────────
function renderRow(data) {
  const row = _rowTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.id = String(data.id);

  const ts = new Date(data.timestamp);
  const time = ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const eventName = data._eventName || getEventName(data);

  // Primary line
  const dot = row.querySelector('.req-provider-dot');
  dot.style.background = data.color;
  
  const name = row.querySelector('.req-provider-name');
  name.textContent = data.provider;
  name.style.color = data.color;
  
  // Insert EXT badge if needed (before event span)
  if (data.source === 'extension') {
    const badge = document.createElement('span');
    badge.className = 'badge-ext';
    badge.textContent = 'EXT';
    name.after(badge);
  }
  
  row.querySelector('.req-event').textContent = eventName;
  row.querySelector('.req-time').textContent = time;

  // Secondary line
  const statusEl = row.querySelector('.req-status');
  statusEl.textContent = data.status || '—';
  if (data.status) statusEl.classList.add(`status-${String(data.status)[0]}`);
  
  const methodEl = row.querySelector('.req-method');
  methodEl.textContent = data.method;
  if (data.method === 'GET') methodEl.classList.add('method-get');
  else if (data.method === 'POST') methodEl.classList.add('method-post');
  
  row.querySelector('.req-size').textContent = formatBytes(data.size || 0);
  row.querySelector('.req-duration').textContent = data.duration ? data.duration + 'ms' : '—';

  $list.appendChild(row);
}

// ─── EVENT DELEGATION (single listener for all request rows) ─────────────
$list.addEventListener('click', (e) => {
  const row = e.target.closest('.req-row');
  if (!row) return;
  const data = requestMap.get(row.dataset.id);
  if (data) selectRequest(data, row);
});

function getEventName(data) {
  if (!data.decoded) return getHostname(data.url);
  return data.decoded.Event 
    || data.decoded['Hit type']
    || data.decoded.event
    || data.decoded['Event']
    || data.decoded.event_name
    || Object.values(data.decoded).find(v => v && typeof v === 'string' && v.length < 50)
    || getHostname(data.url);
}

function getHostname(url) {
  try { return new URL(url).hostname; } catch { return url.slice(0, 40); }
}

// ─── SELECT REQUEST (with tab memory) ────────────────────────────────────
function selectRequest(data, row) {
  document.querySelectorAll('.req-row.active').forEach(r => r.classList.remove('active'));
  row.classList.add('active');
  selectedId = data.id;

  // Lazy categorization – compute only when user actually views the request
  if (!data.categorized) {
    data.categorized = categorizeParams(data.decoded, data.provider);
  }

  $detail.classList.remove('hidden');
  $detailBadge.textContent = data.provider;
  $detailBadge.style.background = data.color + '22';
  $detailBadge.style.color = data.color;
  $detailBadge.style.border = `1px solid ${data.color}55`;
  $detailUrl.textContent = data.url;
  $detailUrl.title = data.url;

  $metaMethod.textContent = data.method;
  $metaStatus.textContent = data.status || '—';
  $metaDur.textContent = data.duration ? data.duration + 'ms' : '—';
  $metaTs.textContent = new Date(data.timestamp).toLocaleString('en-US', { hour12: false });

  // Tab memory: keep current tab if it has data, otherwise fallback to decoded
  const availableTabs = getAvailableTabs(data);
  if (!availableTabs.includes(activeTab)) {
    activeTab = 'decoded';
  }
  
  updateTabStates(data, availableTabs);
  renderTab(activeTab, data);
  
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function getAvailableTabs(data) {
  const tabs = [];
  if (Object.keys(data.categorized || {}).length > 0) tabs.push('decoded');
  if (Object.keys(data.allParams || {}).length > 0) tabs.push('query');
  if (data.postBody) tabs.push('post');
  // Use flags for lazy-loaded data
  if (data._hasRequestHeaders || data._hasResponseHeaders || 
      Object.keys(data.requestHeaders || {}).length > 0 || 
      Object.keys(data.responseHeaders || {}).length > 0) tabs.push('headers');
  if (data._hasResponseBody || data.responseBody) tabs.push('response');
  return tabs;
}

function updateTabStates(data, availableTabs) {
  document.querySelectorAll('.dtab').forEach(tab => {
    const tabName = tab.dataset.tab;
    const isAvailable = availableTabs.includes(tabName);
    tab.classList.toggle('disabled', !isAvailable);
    tab.classList.toggle('active', tabName === activeTab);
  });
}

// ─── TAB RENDERING ────────────────────────────────────────────────────────
document.getElementById('detail-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.dtab');
  if (!btn || btn.classList.contains('disabled')) return;
  document.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  activeTab = btn.dataset.tab;
  const req = requestMap.get(String(selectedId));
  if (req) renderTab(activeTab, req);
});

function renderTab(tab, data) {
  if (!$detailContent) return;
  switch(tab) {
    case 'decoded':
      $detailContent.innerHTML = renderCategorizedParams(data.categorized, data);
      break;
    case 'query':
      $detailContent.innerHTML = renderParamTable(data.allParams);
      break;
    case 'post':
      renderPostTab(data, $detailContent);
      break;
    case 'headers':
      // Lazy load headers if not yet loaded
      if (!data.requestHeaders && !data.responseHeaders && (data._hasRequestHeaders || data._hasResponseHeaders)) {
        loadHeavyData(data);
      }
      $detailContent.innerHTML = renderHeadersTab(data);
      break;
    case 'response':
      // Lazy load response body if not yet loaded
      if (!data.responseBody && data._hasResponseBody) {
        loadHeavyData(data);
      }
      $detailContent.innerHTML = renderResponse(data.responseBody);
      break;
  }
}

function loadHeavyData(data) {
  // Retrieve heavy data from devtools.js via the exposed function
  if (window._getHeavyData) {
    const heavy = window._getHeavyData(data.id);
    if (heavy) {
      data.responseBody = heavy.responseBody;
      data.requestHeaders = heavy.requestHeaders;
      data.responseHeaders = heavy.responseHeaders;
    }
  }
}

// ─── MERGED HEADERS TAB (NEW!) ────────────────────────────────────────────
function renderHeadersTab(data) {
  let html = '';
  const reqHeaders = data.requestHeaders || {};
  const resHeaders = data.responseHeaders || {};
  
  if (Object.keys(reqHeaders).length > 0) {
    html += `<div class="headers-section-title">Request Headers (${Object.keys(reqHeaders).length})</div>`;
    html += renderParamTable(reqHeaders);
  }
  
  if (Object.keys(resHeaders).length > 0) {
    html += `<div class="headers-section-title">Response Headers (${Object.keys(resHeaders).length})</div>`;
    html += renderParamTable(resHeaders);
  }
  
  return html || '<div class="empty-tab">No headers.</div>';
}

// ─── CATEGORIZED PARAMS RENDERING ────────────────────────────────────────
function renderCategorizedParams(categorized, data) {
  if (!categorized || Object.keys(categorized).length === 0) {
    return '<div class="empty-tab">No parameters.</div>';
  }

  // Sort by order
  const sortedEntries = Object.entries(categorized)
    .sort(([, a], [, b]) => (a._meta?.order || 999) - (b._meta?.order || 999));

  let html = '';

  for (const [catKey, params] of sortedEntries) {
    const category = params._meta;
    if (!category) continue;

    const paramsWithoutMeta = { ...params };
    delete paramsWithoutMeta._meta;

    const paramCount = Object.keys(paramsWithoutMeta).length;
    if (paramCount === 0) continue;

    const collapsedClass = category.defaultExpanded === false ? 'collapsed' : '';
    const providerColor = data.color || '#6b7090';

    html += `
      <div class="category-section"
           data-category="${catKey}"
           style="--provider-color: ${providerColor};">
        <div class="category-header ${collapsedClass}">
          <div class="category-left">
            <span class="category-icon">${category.icon}</span>
            <span class="category-label">${category.label}</span>
            <span class="category-count">(${paramCount})</span>
          </div>
          <span class="category-toggle">▼</span>
        </div>
        <div class="category-content ${collapsedClass}">
          <div class="category-params">
            ${renderCategoryParams(params, catKey)}
          </div>
        </div>
      </div>
    `;
  }

  return html || '<div class="empty-tab">No parameters.</div>';
}

function renderCategoryParams(params, category) {
  const categoryMeta = params._meta;
  const paramsWithoutMeta = { ...params };
  delete paramsWithoutMeta._meta;
  
  if (categoryMeta?.specialRenderer === 'adobeEvents') {
    return Object.entries(paramsWithoutMeta)
      .map(([key, value]) => {
        const parsed = parseAdobeEvents(value);
        if (!parsed) {
          return renderNormalParam(key, value, categoryMeta);
        }
        
        const bulletList = parsed.map(evt => {
          let label = `<strong>${esc(evt.id)}</strong>`;
          if (evt.value) {
            label += ` <span style="color: var(--accent);">${esc(evt.value)}</span>`;
          }
          label += ` <span style="color: var(--text-2); font-size: 10px;">(${esc(evt.type)})</span>`;
          return `<div class="event-bullet">• ${label}</div>`;
        }).join('');
        
        return `
          <div class="param-row adobe-events">
            <div class="param-key">${esc(key)}</div>
            <div class="param-value adobe-events-list">
              ${bulletList}
            </div>
            <button class="param-copy-btn" data-copy="${esc(value)}" aria-label="Copy value">${COPY_SVG}</button>
          </div>
        `;
      }).join('');
  }
  
  if (categoryMeta?.specialRenderer === 'adobeProducts') {
    return Object.entries(paramsWithoutMeta)
      .map(([key, value]) => {
        const parsed = parseAdobeProducts(value);
        if (!parsed || parsed.length === 0) {
          return renderNormalParam(key, value, categoryMeta);
        }
        
        const tableRows = parsed.map((prod, idx) => `
          <tr>
            <td class="prod-idx">${idx + 1}</td>
            <td class="prod-sku">${esc(prod.sku || '—')}</td>
            <td class="prod-qty">${esc(prod.quantity || '—')}</td>
            <td class="prod-price">${esc(prod.price || '—')}</td>
            <td class="prod-events">${esc(prod.events || '—')}</td>
          </tr>
        `).join('');
        
        return `
          <div class="param-row adobe-products">
            <div class="param-key">${esc(key)}</div>
            <div class="param-value adobe-products-table">
              <table class="products-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Events/eVars</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
            <button class="param-copy-btn" data-copy="${esc(value)}" aria-label="Copy value">${COPY_SVG}</button>
          </div>
        `;
      }).join('');
  }
  
  return Object.entries(paramsWithoutMeta)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => renderNormalParam(key, value, categoryMeta))
    .join('');
}

function renderNormalParam(key, value, categoryMeta) {
  const validation = validateValue(key, value, categoryMeta);
  const valueStr = String(value ?? '');
  
  let valueDisplay;
  if (validation.warning) {
    valueDisplay = `<span class="warning-icon">${validation.icon}</span>${esc(validation.warning)}`;
  } else {
    valueDisplay = esc(valueStr);
  }
  
  return `
    <div class="param-row">
      <div class="param-key">${esc(key)}</div>
      <div class="param-value decoded ${validation.warning ? 'missing' : ''}">
        ${valueDisplay}
      </div>
      <button class="param-copy-btn" data-copy="${esc(valueStr)}" aria-label="Copy value">${COPY_SVG}</button>
    </div>
  `;
}

// ─── PARAM TABLE (fixed invalid HTML) ─────────────────────────────────────
function renderParamTable(obj) {
  if (!obj || !Object.keys(obj).length) return '<div class="empty-tab">No parameters.</div>';
  const rows = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const valueStr = String(v);
      return `
        <tr>
          <td class="pk">${esc(k)}</td>
          <td class="pv">${esc(valueStr)}</td>
          <td class="pc"><button class="param-copy-btn" data-copy="${esc(valueStr)}" aria-label="Copy value">${COPY_SVG}</button></td>
        </tr>
      `;
    }).join('');
  return rows ? `<table class="param-table">${rows}</table>` : '<div class="empty-tab">No parameters.</div>';
}

function renderPostTab(data, element) {
  if (!data.postBody) {
    element.innerHTML = '<div class="empty-tab">No POST body.</div>';
    return;
  }
  const text = typeof data.postBody === 'object'
    ? JSON.stringify(data.postBody, null, 2)
    : String(data.postBody);
  element.innerHTML = `<pre class="json">${esc(text)}</pre>`;
}

function renderResponse(body) {
  if (!body) return '<div class="empty-tab">No response body.</div>';
  let pretty = body;
  try { pretty = JSON.stringify(JSON.parse(body), null, 2); } catch {}
  return `<pre class="json">${esc(pretty)}</pre>`;
}

// ─── PROVIDER PILLS (NEW format) ──────────────────────────────────────────
function ensureProviderPill(data) {
  if (activeProviders.has(data.provider)) {
    updateProviderCounts();
    return;
  }
  activeProviders.add(data.provider);

  const pill = document.createElement('div');
  pill.className = 'ppill active';
  pill.dataset.provider = data.provider;
  pill.innerHTML = `
    <span class="ppill-dot" style="background:${data.color}"></span>
    <span class="ppill-name">${esc(data.provider)}</span>
    <sup class="ppill-count">0</sup>
  `;
  pill.addEventListener('click', () => toggleProvider(data.provider, pill));
  $providerPills.appendChild(pill);
  
  updateProviderCounts();
  updateFilterBarVisibility();
}

function updateProviderCounts() {
  const counts = {};
  allRequests.forEach(req => {
    counts[req.provider] = (counts[req.provider] || 0) + 1;
  });
  
  document.querySelectorAll('.ppill').forEach(pill => {
    const provider = pill.dataset.provider;
    const count = counts[provider] || 0;
    const countEl = pill.querySelector('.ppill-count');
    if (countEl) countEl.textContent = count;
  });
}

function toggleProvider(name, pill) {
  if (hiddenProviders.has(name)) {
    hiddenProviders.delete(name);
    pill.classList.replace('inactive', 'active');
  } else {
    hiddenProviders.add(name);
    pill.classList.replace('active', 'inactive');
  }
  applyFilters();
  updateActiveFilters();
}

// ─── ACTIVE FILTERS (NEW format) ──────────────────────────────────────────
function updateActiveFilters() {
  const pills = [];
  
  // Search filter
  if (filterText) {
    pills.push({ 
      type: 'search', 
      label: `"${filterText}"`,
      colorClass: 'filter-pill--search',
      dotColor: '#5090ff',
      onRemove: () => { 
        filterText = ''; 
        $filterInput.value = ''; 
        $clearFilter.style.display = 'none';
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }

  // Event type filter
  if (filterEventType) {
    let label;
    if (filterEventType.startsWith('exact:')) {
      label = filterEventType.slice(6);
    } else {
      const labels = { page_view: 'Page views', purchase: 'Purchases', custom: 'Custom events' };
      label = labels[filterEventType] || filterEventType;
    }
    pills.push({ 
      type: 'event', 
      label: `event: ${label}`,
      colorClass: 'filter-pill--event',
      dotColor: '#ab47bc',
      onRemove: () => { 
        filterEventType = ''; 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }

  // HTTP Status filter
  if (filterStatus) {
    const labels = { '2xx': '2xx Success', '3xx': '3xx Redirect', '4xx': '4xx Error', '5xx': '5xx Error' };
    pills.push({ 
      type: 'status', 
      label: `status: ${labels[filterStatus] || filterStatus}`,
      colorClass: 'filter-pill--status',
      dotColor: '#3ecf8e',
      onRemove: () => { 
        filterStatus = ''; 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }
  
  // HTTP Method filter
  if (filterMethod) {
    pills.push({ 
      type: 'method', 
      label: `method: ${filterMethod}`,
      colorClass: 'filter-pill--method',
      dotColor: '#ffa726',
      onRemove: () => { 
        filterMethod = ''; 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }
  
  // User ID filter
  if (filterUserId) {
    const labels = { has: 'Has user ID', missing: 'Missing user ID' };
    pills.push({ 
      type: 'userid', 
      label: labels[filterUserId],
      colorClass: 'filter-pill--userid',
      dotColor: '#a8adc0',
      onRemove: () => { 
        filterUserId = ''; 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }
  
  // Has parameter filter
  if (filterHasParam) {
    pills.push({ 
      type: 'has-param', 
      label: `has: ${filterHasParam}`,
      colorClass: 'filter-pill--has-param',
      dotColor: '#ef5350',
      onRemove: () => { 
        filterHasParam = ''; 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  }

  // Hidden provider filters
  hiddenProviders.forEach(provider => {
    pills.push({ 
      type: 'provider', 
      label: `${provider} hidden`,
      colorClass: 'filter-pill--provider',
      dotColor: '#ffa726',
      onRemove: () => { 
        hiddenProviders.delete(provider); 
        const p = document.querySelector(`.ppill[data-provider="${provider}"]`); 
        if (p) p.classList.replace('inactive', 'active'); 
        applyFilters(); 
        updateActiveFilters(); 
      }
    });
  });
  
  // Match count is now available from filteredIds (computed in applyFilters)
  const matchCount = filteredIds.size;
  
  // Render pills
  $activeFilters.innerHTML = '';
  
  pills.forEach((p) => {
    const el = document.createElement('div');
    el.className = `filter-pill ${p.colorClass}`;
    el.innerHTML = `
      <span class="filter-pill-dot" style="background:${p.dotColor}"></span>
      <span class="filter-pill-label">${esc(p.label)}</span>
      <span class="filter-pill-remove" aria-label="Remove filter">&times;</span>
    `;
    el.querySelector('.filter-pill-remove').addEventListener('click', p.onRemove);
    $activeFilters.appendChild(el);
  });
  
  // Add "Clear all" button if there are multiple filters
  if (pills.length > 1) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-all';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => {
      filterText = '';
      filterEventType = '';
      filterUserId = '';
      filterStatus = '';
      filterMethod = '';
      filterHasParam = '';
      hiddenProviders.clear();
      $filterInput.value = '';
      $clearFilter.style.display = 'none';
      document.querySelectorAll('.ppill.inactive').forEach(p => p.classList.replace('inactive', 'active'));
      applyFilters();
      updateActiveFilters();
    });
    $activeFilters.appendChild(clearBtn);
  }
  
  updateFilterBarVisibility();
}

function updateFilterBarVisibility() {
  const hasProviders = activeProviders.size > 0;
  const hasFilters = filterText || filterEventType || filterUserId || filterStatus || filterMethod || filterHasParam || hiddenProviders.size > 0;
  
  $providerBar.classList.toggle('visible', hasProviders);
  $filterBar.classList.toggle('visible', hasProviders || hasFilters);
}

// ─── FILTERING ────────────────────────────────────────────────────────────
function matchesFilter(data) {
  // Text search – uses pre-built _searchIndex (no JSON.stringify!)
  if (filterText) {
    const q = filterText.toLowerCase();
    if (data._searchIndex) {
      if (!data._searchIndex.includes(q)) return false;
    } else {
      // Fallback for requests that weren't indexed (shouldn't happen, but safe)
      const matchesText = data.url.toLowerCase().includes(q)
        || data.provider.toLowerCase().includes(q);
      if (!matchesText) return false;
    }
  }
  
  // Event type filter – uses pre-computed _eventName
  if (filterEventType) {
    if (filterEventType.startsWith('exact:')) {
      const exactName = filterEventType.slice(6);
      const eventName = data._eventName || getEventName(data);
      if (eventName !== exactName) return false;
    } else {
      const eventName = (data._eventName || getEventName(data)).toLowerCase();
      if (filterEventType === 'page_view') {
        if (!eventName.includes('page') && !eventName.includes('pageview')) return false;
      } else if (filterEventType === 'purchase') {
        if (!eventName.includes('purchase') && !eventName.includes('transaction')) return false;
      } else if (filterEventType === 'custom') {
        if (eventName.includes('page') || eventName.includes('purchase') || eventName.includes('transaction')) return false;
      }
    }
  }
  
  // User ID filter – uses pre-computed _hasUserId
  if (filterUserId) {
    const hasUserId = data._hasUserId !== undefined ? data._hasUserId : !!(
      data.decoded?.client_id || data.decoded?.['Client ID'] ||
      data.allParams?.cid || data.allParams?.uid ||
      data.allParams?.user_id || data.allParams?.client_id
    );
    if (filterUserId === 'has' && !hasUserId) return false;
    if (filterUserId === 'missing' && hasUserId) return false;
  }
  
  // Status filter – uses pre-computed _statusPrefix
  if (filterStatus) {
    const prefix = data._statusPrefix || (data.status ? String(data.status)[0] : null);
    if (!prefix || prefix !== filterStatus[0]) return false;
  }
   
  // Method filter
  if (filterMethod) {
    if (data.method !== filterMethod) return false;
  }
   
  // Has parameter filter
  if (filterHasParam) {
    const hasParam = !!(
      (data.allParams && data.allParams[filterHasParam] !== undefined && data.allParams[filterHasParam] !== '') ||
      (data.decoded && data.decoded[filterHasParam] !== undefined && data.decoded[filterHasParam] !== '')
    );
    if (!hasParam) return false;
  }
   
  return true;
}

function applyFilters() {
  const q = filterText ? filterText.toLowerCase() : null;
  
  let visibleCount = 0;
  let totalSize = 0;
  let totalDuration = 0;
  
  // Single pass: filter data + compute stats together
  filteredIds.clear();
  
  for (let i = 0; i < allRequests.length; i++) {
    const r = allRequests[i];
    
    // Provider check (cheapest, do first)
    if (hiddenProviders.has(r.provider)) continue;
    
    // Apply all filters using matchesFilter
    if (!matchesFilter(r)) continue;
    
    // Passed all filters
    filteredIds.add(String(r.id));
    visibleCount++;
    totalSize += r.size || 0;
    totalDuration += r.duration || 0;
  }
  
  // Update stats from the same single pass (no separate calculateStats call)
  const avgTime = visibleCount > 0 ? Math.round(totalDuration / visibleCount) : 0;
  $statusStats.textContent = `${visibleCount} / ${allRequests.length} requests · ${formatBytes(totalSize)} · Avg ${avgTime > 0 ? avgTime + 'ms' : '—'}`;
  
  // Sync running stats accumulators
  _statsVisibleCount = visibleCount;
  _statsTotalSize = totalSize;
  _statsTotalDuration = totalDuration;
  
  // Update DOM visibility
  updateRowVisibility();
}

function updateRowVisibility() {
  const rows = $list.children;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row === $empty || !row.dataset?.id) continue;
    const id = row.dataset.id;
    const shouldBeVisible = filteredIds.has(id);
    const isCurrentlyHidden = row.classList.contains('filtered-out') || row.classList.contains('provider-hidden');
    
    if (shouldBeVisible && isCurrentlyHidden) {
      row.classList.remove('filtered-out', 'provider-hidden');
    } else if (!shouldBeVisible) {
      // Determine if hidden by provider or by filter
      const data = requestMap.get(id);
      if (data && hiddenProviders.has(data.provider)) {
        if (!row.classList.contains('provider-hidden')) {
          row.classList.remove('filtered-out');
          row.classList.add('provider-hidden');
        }
      } else {
        if (!row.classList.contains('filtered-out')) {
          row.classList.remove('provider-hidden');
          row.classList.add('filtered-out');
        }
      }
    }
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────
function updateStats() {
  // Stats are now computed inside applyFilters() single-pass.
  // This function is kept for backward compatibility when called standalone.
  // It triggers a full filter pass to refresh stats.
  applyFilters();
}

// ─── SPLITTER DRAG (NEW!) ─────────────────────────────────────────────────
let isDragging = false;

$splitter.addEventListener('mousedown', (e) => {
  isDragging = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const width = Math.max(280, Math.min(e.clientX, window.innerWidth - 300));
  $main.style.gridTemplateColumns = `${width}px 4px 1fr`;
  localStorage.setItem('rt-list-width', width);
});

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Restore saved width
const savedWidth = localStorage.getItem('rt-list-width');
if (savedWidth) {
  $main.style.gridTemplateColumns = `${savedWidth}px 4px 1fr`;
}

// ─── KEYBOARD NAVIGATION (NEW!) ───────────────────────────────────────────
document.addEventListener('keydown', (e) => {
   // Ctrl+L = clear
   if (e.ctrlKey && e.key === 'l') {
     e.preventDefault();
     document.getElementById('btn-clear').click();
     return;
   }
   
   // Ctrl+Shift+F = open filter popover
   if (e.ctrlKey && e.shiftKey && e.key === 'F') {
     e.preventDefault();
     document.getElementById('btn-add-filter').click();
     return;
   }
   
   // Ctrl+F = focus search
   if (e.ctrlKey && e.key === 'f') {
     e.preventDefault();
     $filterInput.focus();
     return;
   }
  
   // Escape
   if (e.key === 'Escape') {
     // Let filter popover handler handle Escape if it's open
     if ($filterPopover && $filterPopover.classList.contains('visible')) return;
     
     if (document.activeElement === $filterInput) {
       filterText = '';
       $filterInput.value = '';
       $filterInput.blur();
       applyFilters();
       updateActiveFilters();
     } else if (!$detail.classList.contains('hidden')) {
       $detail.classList.add('hidden');
       document.querySelectorAll('.req-row.active').forEach(r => r.classList.remove('active'));
       selectedId = null;
     }
     return;
   }
  
  // Arrow keys for list navigation
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') && document.activeElement !== $filterInput) {
    e.preventDefault();
    navigateList(e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1);
    return;
  }
  
  // Home/End
  if (e.key === 'Home' && document.activeElement !== $filterInput) {
    e.preventDefault();
    navigateToEdge('first');
    return;
  }
  if (e.key === 'End' && document.activeElement !== $filterInput) {
    e.preventDefault();
    navigateToEdge('last');
    return;
  }
});

function navigateList(direction) {
  const rows = Array.from(document.querySelectorAll('.req-row:not(.filtered-out):not(.provider-hidden)'));
  if (rows.length === 0) return;
  
  const currentIdx = rows.findIndex(r => r.classList.contains('active'));
  let nextIdx;
  
  if (currentIdx === -1) {
    nextIdx = direction > 0 ? 0 : rows.length - 1;
  } else {
    nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= rows.length) nextIdx = rows.length - 1;
  }
  
  const nextRow = rows[nextIdx];
  const data = requestMap.get(nextRow.dataset.id);
  if (data) selectRequest(data, nextRow);
}

function navigateToEdge(edge) {
  const rows = Array.from(document.querySelectorAll('.req-row:not(.filtered-out):not(.provider-hidden)'));
  if (rows.length === 0) return;
  const row = edge === 'first' ? rows[0] : rows[rows.length - 1];
  const data = requestMap.get(row.dataset.id);
  if (data) selectRequest(data, row);
}

// ─── SETTINGS POPOVER (NEW!) ──────────────────────────────────────────────
document.getElementById('btn-settings').addEventListener('click', (e) => {
  e.stopPropagation();
  $settingsPopover.classList.toggle('visible');
});

document.addEventListener('click', (e) => {
  if (!$settingsPopover.contains(e.target) && !e.target.closest('#btn-settings')) {
    $settingsPopover.classList.remove('visible');
  }
});

// Filter change handlers moved to filter popover dropdown submenus

document.getElementById('btn-reset-filters').addEventListener('click', () => {
  filterText = '';
  filterEventType = '';
  filterUserId = '';
  filterStatus = '';
  filterMethod = '';
  filterHasParam = '';
  hiddenProviders.clear();
  $filterInput.value = '';
  $clearFilter.style.display = 'none';
  document.querySelectorAll('.ppill.inactive').forEach(p => p.classList.replace('inactive', 'active'));
  applyFilters();
  updateActiveFilters();
  $settingsPopover.classList.remove('visible');
});


// ─── CONFIG UI HANDLERS ───────────────────────────────────────────────────
function initConfigUI() {
  const cfgMaxEl = document.getElementById('cfg-max-requests');
  const cfgPruneEl = document.getElementById('cfg-auto-prune');
  
  if (cfgMaxEl) {
    // Set initial value from config
    cfgMaxEl.value = String(config.maxRequests);
    
    cfgMaxEl.addEventListener('change', (e) => {
      config.maxRequests = parseInt(e.target.value) || 0; // 0 = unlimited
      saveConfig();
      pruneIfNeeded(); // immediately prune if above new limit
    });
  }
  
  if (cfgPruneEl) {
    // Set initial value from config
    cfgPruneEl.checked = config.autoPrune;
    
    cfgPruneEl.addEventListener('change', (e) => {
      config.autoPrune = e.target.checked;
      saveConfig();
    });
  }
}



// ─── FILTER POPOVER ───────────────────────────────────────────────────────
let activeSubmenu = null;

document.getElementById('btn-add-filter').addEventListener('click', (e) => {
  e.stopPropagation();
  
  // Close settings popover if open
  $settingsPopover.classList.remove('visible');
  
  // Toggle filter popover
  if ($filterPopover.classList.contains('visible')) {
    closeFilterPopover();
    return;
  }
  
  // Position below the button
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  $filterPopover.style.top = (rect.bottom + 4) + 'px';
  $filterPopover.style.left = rect.left + 'px';
  $filterPopover.classList.add('visible');
  
  // Mark items that have active filters
  updateFilterPopoverState();
});

function closeFilterPopover() {
  $filterPopover.classList.remove('visible');
  $filterSubmenu.classList.remove('visible');
  activeSubmenu = null;
}

function updateFilterPopoverState() {
  // Highlight menu items that have active filters
  $filterPopover.querySelectorAll('.filter-popover-item').forEach(item => {
    item.classList.remove('active-filter');
  });
  
  if (filterEventType) {
    const el = $filterPopover.querySelector('[data-submenu="event"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterStatus) {
    const el = $filterPopover.querySelector('[data-submenu="status"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterMethod) {
    const el = $filterPopover.querySelector('[data-submenu="method"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterUserId) {
    const el = $filterPopover.querySelector('[data-submenu="userid"]');
    if (el) el.classList.add('active-filter');
  }
  if (filterHasParam) {
    const el = $filterPopover.querySelector('[data-submenu="has-param"]');
    if (el) el.classList.add('active-filter');
  }
}

// Handle clicks on filter popover menu items
$filterPopover.addEventListener('click', (e) => {
  e.stopPropagation();
  const item = e.target.closest('.filter-popover-item');
  if (!item) return;
  
  const submenuType = item.dataset.submenu;
  if (!submenuType) return;
  
  if (activeSubmenu === submenuType) {
    $filterSubmenu.classList.remove('visible');
    activeSubmenu = null;
    return;
  }
  
  activeSubmenu = submenuType;
  openSubmenu(submenuType, item);
});

function openSubmenu(type, anchorItem) {
  const rect = anchorItem.getBoundingClientRect();
  const popoverRect = $filterPopover.getBoundingClientRect();
  
  // Position to the right of the popover
  let left = popoverRect.right + 4;
  let top = rect.top;
  
  // If it would go off screen right, position to the left instead
  if (left + 260 > window.innerWidth) {
    left = popoverRect.left - 260 - 4;
  }
  
  // If it would go off screen bottom, shift up
  if (top + 320 > window.innerHeight) {
    top = window.innerHeight - 320 - 8;
  }
  
  $filterSubmenu.style.top = top + 'px';
  $filterSubmenu.style.left = left + 'px';
  
  // Render submenu content based on type
  renderSubmenuContent(type);
  
  $filterSubmenu.classList.add('visible');
}

function renderSubmenuContent(type) {
  let html = '';
  
  switch (type) {
    case 'event':
      html = renderEventSubmenu();
      break;
    case 'status':
      html = renderStatusSubmenu();
      break;
    case 'method':
      html = renderMethodSubmenu();
      break;
    case 'userid':
      html = renderUserIdSubmenu();
      break;
    case 'has-param':
      html = renderHasParamSubmenu();
      break;
  }
  
  $filterSubmenuContent.innerHTML = html;
  
  // Attach event listeners for submenu items
  attachSubmenuListeners(type);
}

function renderEventSubmenu() {
  const events = getKnownEventNames();
  let html = '<div class="filter-submenu-search"><input type="text" id="submenu-event-search" placeholder="Search events..."></div>';
  
  // Group presets
  html += '<div class="filter-submenu-group-label">Presets</div>';
  html += `<div class="filter-submenu-item ${filterEventType === 'page_view' ? 'selected' : ''}" data-value="page_view"><span class="item-label">Page views</span></div>`;
  html += `<div class="filter-submenu-item ${filterEventType === 'purchase' ? 'selected' : ''}" data-value="purchase"><span class="item-label">Purchases</span></div>`;
  html += `<div class="filter-submenu-item ${filterEventType === 'custom' ? 'selected' : ''}" data-value="custom"><span class="item-label">Custom events</span></div>`;
  
  if (events.length > 0) {
    html += '<div class="filter-submenu-divider"></div>';
    html += '<div class="filter-submenu-group-label">Detected events</div>';
    
    events.forEach(([name, count]) => {
      const isSelected = filterEventType === 'exact:' + name;
      html += `<div class="filter-submenu-item event-item ${isSelected ? 'selected' : ''}" data-value="exact:${esc(name)}">
        <span class="item-label">${esc(name)}</span>
        <span class="item-count">${count}</span>
      </div>`;
    });
  }
  
  return html;
}

function renderStatusSubmenu() {
  const statusCounts = getStatusCounts();
  const statuses = [
    { value: '2', label: '2xx Success', icon: '&#10003;', color: 'var(--green)' },
    { value: '3', label: '3xx Redirect', icon: '&#8599;', color: 'var(--accent)' },
    { value: '4', label: '4xx Client Error', icon: '&#9888;', color: 'var(--orange)' },
    { value: '5', label: '5xx Server Error', icon: '&#10005;', color: 'var(--red)' }
  ];
  
   let html = '';
   statuses.forEach(s => {
     const count = statusCounts[s.value] || 0;
     const isSelected = filterStatus === s.value + 'xx';
     const isDisabled = count === 0;
     html += `<div class="filter-submenu-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" data-value="${s.value}xx" ${isDisabled ? 'style="opacity:0.3;pointer-events:none"' : ''}>
       <span class="item-label"><span style="color:${s.color}">${s.icon}</span> ${s.label}</span>
       <span class="item-count">${count}</span>
     </div>`;
   });
  
  return html;
}

function renderMethodSubmenu() {
  const methodCounts = getMethodCounts();
  let html = '';
  
  const methods = Object.entries(methodCounts).sort((a, b) => b[1] - a[1]);
  
  if (methods.length === 0) {
    html += '<div class="filter-submenu-item" style="color:var(--text-2);cursor:default"><span class="item-label">No requests yet</span></div>';
  } else {
    methods.forEach(([method, count]) => {
      const isSelected = filterMethod === method;
      html += `<div class="filter-submenu-item ${isSelected ? 'selected' : ''}" data-value="${esc(method)}">
        <span class="item-label">${esc(method)}</span>
        <span class="item-count">${count}</span>
      </div>`;
    });
  }
  
  return html;
}

function renderUserIdSubmenu() {
  const counts = getUserIdCounts();
  let html = '';
  
  html += `<div class="filter-submenu-item ${filterUserId === 'has' ? 'selected' : ''}" data-value="has">
    <span class="item-label">Has user ID</span>
    <span class="item-count">${counts.has}</span>
  </div>`;
  html += `<div class="filter-submenu-item ${filterUserId === 'missing' ? 'selected' : ''}" data-value="missing">
    <span class="item-label">Missing user ID</span>
    <span class="item-count">${counts.missing}</span>
  </div>`;
  
  return html;
}

function renderHasParamSubmenu() {
  let html = '';
  
  html += `<div class="filter-submenu-input-row">
    <input type="text" id="has-param-input" placeholder="Parameter name..." value="${esc(filterHasParam)}">
    <button id="has-param-apply">Add</button>
  </div>`;
  
  // Quick picks from common params
  const commonParams = getCommonParams();
  if (commonParams.length > 0) {
    html += '<div class="filter-submenu-group-label">Common parameters</div>';
    html += '<div class="filter-submenu-quickpicks">';
    commonParams.forEach(p => {
      html += `<span class="filter-submenu-quickpick" data-param="${esc(p)}">${esc(p)}</span>`;
    });
    html += '</div>';
  }
  
  return html;
}

function attachSubmenuListeners(type) {
  switch (type) {
    case 'event': {
      // Search filter
      const searchInput = document.getElementById('submenu-event-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase();
          $filterSubmenuContent.querySelectorAll('.event-item').forEach(item => {
            const label = item.querySelector('.item-label').textContent.toLowerCase();
            item.style.display = label.includes(q) ? '' : 'none';
          });
        });
        // Focus the search input
        setTimeout(() => searchInput.focus(), 50);
      }
      
      // Item clicks
      $filterSubmenuContent.querySelectorAll('.filter-submenu-item').forEach(item => {
        if (item.style.opacity === '0.3') return; // disabled
        item.addEventListener('click', () => {
          const value = item.dataset.value;
          if (!value) return;
          // Toggle: if already selected, deselect
          filterEventType = (filterEventType === value) ? '' : value;
          applyFilters();
          updateActiveFilters();
          closeFilterPopover();
        });
      });
      break;
    }
    
    case 'status': {
       $filterSubmenuContent.querySelectorAll('.filter-submenu-item:not(.disabled)').forEach(item => {
         item.addEventListener('click', () => {
           const value = item.dataset.value;
           if (!value) return;
           filterStatus = (filterStatus === value) ? '' : value;
           applyFilters();
           updateActiveFilters();
           closeFilterPopover();
         });
       });
       break;
     }
    
    case 'method': {
      $filterSubmenuContent.querySelectorAll('.filter-submenu-item').forEach(item => {
        item.addEventListener('click', () => {
          const value = item.dataset.value;
          if (!value) return;
          filterMethod = (filterMethod === value) ? '' : value;
          applyFilters();
          updateActiveFilters();
          closeFilterPopover();
        });
      });
      break;
    }
    
    case 'userid': {
      $filterSubmenuContent.querySelectorAll('.filter-submenu-item').forEach(item => {
        item.addEventListener('click', () => {
          const value = item.dataset.value;
          if (!value) return;
          filterUserId = (filterUserId === value) ? '' : value;
          applyFilters();
          updateActiveFilters();
          closeFilterPopover();
        });
      });
      break;
    }
    
    case 'has-param': {
      const input = document.getElementById('has-param-input');
      const applyBtn = document.getElementById('has-param-apply');
      
      if (input && applyBtn) {
        const applyParam = () => {
          const val = input.value.trim();
          if (!val) return;
          filterHasParam = val;
          applyFilters();
          updateActiveFilters();
          closeFilterPopover();
        };
        
        applyBtn.addEventListener('click', applyParam);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') applyParam();
        });
        
        setTimeout(() => input.focus(), 50);
      }
      
      // Quick picks
      $filterSubmenuContent.querySelectorAll('.filter-submenu-quickpick').forEach(pick => {
        pick.addEventListener('click', () => {
          filterHasParam = pick.dataset.param;
          applyFilters();
          updateActiveFilters();
          closeFilterPopover();
        });
      });
      break;
    }
  }
}

// Helper: get known event names from allRequests
function getKnownEventNames() {
   const counts = new Map();
   allRequests.forEach(r => {
     const name = r._eventName || getEventName(r);
     if (name && name !== getHostname(r.url)) {
       counts.set(name, (counts.get(name) || 0) + 1);
     }
   });
   return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Helper: get status counts
function getStatusCounts() {
   const counts = {};
   allRequests.forEach(r => {
     if (r._statusPrefix) {
       counts[r._statusPrefix] = (counts[r._statusPrefix] || 0) + 1;
     }
   });
   return counts;
}

// Helper: get method counts
function getMethodCounts() {
  const counts = {};
  allRequests.forEach(r => {
    if (r.method) {
      counts[r.method] = (counts[r.method] || 0) + 1;
    }
  });
  return counts;
}

// Helper: get user ID counts
function getUserIdCounts() {
   let has = 0, missing = 0;
   allRequests.forEach(r => {
     if (r._hasUserId) has++; else missing++;
   });
   return { has, missing };
}

// Helper: get common parameter names
function getCommonParams() {
  const counts = new Map();
  const interesting = ['transaction_id', 'client_id', 'user_id', 'currency', 'value', 'items', 'products', 'event_name', 'page_location', 'page_title'];
  
  allRequests.forEach(r => {
    const allKeys = new Set([
      ...Object.keys(r.allParams || {}),
      ...Object.keys(r.decoded || {})
    ]);
    allKeys.forEach(k => {
      counts.set(k, (counts.get(k) || 0) + 1);
    });
  });
  
  // Return interesting params that actually exist, plus top frequent ones
  const existing = interesting.filter(p => counts.has(p));
  const frequent = [...counts.entries()]
    .filter(([k]) => !interesting.includes(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);
  
  return [...new Set([...existing, ...frequent])].slice(0, 10);
}

// Close filter popover when clicking outside
document.addEventListener('click', (e) => {
  if (!$filterPopover.contains(e.target) && 
      !$filterSubmenu.contains(e.target) && 
      !e.target.closest('#btn-add-filter')) {
    closeFilterPopover();
  }
});

// Close filter popover on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $filterPopover.classList.contains('visible')) {
    closeFilterPopover();
    e.stopImmediatePropagation();
  }
});

// ─── PROVIDER BAR: ALL / NONE ─────────────────────────────────────────────
document.getElementById('btn-providers-all').addEventListener('click', () => {
  hiddenProviders.clear();
  document.querySelectorAll('.ppill.inactive').forEach(p => p.classList.replace('inactive', 'active'));
  applyFilters();
  updateActiveFilters();
});

document.getElementById('btn-providers-none').addEventListener('click', () => {
  activeProviders.forEach(p => hiddenProviders.add(p));
  document.querySelectorAll('.ppill.active').forEach(p => p.classList.replace('active', 'inactive'));
  applyFilters();
  updateActiveFilters();
});

// ─── TOOLBAR EVENTS ───────────────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', () => {
   allRequests = [];
   requestMap.clear();
   filteredIds.clear();
   selectedId = null;
   filterText = '';
   filterEventType = '';
   filterUserId = '';
   filterStatus = '';
   filterMethod = '';
   filterHasParam = '';
   $filterInput.value = '';
   $clearFilter.style.display = 'none';
   $list.innerHTML = '';
   $list.appendChild($empty);
   $empty.style.display = '';
   $detail.classList.add('hidden');
   $providerPills.innerHTML = '';
   $activeFilters.innerHTML = '';
   activeProviders.clear();
   hiddenProviders.clear();
   _statsVisibleCount = 0;
   _statsTotalSize = 0;
   _statsTotalDuration = 0;
   _pendingRequests = [];
   if (_rafId) {
     cancelAnimationFrame(_rafId);
     _rafId = null;
   }
   clearTimeout(_pruneNotificationTimer);
   if (window._clearHeavyData) window._clearHeavyData();
   $providerBar.classList.remove('visible');
   $filterBar.classList.remove('visible');
   updateStats();
   updateFilterBarVisibility();
});

document.getElementById('chk-pause').addEventListener('change', (e) => {
  isPaused = e.target.checked;
  document.body.classList.toggle('paused', isPaused);
});

let filterTimer;
$filterInput.addEventListener('input', (e) => {
  filterText = e.target.value;
  $clearFilter.style.display = filterText ? 'flex' : 'none';
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    applyFilters();
    updateActiveFilters();
  }, 150);
});

$clearFilter.addEventListener('click', () => {
  filterText = '';
  $filterInput.value = '';
  $clearFilter.style.display = 'none';
  applyFilters();
  updateActiveFilters();
});

$clearFilter.style.display = 'none';

document.getElementById('btn-close-detail').addEventListener('click', () => {
  $detail.classList.add('hidden');
  document.querySelectorAll('.req-row.active').forEach(r => r.classList.remove('active'));
  selectedId = null;
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(allRequests, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `requests-${Date.now()}.json`;
  a.click();
});

// ─── CATEGORY TOGGLE ──────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const header = e.target.closest('.category-header');
  if (!header) return;
  header.classList.toggle('collapsed');
  const content = header.nextElementSibling;
  if (content && content.classList.contains('category-content')) {
    content.classList.toggle('collapsed');
  }
});

// ─── COPY TO CLIPBOARD ────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.param-copy-btn');
  if (!copyBtn) return;
  const value = copyBtn.dataset.copy;
  navigator.clipboard.writeText(value).then(() => {
    copyBtn.classList.add('copied');
    setTimeout(() => copyBtn.classList.remove('copied'), 800);
  }).catch(err => console.error('Copy failed:', err));
});

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + sizes[i];
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
