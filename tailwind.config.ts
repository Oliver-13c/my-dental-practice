import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}', './app/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0A5C5C',
        secondary: '#48742C',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text_primary: '#1E293B',
        text_secondary: '#475569',
        accent: '#B45309',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        md: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
