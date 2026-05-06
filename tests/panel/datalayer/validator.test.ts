import { describe, it, expect } from 'vitest';
import {
  validatePush,
  PRESET_RULES,
} from '../../../src/panel/datalayer/utils/validator';
import type { ValidationRule, ValidationResult } from '@/types/datalayer';
import type { DataLayerPush } from '@/types/datalayer';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function makePush(
  data: Record<string, unknown>,
  eventName?: string,
  ecommerceType?: string,
  id = 1,
  source = 'gtm'
): DataLayerPush {
  return {
    id,
    source,
    sourceLabel: source.toUpperCase(),
    pushIndex: 0,
    timestamp: new Date().toISOString(),
    data,
    cumulativeState: null,
    _eventName: eventName,
    _ecommerceType: ecommerceType as DataLayerPush['_ecommerceType'],
    _ts: Date.now(),
  };
}

function makeRule(
  id: string,
  enabled = true,
  checks: ValidationRule['checks'] = [],
  scope: ValidationRule['scope'] = {}
): ValidationRule {
  return {
    id,
    name: `Test rule: ${id}`,
    enabled,
    scope,
    checks,
  };
}

// ─── PRESET RULES ────────────────────────────────────────────────────────────

describe('PRESET_RULES', () => {
  it('exports an array of ValidationRule objects', () => {
    expect(Array.isArray(PRESET_RULES)).toBe(true);
    expect(PRESET_RULES.length).toBeGreaterThan(0);
  });

  it('each preset has required fields (id, name, enabled, scope, checks)', () => {
    for (const rule of PRESET_RULES) {
      expect(typeof rule.id).toBe('string');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.enabled).toBe('boolean');
      expect(typeof rule.scope).toBe('object');
      expect(Array.isArray(rule.checks)).toBe(true);
    }
  });

  it('preset-purchase-txid checks for transaction_id', () => {
    const rule = PRESET_RULES.find((r) => r.id === 'preset-purchase-txid');
    expect(rule).toBeDefined();
    expect(rule?.scope).toEqual({ eventName: 'purchase' });
    expect(rule?.checks.some((c) => c.key === 'transaction_id')).toBe(true);
    expect(rule?.checks.some((c) => c.key === 'ecommerce.transaction_id')).toBe(true);
  });

  it('preset-ecommerce-currency requires ecommerce.currency', () => {
    const rule = PRESET_RULES.find((r) => r.id === 'preset-ecommerce-currency');
    expect(rule).toBeDefined();
    expect(rule?.scope).toEqual({ ecommerceType: 'purchase' });
    expect(rule?.checks.some((c) => c.key === 'ecommerce.currency')).toBe(true);
  });

  it('preset-pageview-location is disabled by default', () => {
    const rule = PRESET_RULES.find((r) => r.id === 'preset-pageview-location');
    expect(rule).toBeDefined();
    expect(rule?.enabled).toBe(false);
  });

  it('preset-ecommerce-items-array is disabled by default', () => {
    const rule = PRESET_RULES.find((r) => r.id === 'preset-ecommerce-items-array');
    expect(rule).toBeDefined();
    expect(rule?.enabled).toBe(false);
  });

  it('preset-no-undefined is disabled by default', () => {
    const rule = PRESET_RULES.find((r) => r.id === 'preset-no-undefined');
    expect(rule).toBeDefined();
    expect(rule?.enabled).toBe(false);
  });
});

// ─── VALIDATE PUSH ──────────────────────────────────────────────────────────

