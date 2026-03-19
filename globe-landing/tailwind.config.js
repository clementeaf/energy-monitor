/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: '#1a1f3a',
        accent: '#0066cc',
        'accent-dark': '#0052a3',
        surface: '#f5f7fa',
      },
    },
  },
  plugins: [],
}
