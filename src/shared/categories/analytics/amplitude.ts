import type { ProviderCategories } from '@/types/categories';

export const AMPLITUDE_CATEGORIES: ProviderCategories = {
  hit: {
    label: 'Hit Info',
    icon: '📊',
    order: 1,
    defaultExpanded: true,
    patterns: [/^Event$/, /^Time$/, /^Revenue$/],
  },
  user: {
    label: 'User',
    icon: '👤',
    order: 2,
    defaultExpanded: true,
    patterns: [/^User ID$/, /^Device ID$/, /^Session ID$/],
  },
  eventData: {
    label: 'Event Properties',
    icon: '⚡',
    order: 3,
    defaultExpanded: true,
    patterns: [],
    prefixMatch: ['ep.'],
  },
  userData: {
    label: 'User Properties',
    icon: '🔧',
    order: 4,
    defaultExpanded: true,
    patterns: [],
    prefixMatch: ['up.'],
  },
  device: {
    label: 'Device & Geo',
    icon: '💻',
    order: 5,
    defaultExpanded: false,
    patterns: [
      /^Platform$/,
      /^OS$/,
      /^Device$/,
      /^Country$/,
      /^Region$/,
      /^City$/,
      /^IP$/,
      /^Language$/,
      /^App Version$/,
    ],
  },
  config: {
    label: 'Config',
    icon: '🔑',
    order: 6,
    defaultExpanded: false,
    patterns: [/^API Key$/, /^Groups$/],
  },
};
