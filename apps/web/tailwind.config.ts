import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF6600',
          black: '#000000',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,102,0,0.25), transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
