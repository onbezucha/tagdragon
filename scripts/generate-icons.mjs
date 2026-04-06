/**
 * Generate Chrome extension icons from source image
 * Uses sharp to resize source PNG to various icon sizes
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import fs from 'fs';

// Resolve paths relative to this script location
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'assets', 'logo', 'logo-512.png');
const outputDir = join(root, 'public', 'icons');

// Icon sizes for Chrome extension
const sizes = [16, 32, 48, 96, 128, 192];

const startTime = Date.now();

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  TagDragon Icon Generator');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  console.log(`  Source: ${source}`);
  console.log(`  Output: ${outputDir}\n`);
  console.log('───────────────────────────────────────────────────────────────────────────');
  console.log('  Generated Icons');
  console.log('───────────────────────────────────────────────────────────────────────────');
  console.log('  Filename        Size      File Size');
  console.log('  ─────────────────────────────────────────');

  const results = [];

  for (const size of sizes) {
    const filename = `icon${size}.png`;
    const outputPath = join(outputDir, filename);

    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    results.push({ filename, size, bytes: stats.size });

    console.log(`  ${filename.padEnd(16)} ${String(size).padStart(4)}px    ${formatBytes(stats.size)}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('───────────────────────────────────────────────────────────────────────────');
  console.log(`\n  Total: ${results.length} icons generated in ${elapsed}s\n`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

generateIcons().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n  Error:', err.message);
  console.log('\n═══════════════════════════════════════════════════════════════════════════\n');
  process.exit(1);
});
