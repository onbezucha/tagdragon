import type { DataLayerSource } from '@/types/datalayer';

/**
 * Canonical display labels for DataLayer sources.
 */
export const SOURCE_LABELS: Record<DataLayerSource, string> = {
  gtm: 'GTM',
  tealium: 'TEAL',
  adobe: 'ADOBE',
  segment: 'SEG',
  digitalData: 'W3C',
  custom: 'CUSTOM',
};

/**
 * Descriptive labels (used in UI tooltips and status).
 */
export const SOURCE_DESCRIPTIONS: Record<DataLayerSource, string> = {
  gtm: 'GTM',
  tealium: 'Tealium',
  adobe: 'Adobe',
  segment: 'Segment',
  digitalData: 'W3C',
  custom: 'Custom',
};

/**
 * DataLayer source descriptions for the Info popover.
 * Ordered by detection priority (same as data-layer-main.ts).
 */
export const DATA_LAYER_SOURCES: ReadonlyArray<{
  id: DataLayerSource;
  label: string;
  globalVar: string;
  whatIs: string;
  howToRead: string;
  typicalEvents: string[];
}> = [
  {
    id: 'gtm',
    label: 'GTM',
    globalVar: 'window.dataLayer',
    whatIs:
      "Google's tag management platform. Lets marketers deploy and manage tracking pixels, analytics code, and conversion tags without modifying the website source code. Used by the majority of e-commerce and content sites worldwide.",
    howToRead:
      "Each push to window.dataLayer represents an event or data update. Look for the 'event' key to identify what happened (page_view, purchase, etc.). E-commerce data lives under the 'ecommerce' key. GTM variables reference dataLayer keys to send data to Google Analytics, Google Ads, and other platforms.",
    typicalEvents: [
      'gtm.js',
      'gtm.dom',
      'gtm.load',
      'page_view',
      'purchase',
      'add_to_cart',
      'begin_checkout',
      'view_item',
      'generate_lead',
      'sign_up',
      'login',
    ],
  },
  {
    id: 'tealium',
    label: 'Tealium',
    globalVar: 'window.utag',
    whatIs:
      'Enterprise tag management and customer data platform. Manages marketing tags across websites and mobile apps. Often used by large enterprises as an alternative to GTM due to its vendor-agnostic approach.',
    howToRead:
      'utag.view() fires on page loads (like page_view). utag.link() fires on user interactions (clicks, form submissions). The initial utag.data object contains the page context — URL, content category, user ID, and other UDO (Universal Data Object) properties.',
    typicalEvents: ['utag.view', 'utag.link'],
  },
  {
    id: 'adobe',
    label: 'Adobe',
    globalVar: 'window.adobeDataLayer / _satellite',
    whatIs:
      "Adobe's tag management and data collection platform. Part of Adobe Experience Cloud — integrates with Adobe Analytics, Adobe Target, and Audience Manager. Used by enterprise organizations invested in the Adobe marketing stack.",
    howToRead:
      "adobeDataLayer pushes follow a schema with '@type' and 'eventInfo' keys. The _satellite.track() calls represent direct tracking events fired by Adobe Launch rules. Data is structured around the Adobe Client Data Layer (ACDL) standard with event, component, and commerce schemas.",
    typicalEvents: [
      '_satellite.track()',
      'page-view',
      'user-info',
      'commerce:product-view',
      'commerce:purchase',
      'commerce:checkout',
      'cmp:show',
      'cmp:click',
    ],
  },
  {
    id: 'segment',
    label: 'Segment',
    globalVar: 'window.analytics',
    whatIs:
      'Customer data platform that collects data from multiple sources and routes it to analytics, marketing, and data warehouse tools. Acts as a single API for tracking — you send data once, Segment delivers it everywhere.',
    howToRead:
      "Each call wraps into {_method, name, properties}: 'track' for events (e.g. 'Order Completed'), 'page' for page views, 'identify' for user traits, and 'group' for account/company data. The 'properties' object contains the event-specific data.",
    typicalEvents: [
      'Order Completed',
      'Product Viewed',
      'Cart Viewed',
      'Checkout Started',
      'Page View',
      'Identify',
      'Signed Up',
      'Login',
    ],
  },
  {
    id: 'digitalData',
    label: 'W3C',
    globalVar: 'window.digitalData',
    whatIs:
      'A W3C community standard for representing customer experience data on web pages. Unlike push-based systems, digitalData is a static data object that describes the current page state — page info, user, products, cart, etc.',
    howToRead:
      'Each push represents a snapshot of the entire digitalData object at that moment. Key sections: digitalData.page (current page info), digitalData.user (visitor data), digitalData.product[] (products on page), digitalData.cart (shopping cart), digitalData.transaction (order data). Changes between snapshots show what the SPA updated.',
    typicalEvents: ['page.changed', 'user.changed', 'cart.updated', 'transaction.completed'],
  },
];

export const SOURCE_TOOLTIPS: Record<DataLayerSource, string> = {
  gtm: 'Google Tag Manager — events via window.dataLayer.push()',
  tealium: 'Tealium iQ — events via utag.view() / utag.link()',
  adobe: 'Adobe Launch — events via adobeDataLayer / _satellite.track()',
  segment: 'Segment CDP — events via analytics.track() / page()',
  digitalData: 'W3C Customer Data Layer — page state snapshots',
  custom: 'Custom data layer source',
};

export const SOURCE_COLORS: Record<string, string> = {
  gtm: '#E8710A',
  tealium: '#2C7A7B',
  adobe: '#E53E3E',
  segment: '#3182CE',
  digitalData: '#38A169',
  custom: '#718096',
};

export function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#718096';
}
