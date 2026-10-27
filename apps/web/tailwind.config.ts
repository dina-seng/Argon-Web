import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Argon brand palette
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
        surface: {
          DEFAULT: 'hsl(230 15% 10%)',
          card: 'hsl(230 14% 14%)',
          elevated: 'hsl(230 13% 18%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
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
