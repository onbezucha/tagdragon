import type { Provider } from '@/types/provider';

// ═══════════════════════════════════════════════════════════════════════════
// MICROSOFT CLARITY — LIBRARY LOAD PROVIDER
// ═══════════════════════════════════════════════════════════════════════════
// Matches clarity.ms/tag/<project_id> — the initial script load in <head>.
// This fires once per page load and confirms Clarity is installed.

export const microsoftClarityTag: Provider = {
  name: 'Microsoft Clarity Tag',
  color: '#00BCF2',
  pattern: /clarity\.ms\/tag\//,

  parseParams(url: string): Record<string, string | undefined> {
    const match = url.match(/clarity\.ms\/tag\/([^/?]+)/);
    return {
      'Project ID': match ? match[1] : undefined,
      'Request Type': 'Library Load',
      _eventName: 'Library Load',
    };
  },
} as const;
