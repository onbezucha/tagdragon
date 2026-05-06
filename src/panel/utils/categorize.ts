// ─── CATEGORIZATION UTILITIES ────────────────────────────────────────────────
// Functions for categorizing and validating parameters

import type { SpecialRenderer } from '@/types/categories';
import { PROVIDER_CATEGORIES } from '@/shared/categories';

/**
 * Metadata attached to each categorized section
 */
export interface CategoryMeta {
  label: string;
  icon: string;
  order: number;
  defaultExpanded: boolean;
  specialRenderer: SpecialRenderer | null;
  requiredParams: string[] | null;
}

/**
 * Categorized parameters with metadata
 */
export interface CategorizedParams {
  [key: string]: Record<string, string | undefined> & {
    _meta?: CategoryMeta;
  };
}

/**
 * Validation result for a parameter
 */
export interface ParameterValidationResult {
  isValid: boolean;
  warning: string | null;
  icon: string | null;
}

/**
 * Categorize decoded parameters by provider-specific rules.
 */
export function categorizeParams(
  decoded: Record<string, string | undefined>,
  providerName: string,
  showEmptyParams = false
): CategorizedParams {
  const categorized: CategorizedParams = {};
  const providerCats = PROVIDER_CATEGORIES[providerName] || {};

  // 1. Sort categories by order
  const orderedEntries = Object.entries(providerCats).sort(
    ([, a], [, b]) => (a.order || 99) - (b.order || 99)
  );

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

  // 3.5. Filter out undefined/empty values when showEmptyParams is disabled
  if (!showEmptyParams) {
    for (const catKey in categorized) {
      const bucket = categorized[catKey];
      const keysToDelete: string[] = [];
      for (const paramKey in bucket) {
        if (bucket[paramKey] === undefined || bucket[paramKey] === '') {
          keysToDelete.push(paramKey);
        }
      }
      for (const k of keysToDelete) delete bucket[k];
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
        requiredParams: providerCats[key].requiredParams || null,
      };
    } else if (key === '_other') {
      categorized[key]._meta = {
        label: 'Other',
        icon: '📦',
        order: 999,
        defaultExpanded: false,
        specialRenderer: null,
        requiredParams: null,
      };
    }
  }

  return categorized;
}

/**
 * Validate a parameter value.
 */
export function validateValue(
  param: string,
  value: unknown,
  categoryMeta?: CategoryMeta
): ParameterValidationResult {
  const validation: ParameterValidationResult = {
    isValid: true,
    warning: null,
    icon: null,
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

/**
 * Adobe Analytics event object
 */
export interface AdobeEvent {
  id: string;
  type: 'Counter' | 'Numeric' | 'Conversion';
  value: string | null;
}

/**
 * Parse Adobe Analytics events string.
 * @example parseAdobeEvents("event1,event2:5,purchase") → [{id: 'event1', type: 'Counter', value: null}, ...]
 */
export function parseAdobeEvents(eventsString: unknown): AdobeEvent[] | null {
  if (!eventsString || typeof eventsString !== 'string') return null;

  const events = eventsString
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (events.length === 0) return null;

  return events.map((eventStr) => {
    const [id, value] = eventStr.split(':');

    let type: 'Counter' | 'Numeric' | 'Conversion' = 'Counter';
    let displayValue: string | null = null;

    if (value) {
      type = 'Numeric';
      displayValue = value;
    }

    const conversionEvents = [
      'purchase',
      'prodView',
      'scOpen',
      'scAdd',
      'scRemove',
      'scCheckout',
      'scView',
    ];
    if (conversionEvents.includes(id.toLowerCase())) {
      type = 'Conversion';
    }

    return { id, type, value: displayValue };
  });
}

/**
 * Adobe Analytics product object
 */
export interface AdobeProduct {
  category: string;
  sku: string;
  quantity: string;
  price: string;
  events: string;
}

/**
 * Parse Adobe Analytics products string.
 * @example parseAdobeProducts("category;sku;qty;price;events,...")
 */
export function parseAdobeProducts(productsString: unknown): AdobeProduct[] | null {
  if (!productsString || typeof productsString !== 'string') return null;

  const products = productsString
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (products.length === 0) return null;

  return products.map((productStr) => {
    const parts = productStr.split(';');
    return {
      category: parts[0] || '',
      sku: parts[1] || '',
      quantity: parts[2] || '',
      price: parts[3] || '',
      events: parts[4] || '',
    };
  });
}
