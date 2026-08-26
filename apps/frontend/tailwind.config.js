/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f766e',
          soft: '#ccfbf1',
          deep: '#115e59',
          ink: '#134e4a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f8fa',
          soft: '#f1f5f9',
          deep: '#1e293b',
          darkest: '#0f172a',
        },
        line: {
          DEFAULT: '#e2e8f0',
          soft: '#eef2f6',
          strong: '#cbd5e1',
          dark: '#334155',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#475569',
          muted: '#64748b',
          faint: '#94a3b8',
        },
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.08)',
        soft: '0 8px 24px -12px rgb(15 23 42 / 0.18)',
      },
    },
  },
  plugins: [],
}
