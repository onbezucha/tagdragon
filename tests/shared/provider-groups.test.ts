import { describe, it, expect } from 'vitest';

import { PROVIDER_GROUPS, getProviderGroup, UNGROUPED_ID, UNGROUPED_LABEL } from '@/shared/provider-groups';
import { PROVIDERS } from '@/providers/index';

describe('PROVIDER_GROUPS', () => {
  it('every group has unique id', () => {
    const ids = PROVIDER_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every group has non-empty label', () => {
    for (const g of PROVIDER_GROUPS) {
      expect(g.label.length).toBeGreaterThan(0);
    }
  });

  it('every group has non-empty icon', () => {
    for (const g of PROVIDER_GROUPS) {
      expect(g.icon.length).toBeGreaterThan(0);
    }
  });

  it('every group has at least one provider', () => {
    for (const g of PROVIDER_GROUPS) {
      expect(g.providers.length).toBeGreaterThan(0);
    }
  });

  it('no provider appears in multiple groups', () => {
    const allProviders = PROVIDER_GROUPS.flatMap((g) => g.providers);
    const uniqueProviders = new Set(allProviders);
    expect(uniqueProviders.size).toBe(allProviders.length);
  });

  it('getProviderGroup returns correct group for known provider', () => {
    const group = getProviderGroup('GA4');
    expect(group?.id).toBe('analytics');
  });

  it('getProviderGroup returns undefined for unknown provider', () => {
    const group = getProviderGroup('NonExistent');
    expect(group).toBeUndefined();
  });

  it('UNGROUPED_ID is other', () => {
    expect(UNGROUPED_ID).toBe('other');
  });

  it('UNGROUPED_LABEL is Other', () => {
    expect(UNGROUPED_LABEL).toBe('Other');
  });

  it('all PROVIDERS names from registry exist in some group', () => {
    const groupedProviderNames = new Set(PROVIDER_GROUPS.flatMap((g) => g.providers));
    const missingProviders = PROVIDERS.filter((p) => !groupedProviderNames.has(p.name));
    expect(missingProviders).toHaveLength(0);
  });

  it('getProviderGroup returns correct group for both Clarity providers', () => {
    const clarityGroup = getProviderGroup('Microsoft Clarity');
    expect(clarityGroup?.id).toBe('replay');

    const clarityTagGroup = getProviderGroup('Microsoft Clarity Tag');
    expect(clarityTagGroup?.id).toBe('replay');
  });
});