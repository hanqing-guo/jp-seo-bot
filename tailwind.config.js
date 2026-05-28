/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#d9e7ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#5a8cff',
          500: '#3563ff',
          600: '#1f44e6',
          700: '#1834b4',
          800: '#172d8e',
          900: '#152a73',
        },
        accent: {
          rose: '#e11d48',
          mint: '#10b981',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Sans"', '"Yu Gothic"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
