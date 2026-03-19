#!/usr/bin/env node

/**
 * Generate PNG icons from TagDragon logo SVG
 * Creates 16x16, 48x48, and 128x128 PNG files for Chrome extension
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SVG_SOURCE = path.join(__dirname, '../public/brand/tagdragon-logo.svg');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SIZES = [
  { size: 16, filename: 'icon16.png' },
  { size: 48, filename: 'icon48.png' },
  { size: 128, filename: 'icon128.png' },
];

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function generateIcons() {
  try {
    console.log(`📦 Generating PNG icons from: ${SVG_SOURCE}`);

    for (const { size, filename } of SIZES) {
      const outputPath = path.join(ICONS_DIR, filename);

      await sharp(SVG_SOURCE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png({ quality: 95 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`✓ Created ${filename} (${size}x${size}) - ${stats.size} bytes`);
    }

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
