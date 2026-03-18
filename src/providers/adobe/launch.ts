import type { Provider } from '../../types/provider';

export const adobeLaunch: Provider = {
  name: 'Adobe Launch',
  color: '#EB1000',
  // Patterns:
  //   assets.adobedtm.com/…/launch-EN[hash].min.js  — Adobe Tags (successor to Launch)
  //   assets.adobedtm.com/…/launch-[hash].min.js    — older Launch
  //   assets.adobedtm.com/[hash]/[hash]/launch-…    — new URL structure with org ID
  //   /satellite-[hash].js                           — DTM (older generation)
  pattern: /assets\.adobedtm\.com|\/launch-EN[a-f0-9]+|\/satellite-[a-f0-9]+/,

  parseParams(url: string): Record<string, string | undefined> {
    // Launch/Tags does not carry tracking data — it's about loading the tag manager library
    // Parse metadata about environment and version from URL
    const envMatch = url.match(/launch-EN([a-f0-9]+)(?:-(development|staging))?\.min\.js/);
    const legacyMatch = url.match(/launch-([a-f0-9]+)(?:-(development|staging))?\.min\.js/);
    const orgMatch = url.match(/assets\.adobedtm\.com\/([a-f0-9]+)\/([a-f0-9]+)\//);
    const satelliteMatch = url.match(/satellite-([a-f0-9]+)\.js/);

    const envId = envMatch?.[1] || legacyMatch?.[1];
    const environment = envMatch?.[2] || legacyMatch?.[2] || 'production';
    const isNew = !!envMatch; // launch-EN = new Adobe Tags format
    const isDTM = !!satelliteMatch;

    return {
      'Type': isDTM ? 'DTM (legacy)' : isNew ? 'Adobe Tags (Launch)' : 'Launch (legacy)',
      'Environment': environment.charAt(0).toUpperCase() + environment.slice(1),
      'Library ID': envId || satelliteMatch?.[1],
      'Org ID (partial)': orgMatch?.[1],
      'Property hash': orgMatch?.[2],
      'URL': url,
    };
  },
};
