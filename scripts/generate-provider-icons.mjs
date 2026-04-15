#!/usr/bin/env node
/**
 * Generate provider-icons.ts from PNG files in assets/icons_providers/
 * 
 * Usage: node scripts/generate-provider-icons.mjs
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'assets', 'icons_providers');
const OUTPUT_FILE = join(ROOT, 'src', 'panel', 'utils', 'icon-registry.ts');

// PNG filename → provider name(s) mapping
const PNG_TO_PROVIDERS = {
  'ADFORM16x16.png': ['Adform'],
  'ADOBEANALYTICS16x16.png': ['Adobe Client-Side', 'GA (UA)', 'GA4'],
  'ADOBEAUDIENCEMANAGER16x16.png': ['Adobe AAM'],
  'ADOBEDYNAMICTAGMANAGER16x16.png': ['Adobe DTM'],
  'ADOBEHEARTBEAT16x16.png': ['Adobe Heartbeat'],
  'ADOBELAUNCH16x16.png': ['Adobe Launch (CN)'],
  'ADOBETARGET16x16.png': ['Adobe Target'],
  'ADOBEWEBSDK16x16.png': ['Adobe Server-Side'],
  'AMAZONADTAG16x16.png': ['Amazon Ads'],
  'AMPLITUDE16x16.png': ['Amplitude'],
  'ATINTERNET16x16.png': ['AT Internet'],
  'BINGADS16x16.png': ['Bing Ads'],
  'BRAZE16x16.png': ['Braze'],
  'BREVO16x16.png': ['Brevo'],
  'COMSCORE16x16.png': ['Comscore', 'Scorecard'],
  'CRAZYEGG16x16.png': ['Crazy Egg'],
  'CRITEOONETAG16x16.png': ['Criteo'],
  'DEMANDBASEENGAGEMENT16x16.png': ['Demandbase'],
  'DOUBLECLICK16x16.png': ['DoubleClick'],
  'DYNAMICYIELD16x16.png': ['Dynamic Yield'],
  'ENSIGHTEN16x16.png': ['Ensighten'],
  'FACEBOOK16x16.png': ['Meta Pixel'],
  'FULLSTORY16x16.png': ['FullStory'],
  'GLASSBOX16x16.png': ['Glassbox'],
  'GOOGLEADS16x16.png': ['Google Ads'],
  'GOOGLEANALYTICS16x16.png': ['GA4', 'GA (UA)'], // Note: Different from ADOBEANALYTICS
  'GOOGLETAGMANAGER16x16.png': ['GTM'],
  'HOTJAR16x16.png': ['Hotjar'],
  'HUBSPOT16x16.png': ['HubSpot'],
  'INVOCA16x16.png': ['Invoca'],
  'LINKEDINPIXEL16x16.png': ['LinkedIn'],
  'LYTICS16x16.png': ['Lytics'],
  'MATOMO16x16.png': ['Matomo'],
  'MEDALLIADXA16x16.png': ['Medallia DXA'],
  'MERKLEMERKURY16x16.png': ['Merkury'],
  'MIXPANEL16x16.png': ['Mixpanel'],
  'MPARTICLE16x16.png': ['mParticle'],
  'MSCLARITY16x16.png': ['Microsoft Clarity'],
  'OMNICONVERT16x16.png': ['Omniconvert'],
  'OPTIMIZELY16x16.png': ['Optimizely'],
  'OUTBRAIN16x16.png': ['Outbrain'],
  'PARSELY16x16.png': ['Parse.ly'],
  'PINTEREST16x16.png': ['Pinterest Pixel'],
  'PIWIKPRO16x16.png': ['Piwik PRO', 'Piwik PRO TM'],
  'REDDITPIXEL16x16.png': ['Reddit Pixel'],
  'RTBHOUSE16x16.png': ['RTB House'],
  'RUDDERSTACK16x16.png': ['RudderStack'],
  'SEGMENT16x16.png': ['Segment'],
  'SEZNAMSKLIK16x16.png': ['Sklik'],
  'SIXSENSE16x16.png': ['6Sense'],
  'SNAPCHAT16x16.png': ['Snapchat Pixel'],
  'SOJERN16x16.png': ['Sojern'],
  'SPLITIO16x16.png': ['Split'],
  'SPOTIFYPIXEL16x16.png': ['Spotify Pixel'],
  'TEADS16x16.png': ['Teads'],
  'TEALIUM16x16.png': ['Tealium', 'Tealium EventStream'],
  'THETRADEDESKUNIVERSAL16x16.png': ['The Trade Desk'],
  'TIKTOK16x16.png': ['TikTok Pixel'],
  'TWITTERPIXEL16x16.png': ['X (Twitter) Pixel'],
  'VIBES16x16.png': ['Vibes'],
  'ZEMANTA16x16.png': ['Zemanta'],
};

// SVG fallbacks for providers without PNG files
const SVG_FALLBACKS = {
  'Adobe ECID': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0l8.884 21.248zm6.232 0L24 22.624 15.116 1.376z" fill="#4B21A8"/>
  </svg>`,
  'Indicative': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#4E2AD4"/>
    <path d="M10 4h4v3h-4V4zm0 6h4v10h-4V10z" fill="white"/>
  </svg>`,
  'Webtrends': `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#3CB54A"/>
    <path d="M2 4h3.5L8 12.5 10.5 7 12 4h3l1.5 3.5L16 12.5 18.5 4H22l-5 16h-2l-2-4.5L11 20H9L4 4z" fill="white"/>
  </svg>`,
};

/**
 * Convert a file to base64
 */
