import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@providers': resolve(__dirname, 'src/providers'),
      '@components': resolve(__dirname, 'src/panel/components'),
    },
  },
  build: {
    outDir: 'dist',
    emptyDirOnBuild: true,
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.ts'),
        devtools: resolve(__dirname, 'src/devtools/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Keep CSS file as panel.css (strip hash for CSS)
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'panel.css';
          }
          // Keep font files with hash
          if (assetInfo.name && assetInfo.name.includes('IBMPlex')) {
            return '[name]-[hash].[ext]';
          }
          return '[name].[ext]';
        },
        format: 'es',
      },
      manualChunks: undefined,
    },
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  publicDir: false,
  plugins: [
    {
      name: 'copy-assets',
      apply: 'build',
      enforce: 'post',
      closeBundle: async () => {
        try {
          // Copy HTML files from public to dist
          execSync('cp public/panel.html dist/panel.html', { stdio: 'inherit' });
          execSync('cp public/devtools.html dist/devtools.html', { stdio: 'inherit' });
          // Copy icons and fonts
          execSync('cp -r public/icons dist/icons', { stdio: 'inherit' });
          execSync('cp -r public/fonts dist/fonts', { stdio: 'inherit' });
          // Clean up duplicate font files in root dist directory (keep only in fonts/)
          execSync('rm -f dist/IBMPlex*.woff2', { stdio: 'inherit' });
        } catch (error) {
          console.error('Failed to copy assets:', error);
        }
      },
    },
  ],
});
