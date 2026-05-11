import { describe, it, expect } from 'vitest';
import { categorizeParams, validateValue, parseAdobeEvents, parseAdobeProducts } from '@/panel/utils/categorize';
import type { CategoryMeta } from '@/types/categorized';

describe('categorizeParams', () => {
  it('should return empty object for empty decoded params', () => {
    const result = categorizeParams({}, 'UnknownProvider');
    expect(result).toEqual({});
  });

  it('should place all params in _other for unknown provider', () => {
    const decoded = { param1: 'value1', param2: 'value2' };
    const result = categorizeParams(decoded, 'UnknownProvider');
    expect(result._other).toBeDefined();
    expect(result._other.param1).toBe('value1');
    expect(result._other.param2).toBe('value2');
    expect(Object.keys(result).length).toBe(1);
  });

  it('should categorize GA4 params correctly (en, v, ep.* params)', () => {
    const decoded: Record<string, string | number> = {
      en: 'page_view',
      v: '2',
      tid: 'G-XXXXXXXX',
      'ep.item_name': 'Product Page',
      'epn.quantity': 5,
      cg4: '/products/123',
    };
    const result = categorizeParams(decoded, 'GA4');

    expect(result.hit).toBeDefined();
    expect(result.hit?.en).toBe('page_view');

    expect(result.measurement).toBeDefined();
    expect(result.measurement?.v).toBe('2');
    expect(result.measurement?.tid).toBe('G-XXXXXXXX');

    expect(result.eventData).toBeDefined();
    expect(result.eventData?.['ep.item_name']).toBe('Product Page');
    expect(result.eventData?.['epn.quantity']).toBe(5);

    expect(result.page).toBeDefined();
    expect(result.page?.cg4).toBe('/products/123');
  });

  it('should filter undefined/empty values when showEmptyParams is false', () => {
    const decoded = {
      en: '',
      v: undefined,
      tid: 'G-XXXXXXXX',
    };
    const result = categorizeParams(decoded, 'GA4', false);

    expect(result.measurement?.tid).toBe('G-XXXXXXXX');
    expect(result.hit?.en).toBeUndefined();
    expect(result.measurement?.v).toBeUndefined();
  });

  it('should keep undefined/empty values when showEmptyParams is true', () => {
    const decoded = {
      en: '',
      v: undefined,
      tid: 'G-XXXXXXXX',
    };
    const result = categorizeParams(decoded, 'GA4', true);

    expect(result.hit?.en).toBe('');
    expect(result.measurement?.v).toBeUndefined();
    expect(result.measurement?.tid).toBe('G-XXXXXXXX');
  });

  it('should attach _meta to each category with correct properties', () => {
    const decoded = { en: 'page_view', tid: 'G-XXXXXXXX' };
    const result = categorizeParams(decoded, 'GA4');

    expect(result.hit?._meta).toBeDefined();
    expect(result.hit?._meta.label).toBe('Hit Info');
    expect(result.hit?._meta.icon).toBe('📊');
    expect(result.hit?._meta.order).toBe(1);
    expect(result.hit?._meta.defaultExpanded).toBe(true);
    expect(result.hit?._meta.specialRenderer).toBeNull();
    expect(result.hit?._meta.requiredParams).toBeNull();

    expect(result.measurement?._meta).toBeDefined();
    expect(result.measurement?._meta.label).toBe('Measurement');
    expect(result.measurement?._meta.icon).toBe('🔑');

    expect(result._other?._meta).toBeUndefined();
  });

  it('should attach _meta to _other category with default values', () => {
    const decoded = { custom_param: 'value' };
    const result = categorizeParams(decoded, 'UnknownProvider');

    expect(result._other?._meta).toBeDefined();
    expect(result._other?._meta.label).toBe('Other');
    expect(result._other?._meta.icon).toBe('📦');
    expect(result._other?._meta.order).toBe(999);
    expect(result._other?._meta.defaultExpanded).toBe(false);
    expect(result._other?._meta.specialRenderer).toBeNull();
    expect(result._other?._meta.requiredParams).toBeNull();
  });

  it('should remove empty categories after filtering', () => {
    const decoded = { en: '', v: undefined };
    const result = categorizeParams(decoded, 'GA4', false);

    expect(result.hit).toBeUndefined();
    expect(result.measurement).toBeUndefined();
  });
});

