// ─── PROVIDER ICON UTILITY ──────────────────────────────────────────────────
// Shared utilities for building and caching provider/group SVG icons.
// Avoids re-parsing the same SVG string for every row in the request list.

import { PROVIDER_ICONS } from './icon-registry';
import { GROUP_ICONS } from './group-icons';
import { getProviderGroup } from '@/shared/provider-groups';

/**
 * Build SVG icon string for a provider.
 * Checks for a direct provider icon first, then falls back to group icon.
 * @param provider - Provider name to look up
 * @returns SVG markup string, or empty string if no icon found
 */
export function buildGroupIcon(provider: string): string {
  if (PROVIDER_ICONS[provider]) return PROVIDER_ICONS[provider];
  const group = getProviderGroup(provider);
  if (!group) return '';
  return GROUP_ICONS[group.id] ?? group.icon;
}

// ─── SVG ICON CACHE ────────────────────────────────────────────────────────
// Cache parsed DocumentFragments for provider/group icons.

const svgIconCache = new Map<string, DocumentFragment>();

/**
 * Get a cached DocumentFragment for the provider icon.
 * Creates and caches the fragment on first call for each provider.
 * @param provider - Provider name
 * @returns Cached DocumentFragment or null if no icon found
 */
export function getCachedIcon(provider: string): DocumentFragment | null {
  const cached = svgIconCache.get(provider);
  if (cached) return cached;

  const iconSvg = buildGroupIcon(provider);
  if (!iconSvg) return null;

  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents';
  wrapper.innerHTML = iconSvg;

  const fragment = document.createDocumentFragment();
  while (wrapper.firstChild) {
    fragment.appendChild(wrapper.firstChild);
  }

  svgIconCache.set(provider, fragment);
  return fragment;
}