function fileToBase64(filePath) {
  const buffer = readFileSync(filePath);
  return buffer.toString('base64');
}

/**
 * Generate SVG wrapper with embedded image
 */
function generateSvgWithImage(base64, providerName) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <image href="data:image/png;base64,${base64}" width="16" height="16" x="4" y="4"/>
  </svg>`;
}

/**
 * Read PNG files and convert to entries
 */
function generatePngEntries() {
  const entries = [];
  const pngFiles = readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));
  
  for (const pngFile of pngFiles) {
    const base64 = fileToBase64(join(ICONS_DIR, pngFile));
    const providers = PNG_TO_PROVIDERS[pngFile];
    
    if (providers) {
      for (const provider of providers) {
        entries.push({
          name: provider,
          svg: generateSvgWithImage(base64, provider)
        });
      }
    } else {
      console.warn(`No mapping found for PNG: ${pngFile}`);
    }
  }
  
  return entries;
}

/**
 * Generate the full TypeScript file content
 */
function generateFileContent(pngEntries) {
  // All providers covered by PNG files
  const pngProviders = new Set(pngEntries.map(e => e.name));
  
  // Collect all unique provider names (from PNG + fallbacks)
  const allProviders = new Set([
    ...pngProviders,
    ...Object.keys(SVG_FALLBACKS)
  ]);
  
  // Sort alphabetically
  const sortedProviders = Array.from(allProviders).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  
  // Build the entries map (provider name -> svg)
  const entriesMap = new Map();
  
  // Add PNG entries
  for (const entry of pngEntries) {
    entriesMap.set(entry.name, entry.svg);
  }
  
  // Add fallback entries
  for (const [name, svg] of Object.entries(SVG_FALLBACKS)) {
    entriesMap.set(name, svg);
  }
  
  // Generate the TypeScript output
  const lines = [
    '// ─── PROVIDER ICONS ───────────────────────────────────────────────────────────',
    '// Brand SVG icons for individual providers.',
    '// Paths sourced from Simple Icons (simpleicons.org) — CC0 license.',
    '// viewBox="0 0 24 24" unless noted otherwise.',
    '// Falls back to group icon (group-icons.ts) if provider not listed here.',
    '',
    'export const PROVIDER_ICONS: Record<string, string> = {',
    '',
  ];
  
  for (const provider of sortedProviders) {
    const svg = entriesMap.get(provider);
    lines.push(`  '${provider}': \`${svg}\`,`);
    lines.push('');
  }
  
  lines.push('};');
  
  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('Generating provider icons...');
  console.log(`Reading PNG files from: ${ICONS_DIR}`);
  
  const pngEntries = generatePngEntries();
  console.log(`Found ${pngEntries.length} PNG entries (some providers share PNGs)`);
  
  // Count unique providers
  const uniqueProviders = new Set(pngEntries.map(e => e.name));
  console.log(`Unique providers with PNG: ${uniqueProviders.size}`);
  console.log(`Providers with SVG fallback: ${Object.keys(SVG_FALLBACKS).length}`);
  
  const content = generateFileContent(pngEntries);
  
  writeFileSync(OUTPUT_FILE, content);
  console.log(`\nGenerated: ${OUTPUT_FILE}`);
  
  // Verify
  const uniqueCount = new Set([
    ...pngEntries.map(e => e.name),
    ...Object.keys(SVG_FALLBACKS)
  ]).size;
  
  console.log(`\nTotal unique provider keys: ${uniqueCount}`);
}

main();
