/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'system-ui',
          '-apple-system',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // Дизайн-токены на CSS-переменных (переключаются темой)
        base: 'var(--bg)',
        app: 'var(--bg)',
        text: 'var(--text)',
        ink: 'var(--text)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--line)',
        line2: 'var(--line-strong)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
        up: 'var(--up)',
        down: 'var(--down)',
        warn: 'var(--warn)',
      },
      borderRadius: {
        xl2: '20px',
        xl3: '24px',
        sm2: '10px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      spacing: { safe: 'env(safe-area-inset-bottom)' },
    },
  },
  plugins: [],
}
