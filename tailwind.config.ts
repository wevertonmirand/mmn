import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfaf0',
          100: '#faf2d9',
          200: '#f4e3ad',
          300: '#ebcd76',
          400: '#e0b44a',
          500: '#D4AF37',
          600: '#b8912b',
          700: '#946f25',
          800: '#7a5a25',
          900: '#684c23',
        },
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #e0b44a 0%, #D4AF37 45%, #b8912b 100%)',
        'gradient-gold-soft': 'linear-gradient(135deg, #faf2d9 0%, #f4e3ad 100%)',
      },
      boxShadow: {
        gold: '0 8px 24px -8px rgba(212, 175, 55, 0.45)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
