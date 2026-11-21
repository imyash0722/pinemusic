/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#040608',
          900: '#080a10',
          850: '#0d111a',
          800: '#141924',
          700: '#1e2638',
        },
        pine: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        electric: {
          cyan: '#06b6d4',
          amber: '#f59e0b',
          purple: '#8b5cf6',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
