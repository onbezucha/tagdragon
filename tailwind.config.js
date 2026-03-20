/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./src/**/*.ts",
  ],
  theme: {
    extend: {
      colors: {
        // Background colors (dark mode defaults, light mode via CSS variables)
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        // Text colors
        text: {
          0: 'var(--text-0)',
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        // Accent colors (Dragon Amber)
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          muted: 'var(--accent-muted)',
          glow: 'var(--accent-glow)',
        },
        // Dragon brand colors (from logo)
        dragon: {
          gold: '#FBBF24',
          amber: '#F59E0B',
          orange: '#E8710A',
          ember: '#C2410C',
          red: '#DC2626',
        },
        // Semantic colors (preserved)
        green: 'var(--green)',
        red: 'var(--red)',
        yellow: 'var(--yellow)',
        purple: 'var(--purple)',
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
}