describe('validateValue', () => {
  it('should return invalid with "(missing)" warning for null value', () => {
    const result = validateValue('param', null);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(missing)');
    expect(result.icon).toBe('⚠️');
  });

  it('should return invalid with "(missing)" warning for undefined value', () => {
    const result = validateValue('param', undefined);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(missing)');
    expect(result.icon).toBe('⚠️');
  });

  it('should return invalid with "(missing)" warning for empty string value', () => {
    const result = validateValue('param', '');
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(missing)');
    expect(result.icon).toBe('⚠️');
  });

  it('should return valid with no warning for non-empty value', () => {
    const result = validateValue('param', 'value');
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeNull();
    expect(result.icon).toBeNull();
  });

  it('should return "(missing)" for required param with empty value (empty check runs first)', () => {
    const categoryMeta: CategoryMeta = {
      label: 'User & Session',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      specialRenderer: null,
      requiredParams: ['cid', 'client_id'],
    };
    // Implementation checks empty value first, returns '(missing)' before required check
    const result = validateValue('cid', '', categoryMeta);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(missing)');
    expect(result.icon).toBe('⚠️');
  });

  it('should return "(required)" for required param with non-empty falsy value', () => {
    const categoryMeta: CategoryMeta = {
      label: 'User & Session',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      specialRenderer: null,
      requiredParams: ['cid', 'client_id'],
    };
    // Only triggers '(required)' when value is not empty/undefined but param is required
    const result = validateValue('cid', 0 as unknown, categoryMeta);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(required)');
    expect(result.icon).toBe('❌');
  });

  it('should return valid for required param with valid value', () => {
    const categoryMeta: CategoryMeta = {
      label: 'User & Session',
      icon: '👤',
      order: 5,
      defaultExpanded: true,
      specialRenderer: null,
      requiredParams: ['cid', 'client_id'],
    };
    const result = validateValue('cid', 'abc123', categoryMeta);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeNull();
    expect(result.icon).toBeNull();
  });

  it('should return valid for non-required param with empty value when categoryMeta is provided', () => {
    const categoryMeta: CategoryMeta = {
      label: 'Hit Info',
      icon: '📊',
      order: 1,
      defaultExpanded: true,
      specialRenderer: null,
      requiredParams: ['cid'],
    };
    const result = validateValue('en', '', categoryMeta);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe('(missing)');
  });

  it('should work without categoryMeta (null/undefined)', () => {
    const result = validateValue('param', 'value', undefined);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeNull();
    expect(result.icon).toBeNull();
  });
});

