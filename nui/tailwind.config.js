/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sync: {
          deep: 'var(--sync-bg-deep)',
          bg: 'var(--sync-bg)',
          elevated: 'var(--sync-bg-elevated)',
          text: 'var(--sync-text)',
          muted: 'var(--sync-text-muted)',
          subtle: 'var(--sync-text-subtle)',
          accent: 'var(--sync-accent)',
          'accent-hover': 'var(--sync-accent-hover)',
          danger: 'var(--sync-danger)',
        },
      },
      fontFamily: {
        display: ['Manrope', 'Golos Text', 'sans-serif'],
        sans: ['Manrope', 'Golos Text', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'panel-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s var(--sync-ease) both',
        'fade-in': 'fade-in 0.35s var(--sync-ease) both',
        'panel-in': 'panel-in 0.4s var(--sync-ease) both',
      },
    },
  },
  plugins: [],
};
