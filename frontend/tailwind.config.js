/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#c7e0ff',
          300: '#9cc6ff',
          400: '#68a5ff',
          500: '#3d7dff',
          600: '#2b5fe6',
          700: '#2449b8',
          800: '#233f93',
          900: '#233679',
        },
      },
    },
  },
  plugins: [],
}
