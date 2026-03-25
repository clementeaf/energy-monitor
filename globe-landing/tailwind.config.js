/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        gp: {
          900: '#1a3a2a',  // darkest — footer, banners
          800: '#234d38',  // dark — headings, nav
          700: '#2d6148',  // primary — buttons, accents
          600: '#357553',  // hover states
          500: '#3d8a5e',  // lighter accent
          400: '#5a9e78',  // tags, labels
          300: '#8fbfa5',  // muted accents
          200: '#c2ddd0',  // borders, light fills
          100: '#e8f3ed',  // surface backgrounds
          50:  '#f4f9f6',  // lightest surface
        },
        'text-main': '#2d3a33',
        'text-body': '#4a5a50',
        'text-muted': '#6b7c72',
      },
      borderRadius: {
        pill: '50px',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(26, 58, 42, 0.08)',
        'card-hover': '0 8px 24px 0 rgba(26, 58, 42, 0.14)',
        soft: '0 4px 12px 0 rgba(26, 58, 42, 0.10)',
      },
    },
  },
  plugins: [],
}