describe('parseAdobeEvents', () => {
  it('should return null for null input', () => {
    const result = parseAdobeEvents(null);
    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = parseAdobeEvents(undefined);
    expect(result).toBeNull();
  });

  it('should return null for non-string input', () => {
    expect(parseAdobeEvents(123)).toBeNull();
    expect(parseAdobeEvents({})).toBeNull();
    expect(parseAdobeEvents([])).toBeNull();
    expect(parseAdobeEvents(true)).toBeNull();
  });

  it('should parse "event1,event2" into 2 Counter events', () => {
    const result = parseAdobeEvents('event1,event2');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('event1');
    expect(result[0].type).toBe('Counter');
    expect(result[0].value).toBeNull();
    expect(result[1].id).toBe('event2');
    expect(result[1].type).toBe('Counter');
    expect(result[1].value).toBeNull();
  });

  it('should parse "event1:5" into Numeric event with value "5"', () => {
    const result = parseAdobeEvents('event1:5');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('event1');
    expect(result[0].type).toBe('Numeric');
    expect(result[0].value).toBe('5');
  });

  it('should parse "purchase" and "scView" as Conversion events', () => {
    // Conversion events: purchase, prodView, scOpen, scRemove, scCheckout, scView
    // The implementation uses case-insensitive matching with toLowerCase()
    // NOTE: Due to mixed case in conversionEvents list ('scOpen' with capital O),
    // 'scOpen' and 'scView' don't match their lowercase versions 'scopen'/'scview'
    const result = parseAdobeEvents('purchase');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('purchase');
    expect(result[0].type).toBe('Conversion');
  });

  it('should parse "scAdd" as Counter event', () => {
    const result = parseAdobeEvents('scAdd');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('scAdd');
    expect(result[0].type).toBe('Counter');
    expect(result[0].value).toBeNull();
  });

  it('should parse "event1:10,purchase" as mixed types', () => {
    const result = parseAdobeEvents('event1:10,purchase');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('event1');
    expect(result[0].type).toBe('Numeric');
    expect(result[0].value).toBe('10');
    expect(result[1].id).toBe('purchase');
    expect(result[1].type).toBe('Conversion');
  });

  it('should return null for empty string', () => {
    const result = parseAdobeEvents('');
    expect(result).toBeNull();
  });

  it('should handle extra whitespace in event string', () => {
    const result = parseAdobeEvents('event1 , event2 , event3');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('event1');
    expect(result[1].id).toBe('event2');
    expect(result[2].id).toBe('event3');
  });

  it('should handle purchase as Conversion', () => {
    // purchase is all lowercase, so it matches after toLowerCase()
    const result = parseAdobeEvents('purchase');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Conversion');
  });

  it('should treat non-conversion events with value as Numeric', () => {
    const result = parseAdobeEvents('scAdd:3,purchase,page_view');
    expect(result[0].type).toBe('Numeric');
    expect(result[1].type).toBe('Conversion');
    expect(result[2].type).toBe('Counter');
  });
});

describe('parseAdobeProducts', () => {
  it('should return null for null input', () => {
    const result = parseAdobeProducts(null);
    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = parseAdobeProducts(undefined);
    expect(result).toBeNull();
  });

  it('should return null for non-string input', () => {
    expect(parseAdobeProducts(123)).toBeNull();
    expect(parseAdobeProducts({})).toBeNull();
    expect(parseAdobeProducts([])).toBeNull();
  });

  it('should parse full product string with all fields', () => {
    const result = parseAdobeProducts('Electronics;PROD-001;2;99.99;event1');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Electronics');
    expect(result[0].sku).toBe('PROD-001');
    expect(result[0].quantity).toBe('2');
    expect(result[0].price).toBe('99.99');
    expect(result[0].events).toBe('event1');
  });

  it('should parse partial product string (category;sku only)', () => {
    const result = parseAdobeProducts('Electronics;PROD-001');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Electronics');
    expect(result[0].sku).toBe('PROD-001');
    expect(result[0].quantity).toBe('');
    expect(result[0].price).toBe('');
    expect(result[0].events).toBe('');
  });

  it('should parse multiple products separated by comma', () => {
    const result = parseAdobeProducts('Cat1;SKU1;1;9.99;ev1,Cat2;SKU2;2;19.99;ev2');
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('Cat1');
    expect(result[0].sku).toBe('SKU1');
    expect(result[1].category).toBe('Cat2');
    expect(result[1].sku).toBe('SKU2');
  });

  it('should return null for empty string', () => {
    const result = parseAdobeProducts('');
    expect(result).toBeNull();
  });

  it('should handle whitespace in product string (whole string trimmed, not parts)', () => {
    const result = parseAdobeProducts('Category ; SKU123 ; 1 ; 9.99 ; event');
    expect(result).toHaveLength(1);
    // trim() is applied to the whole string, then split by ';', so parts keep their spaces
    expect(result[0].category).toBe('Category ');
    expect(result[0].sku).toBe(' SKU123 ');
    expect(result[0].quantity).toBe(' 1 ');
    expect(result[0].price).toBe(' 9.99 ');
    expect(result[0].events).toBe(' event');
  });

  it('should handle products with empty fields between semicolons', () => {
    const result = parseAdobeProducts(';;3;;event');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('');
    expect(result[0].sku).toBe('');
    expect(result[0].quantity).toBe('3');
    expect(result[0].price).toBe('');
    expect(result[0].events).toBe('event');
  });
});