import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Public web tokens, sampled from assets/01–08
        ink: { DEFAULT: '#140404', raised: '#1E0707', foot: '#0E0303' },
        flame: '#E3140F',
        blood: { DEFAULT: '#B00C0C', deep: '#8B0A0A' },
        cream: '#FFE6CF',
        peach: { DEFAULT: '#FFB199', soft: '#F6D5C8', muted: '#6B3A32' },
        // Argon design tokens
        'argon-bg': '#120508',
        'argon-red': '#E3231A',
        'argon-dark-red': '#8B0000',
        'argon-surface': '#1A0A09',
        'argon-salmon': '#FF6B52',
        // Legacy tokens kept for backward compat
        primary: {
          50: 'hsl(249 100% 97%)',
          100: 'hsl(249 100% 93%)',
          200: 'hsl(249 96% 87%)',
          300: 'hsl(249 93% 78%)',
          400: 'hsl(249 89% 68%)',
          500: 'hsl(249 82% 58%)',
          600: 'hsl(249 75% 50%)',
          700: 'hsl(249 72% 42%)',
          800: 'hsl(249 66% 35%)',
          900: 'hsl(249 60% 28%)',
        },
        // Discovery design tokens (Figma)
        surface: {
          DEFAULT: '#09090B', // page
          card: '#121216', // cards, inputs, unselected pills
          elevated: '#1C1C24', // badges on covers
        },
        line: {
          DEFAULT: '#303039', // card borders, dividers
          strong: '#71717B', // input and pill borders
        },
        fg: {
          DEFAULT: '#FAFAFA',
          muted: '#A1A1AB',
        },
        accent: {
          DEFAULT: '#C7B4FF', // links, selected pills, eyebrow text
          soft: '#26193D', // selected pill background
        },
        price: '#FF6800',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        code: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
