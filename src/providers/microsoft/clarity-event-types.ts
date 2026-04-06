// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT CLARITY — EVENT TYPE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
// Event type names, priorities, and lookup tables based on @clarity-types/data
// from the open-source Microsoft Clarity project.
// https://github.com/microsoft/clarity/blob/master/packages/clarity-js/types/data.d.ts

/** Human-readable names for Clarity event type codes */
export const CLARITY_EVENT_NAMES: Record<number, string> = {
  0: 'Metric',
  1: 'Dimension',
  2: 'Upload',
  3: 'Upgrade',
  4: 'Baseline',
  5: 'Discover',
  6: 'Mutation',
  7: 'Region',
  8: 'Document',
  9: 'Click',
  10: 'Scroll',
  11: 'Resize',
  12: 'MouseMove',
  13: 'MouseDown',
  14: 'MouseUp',
  15: 'MouseWheel',
  16: 'DoubleClick',
  17: 'TouchStart',
  18: 'TouchEnd',
  19: 'TouchMove',
  20: 'TouchCancel',
  21: 'Selection',
  22: 'Timeline',
  23: 'Page',
  24: 'Custom',
  25: 'Ping',
  26: 'Unload',
  27: 'Input',
  28: 'Visibility',
  29: 'Navigation',
  30: 'Connection',
  31: 'ScriptError',
  32: 'ImageError',
  33: 'Log',
  34: 'Variable',
  35: 'Limit',
  36: 'Summary',
  37: 'Box',
  38: 'Clipboard',
  39: 'Submit',
  40: 'Extract',
  41: 'Fraud',
  42: 'Change',
  43: 'Snapshot',
  44: 'Animation',
  45: 'StyleSheetAdoption',
  46: 'StyleSheetUpdate',
  47: 'Consent',
  48: 'ContextMenu',
  50: 'Focus',
  51: 'CustomElement',
  52: 'Chat',
};

/**
 * Event type priority for _eventName selection.
 * Lower index = higher priority. First match wins.
 * Ordered so the most interesting events for marketers appear first.
 */
export const CLARITY_EVENT_PRIORITY: number[] = [
  24, // Custom — most important for marketers
  39, // Submit (form submit)
  27, // Input change
  9,  // Click
  16, // DoubleClick
  23, // Page
  29, // Navigation
  10, // Scroll
  28, // Visibility
  47, // Consent
  31, // ScriptError
  21, // Selection
  11, // Resize
  38, // Clipboard
  48, // ContextMenu
  50, // Focus
  52, // Chat
  25, // Ping (heartbeat — lowest priority)
];

/** Human-readable names for Clarity Metric sub-codes (Event type 0) */
export const CLARITY_METRIC_NAMES: Record<number, string> = {
  0: 'ClientTimestamp',
  1: 'Playback',
  2: 'TotalBytes',
  3: 'LayoutCost',
  4: 'TotalCost',
  5: 'InvokeCount',
  6: 'ThreadBlockedTime',
  7: 'LongTaskCount',
  8: 'LargestPaint',
  9: 'CumulativeLayoutShift',
  10: 'FirstInputDelay',
  11: 'RatingValue',
  12: 'RatingCount',
  13: 'ProductPrice',
  14: 'ScreenWidth',
  15: 'ScreenHeight',
  16: 'ColorDepth',
  17: 'ReviewCount',
  18: 'BestRating',
  19: 'WorstRating',
  20: 'CartPrice',
  21: 'CartShipping',
  22: 'CartDiscount',
  23: 'CartTax',
  24: 'CartTotal',
  25: 'EventCount',
  26: 'Automation',
  27: 'Mobile',
  28: 'UploadTime',
  29: 'SinglePage',
  30: 'UsedMemory',
  31: 'Iframed',
  32: 'MaxTouchPoints',
  33: 'HardwareConcurrency',
  34: 'DeviceMemory',
  35: 'Electron',
  37: 'InteractionNextPaint',
  38: 'HistoryClear',
  39: 'AngularZone',
};

/** Human-readable names for Clarity Dimension sub-codes (Event type 1) */
export const CLARITY_DIMENSION_NAMES: Record<number, string> = {
  0: 'UserAgent',
  1: 'Url',
  2: 'Referrer',
  3: 'PageTitle',
  4: 'NetworkHosts',
  5: 'SchemaType',
  6: 'ProductBrand',
  7: 'ProductAvailability',
  8: 'AuthorName',
  9: 'Language',
  10: 'ProductName',
  11: 'ProductCategory',
  12: 'ProductSku',
  13: 'ProductCurrency',
  14: 'ProductCondition',
  15: 'TabId',
  16: 'PageLanguage',
  17: 'DocumentDirection',
  18: 'Headline',
  19: 'MetaType',
  20: 'MetaTitle',
  21: 'Generator',
  22: 'Platform',
  23: 'PlatformVersion',
  24: 'Brand',
  25: 'Model',
  26: 'DevicePixelRatio',
  27: 'ConnectionType',
  28: 'Dob',
  29: 'CookieVersion',
  30: 'DeviceFamily',
  31: 'InitialScrollTop',
  32: 'InitialScrollBottom',
  33: 'AncestorOrigins',
  34: 'Timezone',
  35: 'TimezoneOffset',
  36: 'Consent',
  37: 'InteractionNextPaint',
};

/** Human-readable names for Clarity Consent source codes (Event type 47) */
export const CLARITY_CONSENT_SOURCES: Record<number, string> = {
  0: 'Implicit',
  1: 'API',
  2: 'GCM',
  3: 'TCF',
  4: 'APIv1',
  5: 'APIv2',
  6: 'Cookie',
  7: 'Default',
  100: 'Shopify Pixel',
  101: 'Shopify App',
  102: 'UET',
  150: 'MyAgilePrivacy',
  151: 'UserCentrics',
  152: 'Cookiebot',
  153: 'Axeptio',
  154: 'Cookiehub',
  155: 'CookieYes',
  156: 'WebTofee',
  157: 'WPConsent',
  158: 'SeersAI',
  255: 'Unknown',
};

/** Human-readable names for Clarity Upload type codes (Envelope field 8) */
export const CLARITY_UPLOAD_NAMES: Record<number, string> = {
  0: 'Async (XHR)',
  1: 'Beacon',
};

/** Human-readable names for Clarity Application Platform codes (Envelope field 10) */
export const CLARITY_PLATFORM_NAMES: Record<number, string> = {
  0: 'WebApp',
};

/** Human-readable names for Clarity Limit check codes (Event type 35) */
export const CLARITY_CHECK_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Payload',
  2: 'Shutdown',
  3: 'Retry',
  4: 'Bytes',
  5: 'Collection',
  6: 'Server',
  7: 'Page',
};
