import type { Config } from 'tailwindcss';

export default {
  content: [
    './public/**/*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#181920',
          1: '#1e2028',
          2: '#252830',
          3: '#2d3039',
          hover: '#2a2d38',
          active: '#1a2540',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          subtle: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.15)',
        },
        text: {
          0: '#e8eaf4',
          1: '#a8adc0',
          2: '#6b7194',
          3: '#4a5078',
        },
        accent: {
          DEFAULT: '#5090ff',
          hover: '#3d78e8',
          muted: 'rgba(80, 144, 255, 0.15)',
        },
        green: '#3ecf8e',
        red: '#ef5350',
        orange: '#ffa726',
        yellow: '#ffee58',
        purple: '#ab47bc',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'monospace'],
        sans: ['IBM Plex Sans', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        lg: '14px',
      },
      lineHeight: {
        tight: '1.5',
        base: '1.6',
        relaxed: '1.7',
      },
      spacing: {
        'sp-1': '4px',
        'sp-2': '8px',
        'sp-3': '12px',
        'sp-4': '16px',
        'sp-5': '20px',
        'sp-6': '24px',
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '6px',
        lg: '8px',
        full: '999px',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
} satisfies Config;