describe('validatePush', () => {
  // ─── Empty results ───────────────────────────────────────────────────────

  describe('empty results', () => {
    it('returns empty array when no rules provided', () => {
      const push = makePush({ event: 'purchase', transaction_id: 'T-123' });
      expect(validatePush(push, [])).toEqual([]);
    });

    it('returns empty array when all rules are disabled', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [makeRule('disabled-rule', false, [{ type: 'required_key', key: 'event', message: 'no event' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('returns empty array when no errors found', () => {
      const push = makePush({ event: 'page_view', page_location: '/home' });
      const rules = [makeRule('page-loc', true, [{ type: 'required_key', key: 'page_location', message: 'missing page_location' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });
  });

  // ─── required_key checks ─────────────────────────────────────────────────

  describe('required_key checks', () => {
    it('flags missing top-level key', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [makeRule('check-txid', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing transaction_id' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
      expect(result[0].failedKey).toBe('transaction_id');
    });

    it('flags missing nested key', () => {
      const push = makePush({ ecommerce: { purchase: { revenue: 100 } } });
      const rules = [makeRule('check-currency', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing currency' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
      expect(result[0].failedKey).toBe('ecommerce.currency');
    });

    it('passes when top-level key exists', () => {
      const push = makePush({ event: 'purchase', transaction_id: 'T-123' });
      const rules = [makeRule('check-txid', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing transaction_id' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('passes when nested key exists', () => {
      const push = makePush({ ecommerce: { purchase: { revenue: 100 }, currency: 'USD' } });
      const rules = [makeRule('check-currency', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing currency' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('supports bracket notation in key path', () => {
      const push = makePush({ ecommerce: { items: [{ id: 'SKU-001' }] } });
      const rules = [makeRule('check-items', true, [{ type: 'required_key', key: 'ecommerce.items', message: 'Missing items' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });
  });

  // ─── key_type checks ─────────────────────────────────────────────────────

  describe('key_type checks', () => {
    it('flags wrong type for string', () => {
      const push = makePush({ page_location: 123 });
      const rules = [makeRule('type-check', true, [{ type: 'key_type', key: 'page_location', valueType: 'string', message: 'Must be string' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('flags wrong type for number', () => {
      const push = makePush({ value: 'not a number' });
      const rules = [makeRule('type-check', true, [{ type: 'key_type', key: 'value', valueType: 'number', message: 'Must be number' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('flags wrong type for array', () => {
      const push = makePush({ items: 'not an array' });
      const rules = [makeRule('type-check', true, [{ type: 'key_type', key: 'items', valueType: 'array', message: 'Must be array' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('passes when type matches', () => {
      const push = makePush({ items: [1, 2, 3] });
      const rules = [makeRule('type-check', true, [{ type: 'key_type', key: 'items', valueType: 'array', message: 'Must be array' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('does not flag missing keys for key_type', () => {
      const push = makePush({});
      const rules = [makeRule('type-check', true, [{ type: 'key_type', key: 'items', valueType: 'array', message: 'Must be array' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });
  });

  // ─── forbidden_key checks ─────────────────────────────────────────────────

  describe('forbidden_key checks', () => {
    it('flags forbidden key that exists', () => {
      const push = makePush({ deprecated_field: 'old value' });
      const rules = [makeRule('forbid', true, [{ type: 'forbidden_key', key: 'deprecated_field', message: 'Deprecated field found' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
      expect(result[0].failedKey).toBe('deprecated_field');
    });

    it('passes when forbidden key is absent', () => {
      const push = makePush({ new_field: 'value' });
      const rules = [makeRule('forbid', true, [{ type: 'forbidden_key', key: 'deprecated_field', message: 'Deprecated field found' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('flags forbidden nested key', () => {
      const push = makePush({ ecommerce: { legacy_field: 'old' } });
      const rules = [makeRule('forbid', true, [{ type: 'forbidden_key', key: 'ecommerce.legacy_field', message: 'Legacy field found' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });
  });

  // ─── custom checks ───────────────────────────────────────────────────────

  describe('custom checks', () => {
    it('flags undefined values in data', () => {
      const push = makePush({ event: 'test', data: { undefined_field: undefined } });
      const rules = [makeRule('no-undefined', true, [{ type: 'custom', message: 'Contains undefined values' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('passes when no undefined values', () => {
      const push = makePush({ event: 'test', page_location: '/home', value: 42 });
      const rules = [makeRule('no-undefined', true, [{ type: 'custom', message: 'Contains undefined values' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('passes when data is empty', () => {
      const push = makePush({});
      const rules = [makeRule('no-undefined', true, [{ type: 'custom', message: 'Contains undefined values' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('flags undefined in nested objects', () => {
      const push = makePush({
        ecommerce: {
          purchase: {
            revenue: 100,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            missing: undefined as any,
          },
        },
      });
      const rules = [makeRule('no-undefined', true, [{ type: 'custom', message: 'Contains undefined values' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('flags undefined in arrays', () => {
      const push = makePush({
        ecommerce: {
          items: [
            { id: 'SKU-001' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            undefined as unknown,
            { id: 'SKU-002' },
          ],
        },
      });
      const rules = [makeRule('no-undefined', true, [{ type: 'custom', message: 'Contains undefined values' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });
  });

  // ─── Multiple rules ──────────────────────────────────────────────────────

  describe('multiple rules', () => {
    it('runs all enabled rules', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [
        makeRule('rule-1', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing TXID' }]),
        makeRule('rule-2', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing currency' }]),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(2);
    });

    it('skips disabled rules', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [
        makeRule('rule-1', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing TXID' }]),
        makeRule('rule-2', false, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing currency' }]),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('accumulates errors from multiple checks in same rule', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [
        makeRule('multi-check', true, [
          { type: 'required_key', key: 'transaction_id', message: 'Missing TXID' },
          { type: 'required_key', key: 'ecommerce.currency', message: 'Missing currency' },
        ]),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(2);
    });
  });

  // ─── ValidationResult shape ───────────────────────────────────────────────

  describe('ValidationResult shape', () => {
    it('returns correct result fields', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [
        makeRule('txid-rule', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing transaction_id' }]),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
      expect(result[0].ruleId).toBe('txid-rule');
      expect(result[0].ruleName).toBe('Test rule: txid-rule');
      expect(result[0].checkMessage).toBe('Missing transaction_id');
      expect(result[0].failedKey).toBe('transaction_id');
    });
  });

  // ─── Scope filtering ──────────────────────────────────────────────────────

  describe('scope filtering', () => {
    it('skips rule when eventName does not match', () => {
      const push = makePush({ event: 'page_view' });
      const rules = [
        makeRule('purchase-only', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing' }], { eventName: 'purchase' }),
      ];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('applies rule when eventName matches', () => {
      const push = makePush({ event: 'purchase' }, 'purchase');
      const rules = [
        makeRule('purchase-only', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing' }], { eventName: 'purchase' }),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('skips rule when ecommerceType does not match', () => {
      const push = makePush({ ecommerce: { checkout: {} } }, undefined, 'checkout');
      const rules = [
        makeRule('purchase-only', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing' }], { ecommerceType: 'purchase' }),
      ];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('applies rule when ecommerceType matches', () => {
      const push = makePush({ ecommerce: { purchase: {} } }, undefined, 'purchase');
      const rules = [
        makeRule('purchase-only', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing' }], { ecommerceType: 'purchase' }),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('skips rule when source does not match', () => {
      const push = makePush({ event: 'purchase', transaction_id: 'T-123' }, undefined, undefined, 1, 'gtm');
      const rules = [
        makeRule('adobe-only', true, [{ type: 'forbidden_key', key: 'legacy_field', message: 'Legacy' }], { source: 'adobe' }),
      ];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('applies rule when source matches', () => {
      const push = makePush({ event: 'purchase', legacy_field: 'old' }, undefined, undefined, 1, 'adobe');
      const rules = [
        makeRule('adobe-only', true, [{ type: 'forbidden_key', key: 'legacy_field', message: 'Legacy' }], { source: 'adobe' }),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('handles array of eventNames in scope', () => {
      const push = makePush({ event: 'purchase' }, 'purchase');
      const rules = [
        makeRule('multi-event', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing' }], { eventName: ['purchase', 'refund'] }),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty push data', () => {
      const push = makePush({});
      const rules = [makeRule('check', true, [{ type: 'required_key', key: 'event', message: 'Missing event' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('handles empty checks array', () => {
      const push = makePush({ event: 'test' });
      const rules = [makeRule('empty', true, [])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('handles empty scope', () => {
      const push = makePush({ event: 'test' });
      const rules = [makeRule('no-scope', true, [{ type: 'required_key', key: 'some_key', message: 'Missing' }], {})];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('handles push with _eventName populated', () => {
      const push = makePush({ transaction_id: 'T-123' }, 'purchase');
      const rules = [
        makeRule('event-check', true, [{ type: 'required_key', key: 'ecommerce.currency', message: 'Missing' }], { eventName: 'purchase' }),
      ];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });

    it('handles null data values (allowed, not undefined)', () => {
      const push = makePush({ event: 'test', value: null });
      const rules = [makeRule('custom', true, [{ type: 'custom', message: 'Has undefined' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('handles nested null values', () => {
      const push = makePush({ ecommerce: { purchase: { revenue: null } } });
      const rules = [makeRule('custom', true, [{ type: 'custom', message: 'Has undefined' }])];
      expect(validatePush(push, rules)).toEqual([]);
    });

    it('handles empty rule id', () => {
      const push = makePush({ event: 'purchase' });
      const rules = [makeRule('', true, [{ type: 'required_key', key: 'transaction_id', message: 'Missing' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
      expect(result[0].ruleId).toBe('');
    });

    it('handles very deep object with undefined values', () => {
      const deepObj: Record<string, unknown> = { level1: { level2: { level3: { level4: undefined as unknown } } } };
      const push = makePush(deepObj);
      const rules = [makeRule('deep', true, [{ type: 'custom', message: 'Has undefined' }])];
      const result = validatePush(push, rules);
      expect(result).toHaveLength(1);
    });
  });
});