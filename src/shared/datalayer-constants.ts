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
  description: string;
}> = [
  {
    id: 'gtm',
    label: 'GTM',
    globalVar: 'window.dataLayer',
    description: 'Intercepts .push() calls and replays existing array items',
  },
  {
    id: 'tealium',
    label: 'Tealium',
    globalVar: 'window.utag',
    description: 'Intercepts utag.link() and utag.view() calls',
  },
  {
    id: 'adobe',
    label: 'Adobe',
    globalVar: 'window.adobeDataLayer / _satellite',
    description: 'Intercepts ACDL pushes and _satellite.track() calls',
  },
  {
    id: 'segment',
    label: 'Segment',
    globalVar: 'window.analytics',
    description: 'Intercepts track(), page(), identify(), group() calls',
  },
  {
    id: 'digitalData',
    label: 'W3C',
    globalVar: 'window.digitalData',
    description: 'Wraps with Proxy to detect property mutations',
  },
];
