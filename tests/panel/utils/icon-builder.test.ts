// @vitest-environment jsdom
// ─── ICON BUILDER TESTS ─────────────────────────────────────────────────────
// Tests for buildGroupIcon and getCachedIcon utilities.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── MOCK SETUP ─────────────────────────────────────────────────────────────

const { mockProviderIcons, mockGroupIcons, mockGetProviderGroup } = vi.hoisted(() => {
  return {
    mockProviderIcons: {} as Record<string, string>,
    mockGroupIcons: {} as Record<string, string>,
    mockGetProviderGroup: vi.fn<() => { id: string; label: string; icon: string } | null>(
      () => null
    ),
  };
});

vi.mock('@/panel/utils/icon-registry', () => ({
  get PROVIDER_ICONS() {
    return mockProviderIcons;
  },
}));

vi.mock('@/panel/utils/group-icons', () => ({
  get GROUP_ICONS() {
    return mockGroupIcons;
  },
}));

vi.mock('@/shared/provider-groups', () => ({
  getProviderGroup: mockGetProviderGroup,
}));

// ─── IMPORTS AFTER MOCKS ────────────────────────────────────────────────────

import { buildGroupIcon, getCachedIcon } from '@/panel/utils/icon-builder';

// Helper to clear mock data while preserving the object reference
function clearMockData(): void {
  Object.keys(mockProviderIcons).forEach((key) => delete mockProviderIcons[key]);
  Object.keys(mockGroupIcons).forEach((key) => delete mockGroupIcons[key]);
}

describe('icon-builder', () => {
  beforeEach(() => {
    // Clear mocks and cache before each test
    mockGetProviderGroup.mockClear();
    clearMockData();
    // Reset the module state to clear svgIconCache
    vi.resetModules();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // buildGroupIcon tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildGroupIcon', () => {
    it('returns direct provider icon when available', () => {
      const svgIcon = '<svg>...</svg>';
      mockProviderIcons['KnownProvider'] = svgIcon;

      const result = buildGroupIcon('KnownProvider');

      expect(result).toBe(svgIcon);
      expect(mockGetProviderGroup).not.toHaveBeenCalled();
    });

    it('falls back to group icon when no direct icon', () => {
      const groupIcon = '<svg>group-icon</svg>';
      mockGetProviderGroup.mockReturnValue({
        id: 'google',
        label: 'Google',
        icon: '<svg>group-icon</svg>',
      });
      mockGroupIcons['google'] = groupIcon;

      const result = buildGroupIcon('UnknownProvider');

      expect(result).toBe(groupIcon);
      expect(mockGetProviderGroup).toHaveBeenCalledWith('UnknownProvider');
    });

    it('returns empty string for unknown provider with no group', () => {
      mockGetProviderGroup.mockReturnValue(null);

      const result = buildGroupIcon('TotallyUnknownProvider');

      expect(result).toBe('');
      expect(mockGetProviderGroup).toHaveBeenCalledWith('TotallyUnknownProvider');
    });

    it('returns group icon via getProviderGroup lookup', () => {
      const groupIcon = '<svg>google-icon</svg>';
      mockGetProviderGroup.mockReturnValue({
        id: 'google',
        label: 'Google',
        icon: '<svg>fallback-group</svg>',
      });
      mockGroupIcons['google'] = groupIcon;

      const result = buildGroupIcon('GoogleAnalytics');

      expect(result).toBe(groupIcon);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getCachedIcon tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCachedIcon', () => {
    it('returns DocumentFragment with SVG for known provider', () => {
      const svgIcon = '<svg class="provider-icon"><rect/></svg>';
      mockProviderIcons['TestProvider'] = svgIcon;

      const result = getCachedIcon('TestProvider');

      expect(result).toBeInstanceOf(DocumentFragment);
      expect(result?.childNodes.length).toBeGreaterThan(0);
      expect(result?.firstChild?.nodeName.toLowerCase()).toBe('svg');
    });

    it('returns null for unknown provider', () => {
      mockGetProviderGroup.mockReturnValue(null);

      const result = getCachedIcon('UnknownProvider');

      expect(result).toBeNull();
    });

    it('caches and returns same fragment on subsequent calls', () => {
      const svgIcon = '<svg class="cached-icon"><circle/></svg>';
      mockProviderIcons['CachedProvider'] = svgIcon;

      const firstResult = getCachedIcon('CachedProvider');
      const secondResult = getCachedIcon('CachedProvider');

      expect(firstResult).toBe(secondResult);
      expect(firstResult?.childNodes.length).toBe(1);
    });
  });
});