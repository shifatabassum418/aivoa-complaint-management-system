/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aivoa: {
          purple: '#4F46E5',
          purpleDark: '#4338CA',
          bg: '#F5F5F7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // avoid clobbering MUI base styles
  },
}
