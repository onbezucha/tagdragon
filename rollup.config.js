import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const aliases = alias({
  entries: [{ find: '@', replacement: path.resolve('src') }]
});

const plugins = [aliases, resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json' })];

export default [
  {
    input: 'src/background/index.ts',
    output: { file: 'dist/background.js', format: 'iife', name: 'RequestTrackerBackground', sourcemap: !isProduction },
    plugins,
  },
  {
    input: 'src/devtools/index.ts',
    output: { file: 'dist/devtools.js', format: 'iife', name: 'RequestTrackerDevTools', sourcemap: !isProduction },
    plugins,
  },
  {
    input: 'src/panel/index.ts',
    output: { file: 'dist/panel.js', format: 'iife', name: 'RequestTrackerPanel', sourcemap: !isProduction },
    plugins,
  },
  {
    input: 'src/popup/index.ts',
    output: { file: 'dist/popup.js', format: 'iife', name: 'RequestTrackerPopup', sourcemap: !isProduction },
    plugins,
  },
  {
    input: 'src/content/data-layer-main.ts',
    output: { file: 'dist/data-layer-main.js', format: 'iife' },
    plugins,
  },
  {
    input: 'src/content/data-layer-bridge.ts',
    output: { file: 'dist/data-layer-bridge.js', format: 'iife' },
    plugins,
  },
];
