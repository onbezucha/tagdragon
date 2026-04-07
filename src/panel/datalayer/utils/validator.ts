// ─── VALIDATOR ENGINE ──────────────────────────────────────────────────────
// Rule-based validation for DataLayer pushes.

import type { DataLayerPush } from '@/types/datalayer';
import type { ValidationRule, ValidationResult, ValidationCheck } from '@/types/datalayer';
// ─── STORAGE ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rt_dl_validation_rules';

// ─── PRESET RULES ──────────────────────────────────────────────────────────

export const PRESET_RULES: ValidationRule[] = [
  {
    id: 'preset-purchase-txid',
    name: 'Purchase requires transaction_id',
    enabled: false,
    scope: { eventName: 'purchase' },
    checks: [
      { type: 'required_key', key: 'transaction_id', message: 'Missing transaction_id on purchase event' },
      { type: 'required_key', key: 'ecommerce.transaction_id', message: 'Missing ecommerce.transaction_id on purchase event' },
    ],
  },
  {
    id: 'preset-ecommerce-currency',
    name: 'E-commerce requires currency',
    enabled: false,
    scope: { ecommerceType: 'purchase' },
    checks: [
      { type: 'required_key', key: 'ecommerce.currency', message: 'Missing ecommerce.currency' },
    ],
  },
  {
    id: 'preset-pageview-location',
    name: 'Page view requires page_location',
    enabled: false,
    scope: { eventName: 'page_view' },
    checks: [
      { type: 'required_key', key: 'page_location', message: 'Missing page_location on page_view' },
    ],
  },
  {
    id: 'preset-ecommerce-items-array',
    name: 'E-commerce items must be array',
    enabled: false,
    scope: { ecommerceType: 'purchase' },
    checks: [
      { type: 'key_type', key: 'ecommerce.items', valueType: 'array', message: 'ecommerce.items must be an array' },
    ],
  },
  {
    id: 'preset-no-undefined',
    name: 'No undefined values',
    enabled: false,
    scope: {},
    checks: [
      { type: 'custom', message: 'Contains undefined values' },
    ],
  },
];

// ─── VALIDATE ──────────────────────────────────────────────────────────────

/**
 * Validate a DataLayer push against enabled rules.
 * @returns Array of validation errors (empty if all passed).
 */
export function validatePush(
  push: DataLayerPush,
  rules: ValidationRule[],
): ValidationResult[] {
  const errors: ValidationResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!matchesScope(push, rule.scope)) continue;

    for (const check of rule.checks) {
      const result = runCheck(push.data, check);
      if (result) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          checkMessage: result.message,
          failedKey: result.key,
        });
      }
    }
  }

  return errors;
}

// ─── RULE MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Load validation rules from chrome.storage.local.
 * Merges persisted custom rules with preset rules.
 */
export async function loadValidationRules(): Promise<ValidationRule[]> {
  let persisted: Partial<Record<string, ValidationRule>> = {};
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    persisted = (stored[STORAGE_KEY] as typeof persisted) ?? {};
  } catch { /* fallback to defaults */ }

  // Build rules list: presets (with persisted enabled state) + custom rules
  const rules: ValidationRule[] = [];

  for (const preset of PRESET_RULES) {
    const saved = persisted[preset.id];
    if (saved) {
      // Merge persisted enabled state
      rules.push({ ...preset, enabled: saved.enabled ?? preset.enabled });
    } else {
      rules.push({ ...preset });
    }
  }

  // Add custom rules (IDs that don't match any preset)
  for (const [id, rule] of Object.entries(persisted)) {
    if (id.startsWith('custom-') && rule) {
      rules.push(rule);
    }
  }

  return rules;
}

/**
 * Save validation rules to chrome.storage.local.
 */
export async function saveValidationRules(rules: ValidationRule[]): Promise<void> {
  try {
    const toStore: Partial<Record<string, ValidationRule>> = {};
    for (const rule of rules) {
      toStore[rule.id] = rule;
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: toStore });
  } catch {
    console.warn('TagDragon: Validation rules save failed');
  }
}

// ─── INTERNAL ──────────────────────────────────────────────────────────────

function matchesScope(push: DataLayerPush, scope: ValidationRule['scope']): boolean {
  // Source filter
  if (scope.source && push.source !== scope.source) return false;

  // Event name filter
  if (scope.eventName) {
    const pushEvent = push._eventName ?? '';
    const scopeEvents = Array.isArray(scope.eventName) ? scope.eventName : [scope.eventName];
    if (!scopeEvents.some(e => pushEvent === e)) return false;
  }

  // E-commerce type filter
  if (scope.ecommerceType) {
    const ecType = push._ecommerceType;
    if (ecType !== scope.ecommerceType) return false;
  }

  return true;
}

function runCheck(
  data: Record<string, unknown>,
  check: ValidationCheck,
): { message: string; key?: string } | null {
  switch (check.type) {
    case 'required_key': {
      if (!check.key) return null;
      // Check direct key or dot-notation path
      const hasKey = check.key.includes('.')
        ? getNestedValue(data, check.key) !== undefined
        : check.key in data;
      return hasKey ? null : { message: check.message, key: check.key };
    }

    case 'key_type': {
      if (!check.key || !check.valueType) return null;
      const val = check.key.includes('.')
        ? getNestedValue(data, check.key)
        : data[check.key];
      if (val === undefined) return null; // Don't flag missing keys as type error
      const actualType = Array.isArray(val) ? 'array' : typeof val;
      if (actualType !== check.valueType) {
        return { message: check.message, key: check.key };
      }
      return null;
    }

    case 'forbidden_key': {
      if (!check.key) return null;
      const hasKey = check.key.includes('.')
        ? getNestedValue(data, check.key) !== undefined
        : check.key in data;
      return hasKey ? { message: check.message, key: check.key } : null;
    }

    case 'custom': {
      // Scan for undefined values
      if (hasUndefinedValues(data)) {
        return { message: check.message };
      }
      return null;
    }

    default:
      return null;
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function hasUndefinedValues(obj: unknown, depth = 0): boolean {
  if (depth > 5) return false; // Prevent infinite recursion
  if (obj === undefined) return true;
  if (obj === null || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some(v => hasUndefinedValues(v, depth + 1));
  }
  return Object.values(obj as Record<string, unknown>).some(v => hasUndefinedValues(v, depth + 1));
}
