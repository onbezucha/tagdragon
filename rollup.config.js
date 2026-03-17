import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const isProduction = process.env.NODE_ENV === 'production';

const commonConfig = {
  plugins: [
    resolve(),
    commonjs(),
  ],
  output: {
    format: 'iife',
    sourcemap: !isProduction,
  }
};

export default [
  {
    input: 'background.js',
    output: {
      ...commonConfig.output,
      file: 'dist/background.js',
      name: 'RequestTrackerBackground',
    },
    plugins: commonConfig.plugins,
  },
  {
    input: 'devtools.js',
    output: {
      ...commonConfig.output,
      file: 'dist/devtools.js',
      name: 'RequestTrackerDevTools',
    },
    plugins: commonConfig.plugins,
  },
  {
    input: 'panel.js',
    output: {
      ...commonConfig.output,
      file: 'dist/panel.js',
      name: 'RequestTrackerPanel',
    },
    plugins: commonConfig.plugins,
  },
];
